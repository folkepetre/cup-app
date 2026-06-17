<script setup>
import { useTournament } from '../composables/useTournament'

const { state, fixtures, groupRes, isPlayed, scheduleKnockout, matchTime, resultWinner, adminMode } = useTournament()
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
        <div class="smatch" :class="{ adminrow: adminMode }" v-for="(m, mi) in fixtures(g)" :key="mi">
          <div class="smatch-time">
            <template v-if="adminMode">
              <input class="meta-time" type="time" v-model="matchTime(g.id + '-' + mi).time">
              <input class="meta-venue" type="text" v-model="matchTime(g.id + '-' + mi).venue" placeholder="Plan…">
            </template>
            <template v-else>
              <span class="t" :class="{ empty: !matchTime(g.id + '-' + mi).time }">{{ matchTime(g.id + '-' + mi).time || '–' }}</span>
              <span class="v" v-if="matchTime(g.id + '-' + mi).venue">{{ matchTime(g.id + '-' + mi).venue }}</span>
            </template>
          </div>
          <div class="home" :class="{ win: resultWinner(groupRes(g.id, mi), m) === m.h }">{{ m.h }}</div>
          <div class="score-pill" :class="{ vs: !isPlayed(groupRes(g.id, mi)) }">
            <template v-if="isPlayed(groupRes(g.id, mi))">{{ groupRes(g.id, mi).hs }} – {{ groupRes(g.id, mi).as }}</template>
            <template v-else>vs</template>
          </div>
          <div class="away" :class="{ win: resultWinner(groupRes(g.id, mi), m) === m.a }">{{ m.a }}</div>
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
