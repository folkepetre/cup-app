<script setup>
import { useTournament } from '../composables/useTournament'

const { state, enabledFixtures, groupRes, isPlayed, scheduleKnockout, matchTime, resultWinner, adminMode, specialList } = useTournament()
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
        <div class="smatch" :class="{ adminrow: adminMode }" v-for="m in enabledFixtures(g)" :key="m.i">
          <div class="smatch-time">
            <template v-if="adminMode">
              <input class="meta-time" type="time" v-model="matchTime(g.id + '-' + m.i).time">
              <input class="meta-venue" type="text" v-model="matchTime(g.id + '-' + m.i).venue" placeholder="Plan…">
            </template>
            <template v-else>
              <span class="t" :class="{ empty: !matchTime(g.id + '-' + m.i).time }">{{ matchTime(g.id + '-' + m.i).time || '–' }}</span>
              <span class="v" v-if="matchTime(g.id + '-' + m.i).venue">{{ matchTime(g.id + '-' + m.i).venue }}</span>
            </template>
          </div>
          <div class="home" :class="{ win: resultWinner(groupRes(g.id, m.i), m) === m.h }">{{ m.h }}</div>
          <div class="score-pill" :class="{ vs: !isPlayed(groupRes(g.id, m.i)) }">
            <template v-if="isPlayed(groupRes(g.id, m.i))">{{ groupRes(g.id, m.i).hs }} – {{ groupRes(g.id, m.i).as }}</template>
            <template v-else>vs</template>
          </div>
          <div class="away" :class="{ win: resultWinner(groupRes(g.id, m.i), m) === m.a }">{{ m.a }}</div>
        </div>
      </div>

      <!-- Specialmatcher (t.ex. övergripande A5–B5) -->
      <div class="sched-group" v-if="specialList.length">
        <h3>Specialmatcher</h3>
        <div class="smatch" :class="{ adminrow: adminMode }" v-for="sp in specialList" :key="sp.i">
          <div class="smatch-time">
            <template v-if="adminMode">
              <input class="meta-time" type="time" v-model="sp.sm.time">
              <input class="meta-venue" type="text" v-model="sp.sm.venue" placeholder="Plan…">
            </template>
            <template v-else>
              <span class="t" :class="{ empty: !sp.sm.time }">{{ sp.sm.time || '–' }}</span>
              <span class="v" v-if="sp.sm.venue">{{ sp.sm.venue }}</span>
            </template>
          </div>
          <div class="home" :class="{ win: sp.winner === sp.home }">{{ sp.home }}</div>
          <div v-if="adminMode" class="sp-entry">
            <input type="number" min="0" v-model.number="sp.res.hs">
            <span class="sep">–</span>
            <input type="number" min="0" v-model.number="sp.res.as">
          </div>
          <div v-else class="score-pill" :class="{ vs: !isPlayed(sp.res) }">
            <template v-if="isPlayed(sp.res)">{{ sp.res.hs }} – {{ sp.res.as }}</template>
            <template v-else>vs</template>
          </div>
          <div class="away" :class="{ win: sp.winner === sp.away }">{{ sp.away }}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:18px" v-if="scheduleKnockout.length">
      <h2>Slutspel</h2>
      <div class="sched-tier" v-for="t in scheduleKnockout" :key="t.id">
        <h3 class="tier-head" v-if="scheduleKnockout.length > 1">{{ t.tier }}</h3>
        <div class="sched-group" v-for="r in t.rounds" :key="r.label">
          <h3>{{ r.label }}</h3>
          <div class="smatch" :class="{ adminrow: adminMode }" v-for="(m, mi) in r.matches" :key="mi">
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
