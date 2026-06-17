import { reactive, computed, watch, ref, nextTick } from 'vue'
import { supabase, supabaseEnabled, ROW_ID, TABLE } from '../supabase'

const STORAGE_KEY = 'fotbollscup-v1'

function blank () {
  return { hs: null, as: null, pen: null }
}

function blankTime () {
  return { time: '', venue: '' }
}

// ---- Format-hjälpare ----

// Alla par i en grupp med n lag (cirkelmetoden → jämn vilofördelning)
function roundRobin (n) {
  if (n < 2) return []
  let arr = [...Array(n).keys()]
  const odd = n % 2 !== 0
  if (odd) arr.push(-1) // dummy-bye
  const m = arr.length
  const pairs = []
  for (let round = 0; round < m - 1; round++) {
    for (let i = 0; i < m / 2; i++) {
      const a = arr[i]; const b = arr[m - 1 - i]
      if (a !== -1 && b !== -1) pairs.push(a < b ? [a, b] : [b, a])
    }
    arr = [arr[0], arr[m - 1], ...arr.slice(1, m - 1)] // rotera, första fast
  }
  return pairs
}

function nextPow2 (x) { let p = 1; while (p < x) p *= 2; return p }

// Standard seed-ordning för ett träd av storlek n (tvåpotens)
function seedOrder (n) {
  let pls = [1, 2]
  while (pls.length < n) {
    const sum = pls.length * 2 + 1
    const next = []
    for (const p of pls) { next.push(p); next.push(sum - p) }
    pls = next
  }
  return pls
}

function expectedRoundSizes (Q) {
  const sizes = []
  if (Q >= 2) {
    const B = nextPow2(Q)
    for (let r = 0; r < Math.log2(B); r++) sizes.push(B / 2 ** (r + 1))
  }
  return sizes
}

function buildKoStructure (Q) {
  const rounds = expectedRoundSizes(Q).map((sz) => Array.from({ length: sz }, () => blank()))
  return { rounds, third: blank() }
}

// Bygg ett slutspels-objekt per tier (A, B, C…) utifrån banden
function buildAllKo (bands, numGroups) {
  const ko = {}
  bands.forEach((size, i) => {
    ko[groupLetter(i)] = buildKoStructure(size * numGroups)
  })
  return ko
}

// Normalisera band-listan (minst ett band, heltal ≥ 1)
function cleanBands (bands, fallback) {
  if (Array.isArray(bands) && bands.length) return bands.map((n) => Math.max(1, n | 0))
  return [Math.max(1, (fallback || 2) | 0)]
}

function structureMatches (ko, Q) {
  if (!ko || !Array.isArray(ko.rounds)) return false
  const exp = expectedRoundSizes(Q)
  if (ko.rounds.length !== exp.length) return false
  return exp.every((sz, i) => Array.isArray(ko.rounds[i]) && ko.rounds[i].length === sz)
}

const KO_NAMES = ['Final', 'Semifinal', 'Kvartsfinal', 'Åttondelsfinal', 'Sextondelsfinal']
export function koRoundLabel (fromEnd) {
  return KO_NAMES[fromEnd] || `Omgång`
}

function groupLetter (i) { return String.fromCharCode(65 + i) }

function buildGroups (counts, prev = []) {
  return counts.map((c, i) => {
    const id = groupLetter(i)
    const existing = prev.find((g) => g.id === id)
    const teams = Array.from({ length: c }, (_, k) => (existing && existing.teams[k]) || `Lag ${id}${k + 1}`)
    return { id, teams }
  })
}

function defaultGroupResults (groups) {
  const r = {}
  for (const g of groups) {
    const mc = roundRobin(g.teams.length).length
    for (let i = 0; i < mc; i++) r[`${g.id}-${i}`] = blank()
  }
  return r
}

function defaultMatchTimes (groups, bands) {
  const t = {}
  for (const g of groups) {
    const mc = roundRobin(g.teams.length).length
    for (let i = 0; i < mc; i++) t[`${g.id}-${i}`] = blankTime()
  }
  bands.forEach((size, i) => {
    const id = groupLetter(i)
    expectedRoundSizes(size * groups.length).forEach((sz, r) => {
      for (let m = 0; m < sz; m++) t[`${id}-R${r}-${m}`] = blankTime()
    })
    t[`${id}-TP`] = blankTime()
  })
  return t
}

