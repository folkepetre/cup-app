import { reactive, computed, watch, ref } from 'vue'

const STORAGE_KEY = 'fotbollscup-v1'

function blank () {
  return { hs: null, as: null, pen: null }
}

function blankTime () {
  return { time: '', venue: '' }
}

function defaultMatchTimes () {
  const t = {}
  for (const id of ['A', 'B', 'C', 'D']) {
    for (let i = 0; i < 6; i++) t[`${id}-${i}`] = blankTime()
  }
  for (const k of ['QF0', 'QF1', 'QF2', 'QF3', 'SF0', 'SF1', 'F', 'TP']) {
    t[k] = blankTime()
  }
  return t
}

export function defaultState () {
  const mkGroup = (id) => ({ id, teams: [1, 2, 3, 4].map((n) => `Lag ${id}${n}`) })
  const groupResults = {}
  for (const id of ['A', 'B', 'C', 'D']) {
    for (let i = 0; i < 6; i++) groupResults[`${id}-${i}`] = blank()
  }
  return {
    name: 'Cupen 2026',
    adminPin: '1234',
    groups: ['A', 'B', 'C', 'D'].map(mkGroup),
    groupResults,
    matchTimes: defaultMatchTimes(),
    ko: {
      QF: [blank(), blank(), blank(), blank()],
      SF: [blank(), blank()],
      F: blank(),
      TP: blank()
    }
  }
}

function migrate (s) {
  const d = defaultState()
  return Object.assign(d, s, {
    groupResults: Object.assign(d.groupResults, s.groupResults || {}),
    matchTimes: Object.assign(d.matchTimes, s.matchTimes || {}),
    ko: Object.assign(d.ko, s.ko || {})
  })
}

function load () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch (e) {}
  return defaultState()
}

const state = reactive(load())

watch(state, () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch (e) {}
}, { deep: true })

// Admin mode — lives only in memory, resets on page reload
const adminMode = ref(false)

const enterAdmin = (pin) => {
  if (pin === state.adminPin) { adminMode.value = true; return true }
  return false
}
const exitAdmin = () => { adminMode.value = false }

// ---- Hjälpfunktioner ----
const groupRes = (gid, i) => state.groupResults[`${gid}-${i}`]
const matchTime = (key) => {
  if (!state.matchTimes[key]) state.matchTimes[key] = blankTime()
  return state.matchTimes[key]
}

const isPlayed = (r) =>
  r && r.hs !== '' && r.as !== '' && r.hs != null && r.as != null &&
  !Number.isNaN(r.hs) && !Number.isNaN(r.as)

const PAIRS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]]
const fixtures = (g) => PAIRS.map(([h, a]) => ({ h: g.teams[h], a: g.teams[a] }))

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
    H.p++; A.p++; H.gf += r.hs; H.ga += r.as; A.gf += r.as; A.ga += r.hs
    if (r.hs > r.as) { H.w++; A.l++; H.pts += 3 } else if (r.as > r.hs) { A.w++; H.l++; A.pts += 3 } else { H.d++; A.d++; H.pts++; A.pts++ }
  })
  return Object.values(stats)
    .map((s) => { s.gd = s.gf - s.ga; return s })
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name, 'sv'))
}

const gById = (id) => state.groups.find((g) => g.id === id)
const rank = (id, pos) => standings(gById(id))[pos]?.name || '—'

const qf = computed(() => {
  const r = (id, p) => rank(id, p)
  return [
    { home: r('A', 0), away: r('B', 1) },
    { home: r('C', 0), away: r('D', 1) },
    { home: r('B', 0), away: r('A', 1) },
    { home: r('D', 0), away: r('C', 1) }
  ].map((p) => ({ ...p, tbd: false }))
})

const koWinner = (res, pair) => resultWinner(res, pair)
const koLoser = (res, pair) => {
  const w = koWinner(res, pair)
  if (!w) return null
  return w === pair.home ? pair.away : pair.home
}

const sf = computed(() => {
  const w0 = koWinner(state.ko.QF[0], qf.value[0])
  const w1 = koWinner(state.ko.QF[1], qf.value[1])
  const w2 = koWinner(state.ko.QF[2], qf.value[2])
  const w3 = koWinner(state.ko.QF[3], qf.value[3])
  return [
    { home: w0 || 'Vinnare KF1', away: w1 || 'Vinnare KF2', tbd: !(w0 && w1) },
    { home: w2 || 'Vinnare KF3', away: w3 || 'Vinnare KF4', tbd: !(w2 && w3) }
  ]
})

const finalM = computed(() => {
  const w0 = koWinner(state.ko.SF[0], sf.value[0])
  const w1 = koWinner(state.ko.SF[1], sf.value[1])
  return { home: w0 || 'Vinnare SF1', away: w1 || 'Vinnare SF2', tbd: !(w0 && w1) }
})

const thirdM = computed(() => {
  const l0 = koLoser(state.ko.SF[0], sf.value[0])
  const l1 = koLoser(state.ko.SF[1], sf.value[1])
  return { home: l0 || 'Förlorare SF1', away: l1 || 'Förlorare SF2', tbd: !(l0 && l1) }
})

const champion = computed(() => koWinner(state.ko.F, finalM.value))

const scheduleKnockout = computed(() => ([
  { label: 'Kvartsfinaler', matches: qf.value.map((m, i) => ({ home: m.home, away: m.away, res: state.ko.QF[i], timeKey: `QF${i}` })) },
  { label: 'Semifinaler', matches: sf.value.map((m, i) => ({ home: m.home, away: m.away, res: state.ko.SF[i], timeKey: `SF${i}` })) },
  { label: 'Bronsmatch', matches: [{ home: thirdM.value.home, away: thirdM.value.away, res: state.ko.TP, timeKey: 'TP' }] },
  { label: 'Final', matches: [{ home: finalM.value.home, away: finalM.value.away, res: state.ko.F, timeKey: 'F' }] }
]))

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
    groupRes, matchTime, isPlayed, fixtures, resultWinner, needsPen, setPen,
    standings,
    qf, sf, finalM, thirdM, champion, scheduleKnockout,
    exportData, importData, resetAll
  }
}
