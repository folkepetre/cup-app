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

function defaultMatchTimes (groups, Q) {
  const t = {}
  for (const g of groups) {
    const mc = roundRobin(g.teams.length).length
    for (let i = 0; i < mc; i++) t[`${g.id}-${i}`] = blankTime()
  }
  expectedRoundSizes(Q).forEach((sz, r) => {
    for (let m = 0; m < sz; m++) t[`R${r}-${m}`] = blankTime()
  })
  t.TP = blankTime()
  return t
}

export function defaultState () {
  const groups = buildGroups([4, 4, 4, 4])
  const advancePerGroup = 2
  const Q = advancePerGroup * groups.length
  return {
    name: 'DJ Cup 2026',
    adminPin: '1234',
    advancePerGroup,
    groups,
    groupResults: defaultGroupResults(groups),
    matchTimes: defaultMatchTimes(groups, Q),
    ko: buildKoStructure(Q)
  }
}

function migrate (s) {
  const d = defaultState()
  const groups = Array.isArray(s.groups) && s.groups.length ? s.groups : d.groups
  const advancePerGroup = s.advancePerGroup || 2
  const Q = advancePerGroup * groups.length
  const out = {
    name: s.name ?? d.name,
    adminPin: s.adminPin ?? d.adminPin,
    advancePerGroup,
    groups,
    groupResults: Object.assign(defaultGroupResults(groups), s.groupResults || {}),
    matchTimes: Object.assign(defaultMatchTimes(groups, Q), s.matchTimes || {}),
    ko: (s.ko && structureMatches(s.ko, Q)) ? s.ko : buildKoStructure(Q)
  }
  if (!out.ko.third) out.ko.third = blank()
  return out
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

// Kvalade lag, rankade över grupperna: placering → pts → gd → gf
const qualifiers = computed(() => {
  const adv = state.advancePerGroup
  const buckets = Array.from({ length: adv }, () => [])
  for (const g of state.groups) {
    const st = standings(g)
    for (let pos = 0; pos < adv; pos++) {
      const team = st[pos]
      buckets[pos].push(team ? { ...team } : { name: '—', pts: -1, gd: 0, gf: 0 })
    }
  }
  const result = []
  for (let pos = 0; pos < adv; pos++) {
    buckets[pos].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name, 'sv'))
    for (const t of buckets[pos]) result.push(t.name)
  }
  return result
})

// Hela slutspelsträdet, beräknat från kvalrankning + inmatade resultat
const bracket = computed(() => {
  const qs = qualifiers.value
  const Q = qs.length
  const rounds = []
  if (Q < 2) return { rounds }
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
      const res = (state.ko.rounds[r] && state.ko.rounds[r][m]) || blank()
      // Bye finns bara i första ronden (tom plats pga trädstorlek). I senare ronder
      // betyder null "ej avgjord ännu" (TBD), inte bye.
      const isBye = r === 0 && (home === null || away === null)
      let winner
      if (isBye) winner = home ?? away
      else winner = resultWinner(res, { home, away })
      round.push({ home, away, res, isBye, winner, timeKey: `R${r}-${m}` })
    }
    rounds.push(round)
    prevWinners = round.map((x) => x.winner)
  }
  return { rounds }
})

const champion = computed(() => {
  const b = bracket.value.rounds
  if (!b.length) return null
  return b[b.length - 1][0].winner
})

const thirdMatch = computed(() => {
  const b = bracket.value.rounds
  if (b.length < 2) return null
  const semis = b[b.length - 2]
  if (semis.length !== 2) return null
  const loser = (mt) => (mt.winner ? (mt.winner === mt.home ? mt.away : mt.home) : null)
  const home = loser(semis[0])
  const away = loser(semis[1])
  const res = state.ko.third
  return { home, away, res, winner: resultWinner(res, { home, away }), isBye: false, timeKey: 'TP' }
})

const scheduleKnockout = computed(() => {
  const b = bracket.value.rounds
  const out = []
  b.forEach((round, r) => {
    const fromEnd = b.length - 1 - r
    const base = KO_NAMES[fromEnd]
    const label = base ? (fromEnd === 0 ? base : base + 'er') : `Omgång ${r + 1}`
    const matches = round
      .filter((mt) => !mt.isBye)
      .map((mt) => ({ home: mt.home, away: mt.away, res: mt.res, timeKey: mt.timeKey }))
    if (matches.length) out.push({ label, matches })
  })
  const tm = thirdMatch.value
  if (tm && tm.home && tm.away) {
    out.splice(Math.max(out.length - 1, 0), 0, {
      label: 'Bronsmatch',
      matches: [{ home: tm.home, away: tm.away, res: state.ko.third, timeKey: 'TP' }]
    })
  }
  return out
})

// ---- Format-ändring (admin) ----
function rebuildStructure () {
  const Q = state.advancePerGroup * state.groups.length
  state.groupResults = defaultGroupResults(state.groups)
  state.matchTimes = defaultMatchTimes(state.groups, Q)
  state.ko = buildKoStructure(Q)
}

// counts: array med antal lag per grupp; advance: antal vidare per grupp
function applyFormat (counts, advance) {
  state.groups = buildGroups(counts, state.groups)
  state.advancePerGroup = Math.max(1, advance | 0)
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
      alert('Kunde inte läsa filen – är det rätt JSON-fil?')
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

const resetAll = () => {
  if (confirm('Nollställa allt? Alla resultat och lagnamn återställs.')) {
    Object.assign(state, defaultState())
  }
}

export function useTournament () {
  return {
    state,
    adminMode, enterAdmin, exitAdmin,
    syncStatus, supabaseEnabled,
    groupRes, matchTime, isPlayed, fixtures, resultWinner, needsPen, setPen,
    standings, qualifiers,
    bracket, champion, thirdMatch, scheduleKnockout, koRoundLabel,
    applyFormat,
    exportData, importData, resetAll
  }
}