export function defaultState () {
  const groups = buildGroups([4, 4, 4, 4])
  const playoffBands = [2]
  return {
    name: 'DJ Cup 2026',
    adminPin: '1234',
    playoffBands,
    advancePerGroup: playoffBands.reduce((a, b) => a + b, 0),
    groups,
    groupResults: defaultGroupResults(groups),
    matchTimes: defaultMatchTimes(groups, playoffBands),
    ko: buildAllKo(playoffBands, groups.length)
  }
}

function migrate (s) {
  const d = defaultState()
  const groups = Array.isArray(s.groups) && s.groups.length ? s.groups : d.groups
  const bands = cleanBands(s.playoffBands, s.advancePerGroup)
  // Bygg slutspel per tier; återanvänd befintliga resultat där strukturen stämmer
  const ko = {}
  bands.forEach((size, i) => {
    const id = groupLetter(i)
    const Q = size * groups.length
    const existing = s.ko && s.ko[id]
    if (existing && structureMatches(existing, Q)) {
      ko[id] = existing
    } else if (i === 0 && s.ko && Array.isArray(s.ko.rounds) && structureMatches(s.ko, Q)) {
      ko[id] = s.ko // migrera gammalt enkel-slutspel till tier A
    } else {
      ko[id] = buildKoStructure(Q)
    }
    if (!ko[id].third) ko[id].third = blank()
  })
  return {
    name: s.name ?? d.name,
    adminPin: s.adminPin ?? d.adminPin,
    playoffBands: bands,
    advancePerGroup: bands.reduce((a, b) => a + b, 0),
    groups,
    groupResults: Object.assign(defaultGroupResults(groups), s.groupResults || {}),
    matchTimes: Object.assign(defaultMatchTimes(groups, bands), s.matchTimes || {}),
    ko
  }
}

function load () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch (e) {}
  return defaultState()
}

const state = reactive(load())

// Admin mode — lever bara i minnet, nollställs vid omladdning
const adminMode = ref(false)

const enterAdmin = (pin) => {
  if (pin === state.adminPin) { adminMode.value = true; return true }
  return false
}
const exitAdmin = () => { adminMode.value = false }

// ---- Global bekräftelse-/varningsdialog (ersätter native alert/confirm) ----
const dialog = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: 'OK',
  cancelText: 'Avbryt',
  danger: false,
  showCancel: true,
  _resolve: null
})

function openDialog (opts) {
  return new Promise((resolve) => {
    dialog.title = opts.title || ''
    dialog.message = opts.message || ''
    dialog.confirmText = opts.confirmText || 'OK'
    dialog.cancelText = opts.cancelText || 'Avbryt'
    dialog.danger = !!opts.danger
    dialog.showCancel = opts.showCancel !== false
    dialog._resolve = resolve
    dialog.open = true
  })
}
function resolveDialog (val) {
  dialog.open = false
  const r = dialog._resolve
  dialog._resolve = null
  if (r) r(val)
}
const confirmDialog = (opts) => openDialog({ ...opts, showCancel: true })
const alertDialog = (opts) => openDialog({ ...opts, showCancel: false })

// ---- Molnsynk (Supabase) ----
// syncStatus: 'local' (ingen databas), 'connecting', 'synced', 'error'
const syncStatus = ref(supabaseEnabled ? 'connecting' : 'local')
let applyingRemote = false   // sant medan vi skriver in data från molnet (förhindrar eko-loop)
let saveTimer = null

const plainState = () => JSON.parse(JSON.stringify(state))

async function pullFromCloud () {
  if (!supabaseEnabled) return
  try {
    const { data, error } = await supabase
      .from(TABLE).select('data').eq('id', ROW_ID).maybeSingle()
    if (error) { syncStatus.value = 'error'; return }
    if (data && data.data) {
      applyingRemote = true
      Object.assign(state, migrate(data.data))
      await nextTick()
      applyingRemote = false
    }
    syncStatus.value = 'synced'
  } catch (e) { syncStatus.value = 'error' }
}

async function pushToCloud () {
  if (!supabaseEnabled) return
  try {
    const { error } = await supabase.from(TABLE).upsert({
      id: ROW_ID,
      data: plainState(),
      updated_at: new Date().toISOString()
    })
    syncStatus.value = error ? 'error' : 'synced'
  } catch (e) { syncStatus.value = 'error' }
}

