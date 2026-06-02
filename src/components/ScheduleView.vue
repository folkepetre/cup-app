<script setup>
import { useTournament } from '../composables/useTournament'

const { state, fixtures, groupRes, isPlayed, scheduleKnockout, matchTime, adminMode } = useTournament()
</script>

<template>
  <div>
    <p class="section-intro">
      Hela spelschemat på ett ställe. Resultaten uppdateras direkt.
      <template v-if="adminMode"> Klicka på ett matchtid-fält för att redigera.</template>
    </p>

    <div class="card">
      <h2>Gruppspel</h2>
      <div class="sched-group" v-for="g in state.groups" :key="g.id">
        <h3>Grupp {{ g.id }}</h3>
        <div class="srow-wrap" v-for="(m, mi) in fixtures(g)" :key="mi">
          <!-- Tid & plan -->
          <div class="srow-meta" v-if="adminMode || matchTime(g.id + '-' + mi).time || matchTime(g.id + '-' + mi).venue">
            <template v-if="adminMode">
              <input class="meta-time" type="time" v-model="matchTime(g.id + '-' + mi).time" placeholder="--:--">
              <input class="meta-venue" type="text" v-model="matchTime(g.id + '-' + mi).venue" placeholder="Plan…">
            </template>
            <span v-else class="meta-display">
              <span v-if="matchTime(g.id + '-' + mi).time" class="meta-time-text">{{ matchTime(g.id + '-' + mi).time }}</span>
              <span v-if="matchTime(g.id + '-' + mi).time && matchTime(g.id + '-' + mi).venue" class="meta-dot">·</span>
              <span v-if="matchTime(g.id + '-' + mi).venue" class="meta-venue-text">{{ matchTime(g.id + '-' + mi).venue }}</span>
            </span>
          </div>
          <!-- Matchrad -->
          <div class="srow">
            <div class="sh">{{ m.h }}</div>
            <div class="res" :class="{ unplayed: !isPlayed(groupRes(g.id, mi)) }">
              <template v-if="isPlayed(groupRes(g.id, mi))">{{ groupRes(g.id, mi).hs }} – {{ groupRes(g.id, mi).as }}</template>
              <template v-else>vs</template>
            </div>
            <div class="sa">{{ m.a }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:18px">
      <h2>Slutspel</h2>
      <div class="sched-group" v-for="r in scheduleKnockout" :key="r.label">
        <h3>{{ r.label }}</h3>
        <div class="srow-wrap" v-for="(m, mi) in r.matches" :key="mi">
          <!-- Tid & plan -->
          <div class="srow-meta" v-if="adminMode || matchTime(m.timeKey).time || matchTime(m.timeKey).venue">
            <template v-if="adminMode">
              <input class="meta-time" type="time" v-model="matchTime(m.timeKey).time" placeholder="--:--">
              <input class="meta-venue" type="text" v-model="matchTime(m.timeKey).venue" placeholder="Plan…">
            </template>
            <span v-else class="meta-display">
              <span v-if="matchTime(m.timeKey).time" class="meta-time-text">{{ matchTime(m.timeKey).time }}</span>
              <span v-if="matchTime(m.timeKey).time && matchTime(m.timeKey).venue" class="meta-dot">·</span>
              <span v-if="matchTime(m.timeKey).venue" class="meta-venue-text">{{ matchTime(m.timeKey).venue }}</span>
            </span>
          </div>
          <!-- Matchrad -->
          <div class="srow">
            <div class="sh">{{ m.home }}</div>
            <div class="res" :class="{ unplayed: !isPlayed(m.res) }">
              <template v-if="isPlayed(m.res)">{{ m.res.hs }} – {{ m.res.as }}</template>
              <template v-else>vs</template>
            </div>
            <div class="sa">{{ m.away }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
