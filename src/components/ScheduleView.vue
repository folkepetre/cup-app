<script setup>
import { useTournament } from '../composables/useTournament'

const { state, enabledFixtures, groupRes, isPlayed, scheduleKnockout, matchTime, resultWinner, adminMode, specialList } = useTournament()

// Sortera en lista efter starttid (matcher utan tid hamnar sist, annars stabil ordning)
const byTime = (arr, getTime) => arr
  .map((item, i) => ({ item, i }))
  .sort((a, b) => {
    const ta = getTime(a.item) || '99:99'
    const tb = getTime(b.item) || '99:99'
    return ta.localeCompare(tb) || a.i - b.i
  })
  .map((x) => x.item)

const roundByTime = (matches) => byTime(matches, (m) => matchTime(m.timeKey).time)

// Gruppens schema = ordinarie matcher + specialmatcher som berör gruppen, sorterat på tid
const groupItems = (g) => {
  const fix = enabledFixtures(g).map((m) => ({ kind: 'g', key: 'g' + m.i, time: matchTime(g.id + '-' + m.i).time, m }))
  const sp = specialList.value
    .filter((s) => s.sm.hg === g.id || s.sm.ag === g.id)
    .map((s) => ({ kind: 's', key: 's' + s.i, time: s.sm.time, sp: s }))
  return byTime([...fix, ...sp], (it) => it.time)
}
</script>

<template>
  <div>
    <p class="section-intro">
      Hela spelschemat på ett ställe. Resultaten uppdateras direkt.
      <template v-if="adminMode"> Fyll i tid och plan i fälten till vänster om varje match.</template>
    </p>

    <div class="card">
      <h2>Gruppspel</h2>
      <div class="sched-group" v-for="g in state.groups" :key="g.id">
        <h3>Grupp {{ g.id }}</h3>
        <template v-for="it in groupItems(g)" :key="it.key">
          <!-- Ordinarie gruppmatch -->
          <div v-if="it.kind === 'g'" class="smatch" :class="{ adminrow: adminMode }">
            <div class="smatch-time">
              <template v-if="adminMode">
                <input class="meta-time" type="time" v-model="matchTime(g.id + '-' + it.m.i).time">
                <input class="meta-venue" type="text" v-model="matchTime(g.id + '-' + it.m.i).venue" placeholder="Plan…">
              </template>
              <template v-else>
                <span class="t" :class="{ empty: !matchTime(g.id + '-' + it.m.i).time }">{{ matchTime(g.id + '-' + it.m.i).time || '–' }}</span>
                <span class="v" v-if="matchTime(g.id + '-' + it.m.i).venue">{{ matchTime(g.id + '-' + it.m.i).venue }}</span>
              </template>
            </div>
            <div class="home" :class="{ win: resultWinner(groupRes(g.id, it.m.i), it.m) === it.m.h }">{{ it.m.h }}</div>
            <div class="score-pill" :class="{ vs: !isPlayed(groupRes(g.id, it.m.i)) }">
              <template v-if="isPlayed(groupRes(g.id, it.m.i))">{{ groupRes(g.id, it.m.i).hs }} – {{ groupRes(g.id, it.m.i).as }}</template>
              <template v-else>vs</template>
            </div>
            <div class="away" :class="{ win: resultWinner(groupRes(g.id, it.m.i), it.m) === it.m.a }">{{ it.m.a }}</div>
          </div>

          <!-- Specialmatch (berör denna grupp) -->
          <div v-else class="smatch special-match" :class="{ adminrow: adminMode }">
            <div class="smatch-time">
              <template v-if="adminMode">
                <input class="meta-time" type="time" v-model="it.sp.sm.time">
                <input class="meta-venue" type="text" v-model="it.sp.sm.venue" placeholder="Plan…">
              </template>
              <template v-else>
                <span class="t" :class="{ empty: !it.sp.sm.time }">{{ it.sp.sm.time || '–' }}</span>
                <span class="v" v-if="it.sp.sm.venue">{{ it.sp.sm.venue }}</span>
              </template>
            </div>
            <div class="home" :class="{ win: it.sp.winner === it.sp.home }">{{ it.sp.home }}</div>
            <div v-if="adminMode" class="sp-entry">
              <input type="number" min="0" v-model.number="it.sp.res.hs">
              <span class="sep">–</span>
              <input type="number" min="0" v-model.number="it.sp.res.as">
            </div>
            <div v-else class="score-pill" :class="{ vs: !isPlayed(it.sp.res) }">
              <template v-if="isPlayed(it.sp.res)">{{ it.sp.res.hs }} – {{ it.sp.res.as }}</template>
              <template v-else>vs</template>
            </div>
            <div class="away" :class="{ win: it.sp.winner === it.sp.away }">{{ it.sp.away }}</div>
          </div>
        </template>
      </div>
    </div>

    <div class="card" style="margin-top:18px" v-if="scheduleKnockout.length">
      <h2>Slutspel</h2>
      <div class="sched-tier" v-for="t in scheduleKnockout" :key="t.id">
        <h3 class="tier-head" v-if="scheduleKnockout.length > 1">{{ t.tier }}</h3>
        <div class="sched-group" v-for="r in t.rounds" :key="r.label">
          <h3>{{ r.label }}</h3>
          <div class="smatch" :class="{ adminrow: adminMode }" v-for="(m, mi) in roundByTime(r.matches)" :key="mi">
            <div class="smatch-time">
            <template v-if="adminMode">
              <input class="meta-time" type="time" v-model="matchTime(m.timeKey).time">
              <input class="meta-venue" type="text" v-model="matchTime(m.timeKey).venue" placeholder="Plan…">
            </template>
            <template v-else>
              <span class="t" :class="{ empty: !matchTime(m.timeKey).time }">{{ matchTime(m.timeKey).time || '–' }}</span>
              <span class="v" v-if="matchTime(m.timeKey).venue">{{ matchTime(m.timeKey).venue }}</span>
            </template>
          </div>
          <div class="home" :class="{ win: resultWinner(m.res, m) === m.home }">{{ m.home }}</div>
          <div class="score-pill" :class="{ vs: !isPlayed(m.res) }">
            <template v-if="isPlayed(m.res)">{{ m.res.hs }} – {{ m.res.as }}</template>
            <template v-else>vs</template>
          </div>
          <div class="away" :class="{ win: resultWinner(m.res, m) === m.away }">{{ m.away }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