function subscribeRealtime () {
  if (!supabaseEnabled) return
  supabase
    .channel('tournament-sync')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `id=eq.${ROW_ID}` },
      async (payload) => {
        const incoming = payload.new && payload.new.data
        if (!incoming) return
        applyingRemote = true
        Object.assign(state, migrate(incoming))
        await nextTick()
        applyingRemote = false
        syncStatus.value = 'synced'
      })
    .subscribe()
}

if (supabaseEnabled) {
  pullFromCloud().then(subscribeRealtime)
}

watch(state, () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch (e) {}
  if (supabaseEnabled && adminMode.value && !applyingRemote) {
    syncStatus.value = 'connecting'
    clearTimeout(saveTimer)
    saveTimer = setTimeout(pushToCloud, 400)
  }
}, { deep: true })

// ---- Hjälpfunktioner ----
const groupRes = (gid, i) => {
  const key = `${gid}-${i}`
  if (!state.groupResults[key]) state.groupResults[key] = blank()
  return state.groupResults[key]
}
const matchTime = (key) => {
  if (!state.matchTimes[key]) state.matchTimes[key] = blankTime()
  return state.matchTimes[key]
}

const isPlayed = (r) =>
  r && r.hs !== '' && r.as !== '' && r.hs != null && r.as != null &&
  !Number.isNaN(r.hs) && !Number.isNaN(r.as)

const fixtures = (g) => roundRobin(g.teams.length).map(([h, a]) => ({ h: g.teams[h], a: g.teams[a] }))

const resultWinner = (res, m) => {
  const home = m.home ?? m.h
  const away = m.away ?? m.a
  if (!isPlayed(res)) return null
  if (res.hs > res.as) return home
  if (res.as > res.hs) return away
  if (res.pen === 'home') return home
  if (res.pen === 'away') return away
  return null
}
const needsPen = (res) => isPlayed(res) && res.hs === res.as
const setPen = (res, side) => { res.pen = side }

const standings = (g) => {
  const stats = {}
  g.teams.forEach((t) => { stats[t] = { name: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 } })
  fixtures(g).forEach((m, i) => {
    const r = groupRes(g.id, i)
    if (!isPlayed(r)) return
    const H = stats[m.h]; const A = stats[m.a]
    if (!H || !A) return
    H.p++; A.p++; H.gf += r.hs; H.ga += r.as; A.gf += r.as; A.ga += r.hs
    if (r.hs > r.as) { H.w++; A.l++; H.pts += 3 } else if (r.as > r.hs) { A.w++; H.l++; A.pts += 3 } else { H.d++; A.d++; H.pts++; A.pts++ }
  })
  return Object.values(stats)
    .map((s) => { s.gd = s.gf - s.ga; return s })
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name, 'sv'))
}

// Slutspels-nivåer (tiers) härledda ur banden: t.ex. [2,2] → A (plats 1-2), B (plats 3-4)
const tiers = computed(() => {
  const bands = (state.playoffBands && state.playoffBands.length) ? state.playoffBands : [state.advancePerGroup || 2]
  const out = []
  let lo = 0
  bands.forEach((size, i) => {
    const id = groupLetter(i)
    out.push({ id, name: `${id}-slutspel`, size, lo, hi: lo + size - 1, count: size * state.groups.length })
    lo += size
  })
  return out
})

const byRank = (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name, 'sv')

// Lag till ett visst slutspel: placeringarna lo..hi i varje grupp, rankade över grupperna
function tierQualifiers (lo, hi) {
  const result = []
  for (let pos = lo; pos <= hi; pos++) {
    const bucket = []
    for (const g of state.groups) {
      const team = standings(g)[pos]
      bucket.push(team ? { ...team } : { name: '—', pts: -1, gd: 0, gf: 0 })
    }
    bucket.sort(byRank)
    for (const t of bucket) result.push(t.name)
  }
  return result
}

// Bygg ett slutspelsträd (ronder) från en lag-lista + sparade resultat
function buildBracketRounds (qs, koTier, tierId) {
  const rounds = []
  const Q = qs.length
  if (Q < 2) return rounds
  const B = nextPow2(Q)
  const order = seedOrder(B)
  const seedTeam = (seedNum) => (seedNum > Q ? null : qs[seedNum - 1])
  const numRounds = Math.log2(B)
  let prevWinners = null
  for (let r = 0; r < numRounds; r++) {
    const matchCount = B / 2 ** (r + 1)
    const round = []
    for (let m = 0; m < matchCount; m++) {
      let home, away
      if (r === 0) {
        home = seedTeam(order[2 * m])
        away = seedTeam(order[2 * m + 1])
      } else {
        home = prevWinners[2 * m]
        away = prevWinners[2 * m + 1]
      }
      const res = (koTier.rounds[r] && koTier.rounds[r][m]) || blank()
      const isBye = r === 0 && (home === null || away === null)
      const winner = isBye ? (home ?? away) : resultWinner(res, { home, away })
      round.push({ home, away, res, isBye, winner, timeKey: `${tierId}-R${r}-${m}` })
    }
    rounds.push(round)
    prevWinners = round.map((x) => x.winner)
  }
  return rounds
}

