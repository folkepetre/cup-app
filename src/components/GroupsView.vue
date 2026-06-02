<script setup>
import { useTournament } from '../composables/useTournament'

const { state, standings, fixtures, groupRes, resultWinner, adminMode } = useTournament()
</script>

<template>
  <div>
    <p class="section-intro" v-if="adminMode">
      Mata in målen för varje match nedan. Tabellen räknas ut automatiskt — poäng, målskillnad
      och placering uppdateras direkt. De två översta i varje grupp går vidare till slutspelet.
    </p>
    <p class="section-intro" v-else>
      Grupptabellerna uppdateras i realtid. De två översta i varje grupp (markerade) går vidare till slutspelet.
    </p>
    <div class="grid cols2">
      <div class="card" v-for="g in state.groups" :key="g.id">
        <h2><span class="tag">Grupp {{ g.id }}</span></h2>
        <table class="standings">
          <thead>
            <tr>
              <th></th><th class="tn">Lag</th>
              <th title="Spelade">S</th><th title="Vunna">V</th><th title="Oavgjorda">O</th>
              <th title="Förlorade">F</th><th title="Mål">Mål</th><th title="Målskillnad">+/-</th><th>P</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in standings(g)" :key="row.name" :class="{ qual: i < 2 }">
              <td class="pos">{{ i + 1 }}</td>
              <td class="tn team-name">{{ row.name }}</td>
              <td>{{ row.p }}</td><td>{{ row.w }}</td><td>{{ row.d }}</td><td>{{ row.l }}</td>
              <td>{{ row.gf }}-{{ row.ga }}</td>
              <td>{{ row.gd > 0 ? '+' : '' }}{{ row.gd }}</td>
              <td class="pts">{{ row.pts }}</td>
            </tr>
          </tbody>
        </table>
        <div class="qual-note"><span class="dot"></span> Topp 2 går till slutspel</div>

        <div class="matches">
          <div class="match" v-for="(m, mi) in fixtures(g)" :key="mi">
            <div class="home">
              <span class="mteam" :class="{ winner: resultWinner(groupRes(g.id, mi), m) === m.h }">{{ m.h }}</span>
            </div>
            <div class="score">
              <template v-if="adminMode">
                <input type="number" min="0" v-model.number="groupRes(g.id, mi).hs">
                <span class="sep">–</span>
                <input type="number" min="0" v-model.number="groupRes(g.id, mi).as">
              </template>
              <template v-else>
                <span class="score-ro">
                  <template v-if="groupRes(g.id, mi).hs != null && groupRes(g.id, mi).as != null">
                    {{ groupRes(g.id, mi).hs }} – {{ groupRes(g.id, mi).as }}
                  </template>
                  <template v-else><span class="sep muted">vs</span></template>
                </span>
              </template>
            </div>
            <div class="away">
              <span class="mteam" :class="{ winner: resultWinner(groupRes(g.id, mi), m) === m.a }">{{ m.a }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