// Alla slutspel (ett per tier), med träd, mästare och bronsmatch
const brackets = computed(() => tiers.value.map((t) => {
  const qs = tierQualifiers(t.lo, t.hi)
  const koTier = (state.ko && state.ko[t.id]) || { rounds: [], third: blank() }
  const rounds = buildBracketRounds(qs, koTier, t.id)
  const champion = rounds.length ? rounds[rounds.length - 1][0].winner : null
  let third = null
  if (rounds.length >= 2) {
    const semis = rounds[rounds.length - 2]
    if (semis.length === 2) {
      const loser = (mt) => (mt.winner ? (mt.winner === mt.home ? mt.away : mt.home) : null)
      const home = loser(semis[0]); const away = loser(semis[1])
      const res = koTier.third || blank()
      third = { home, away, res, winner: resultWinner(res, { home, away }), isBye: false, timeKey: `${t.id}-TP` }
    }
  }
  return { id: t.id, name: t.name, rounds, champion, third }
}))

// Spelschema för slutspelet, grupperat per tier
const scheduleKnockout = computed(() => brackets.value.map((bt) => {
  const rounds = []
  bt.rounds.forEach((round, r) => {
    const fromEnd = bt.rounds.length - 1 - r
    const base = KO_NAMES[fromEnd]
    const label = base ? (fromEnd === 0 ? base : base + 'er') : `Omgång ${r + 1}`
    const matches = round
      .filter((mt) => !mt.isBye)
      .map((mt) => ({ home: mt.home, away: mt.away, res: mt.res, timeKey: mt.timeKey }))
    if (matches.length) rounds.push({ label, matches })
  })
  if (bt.third && bt.third.home && bt.third.away) {
    rounds.splice(Math.max(rounds.length - 1, 0), 0, {
      label: 'Bronsmatch',
      matches: [{ home: bt.third.home, away: bt.third.away, res: bt.third.res, timeKey: bt.third.timeKey }]
    })
  }
  return { id: bt.id, tier: bt.name, rounds }
}).filter((t) => t.rounds.length))

// ---- Format-ändring (admin) ----
function rebuildStructure () {
  state.groupResults = defaultGroupResults(state.groups)
  state.matchTimes = defaultMatchTimes(state.groups, state.playoffBands)
  state.ko = buildAllKo(state.playoffBands, state.groups.length)
}

// counts: array med antal lag per grupp; bands: array med antal placeringar per slutspel
function applyFormat (counts, bands) {
  state.groups = buildGroups(counts, state.groups)
  state.playoffBands = cleanBands(bands)
  state.advancePerGroup = state.playoffBands.reduce((a, b) => a + b, 0)
  rebuildStructure()
}

const exportData = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${state.name.replace(/\s+/g, '-').toLowerCase() || 'cup'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importData = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      Object.assign(state, migrate(JSON.parse(reader.result)))
    } catch (err) {
      alertDialog({ title: 'Kunde inte läsa filen', message: 'Är det rätt JSON-fil som exporterats från appen?' })
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

const resetAll = async () => {
  const ok = await confirmDialog({
    title: 'Nollställa allt?',
    message: 'Alla resultat rensas och standardformatet (4 grupper × 4 lag) återställs. Detta går inte att ångra.',
    confirmText: 'Nollställ',
    danger: true
  })
  if (ok) Object.assign(state, defaultState())
}

export function useTournament () {
  return {
    state,
    adminMode, enterAdmin, exitAdmin,
    dialog, resolveDialog, confirmDialog, alertDialog,
    syncStatus, supabaseEnabled,
    groupRes, matchTime, isPlayed, fixtures, resultWinner, needsPen, setPen,
    standings, tiers,
    brackets, scheduleKnockout, koRoundLabel,
    applyFormat,
    exportData, importData, resetAll
  }
}
