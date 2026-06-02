<script setup>
import { useTournament } from '../composables/useTournament'

const { state, qf, sf, finalM, thirdM, champion, resultWinner, needsPen, setPen, adminMode } = useTournament()

const scoreRo = (res) => {
  if (res.hs != null && res.as != null) return `${res.hs} – ${res.as}`
  return null
}
</script>

<template>
  <div>
    <p class="section-intro" v-if="adminMode">
      Kvartsfinalisterna fylls i automatiskt utifrån grupptabellerna. Mata in resultat så flyttas
      vinnaren vidare av sig själv. Vid oavgjort: välj vem som gick vidare på straffar.
    </p>
    <p class="section-intro" v-else>
      Slutspelsträdet uppdateras automatiskt när resultaten matas in.
    </p>
    <div class="card">
      <div class="bracket">
        <!-- Kvartsfinaler -->
        <div class="round">
          <div class="round-title">Kvartsfinal</div>
          <div class="ko-match" v-for="(m, i) in qf" :key="'qf' + i">
            <div class="ko-team" :class="{ win: resultWinner(state.ko.QF[i], m) === m.home }">
              <span class="nm" :class="{ tbd: m.tbd }">{{ m.home }}</span>
              <input v-if="adminMode" type="number" min="0" v-model.number="state.ko.QF[i].hs">
              <span v-else class="ko-score-ro">{{ state.ko.QF[i].hs ?? '' }}</span>
            </div>
            <div class="ko-mid"></div>
            <div class="ko-team" :class="{ win: resultWinner(state.ko.QF[i], m) === m.away }">
              <span class="nm" :class="{ tbd: m.tbd }">{{ m.away }}</span>
              <input v-if="adminMode" type="number" min="0" v-model.number="state.ko.QF[i].as">
              <span v-else class="ko-score-ro">{{ state.ko.QF[i].as ?? '' }}</span>
            </div>
            <div class="pen" v-if="adminMode && needsPen(state.ko.QF[i])">
              Straffar:
              <button :class="{ on: state.ko.QF[i].pen === 'home' }" @click="setPen(state.ko.QF[i], 'home')">{{ m.home }}</button>
              <button :class="{ on: state.ko.QF[i].pen === 'away' }" @click="setPen(state.ko.QF[i], 'away')">{{ m.away }}</button>
            </div>
            <div class="pen" v-else-if="!adminMode && needsPen(state.ko.QF[i]) && state.ko.QF[i].pen">
              <span class="pen-label">Straffar: <strong>{{ state.ko.QF[i].pen === 'home' ? m.home : m.away }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Semifinaler -->
        <div class="round">
          <div class="round-title">Semifinal</div>
          <div class="ko-match" v-for="(m, i) in sf" :key="'sf' + i">
            <div class="ko-team" :class="{ win: resultWinner(state.ko.SF[i], m) === m.home }">
              <span class="nm" :class="{ tbd: m.tbd }">{{ m.home }}</span>
              <input v-if="adminMode" type="number" min="0" v-model.number="state.ko.SF[i].hs">
              <span v-else class="ko-score-ro">{{ state.ko.SF[i].hs ?? '' }}</span>
            </div>
            <div class="ko-mid"></div>
            <div class="ko-team" :class="{ win: resultWinner(state.ko.SF[i], m) === m.away }">
              <span class="nm" :class="{ tbd: m.tbd }">{{ m.away }}</span>
              <input v-if="adminMode" type="number" min="0" v-model.number="state.ko.SF[i].as">
              <span v-else class="ko-score-ro">{{ state.ko.SF[i].as ?? '' }}</span>
            </div>
            <div class="pen" v-if="adminMode && needsPen(state.ko.SF[i])">
              Straffar:
              <button :class="{ on: state.ko.SF[i].pen === 'home' }" @click="setPen(state.ko.SF[i], 'home')">{{ m.home }}</button>
              <button :class="{ on: state.ko.SF[i].pen === 'away' }" @click="setPen(state.ko.SF[i], 'away')">{{ m.away }}</button>
            </div>
            <div class="pen" v-else-if="!adminMode && needsPen(state.ko.SF[i]) && state.ko.SF[i].pen">
              <span class="pen-label">Straffar: <strong>{{ state.ko.SF[i].pen === 'home' ? m.home : m.away }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Final + brons -->
        <div class="round">
          <div class="round-title">Final</div>
          <div class="ko-match">
            <div class="ko-team" :class="{ win: resultWinner(state.ko.F, finalM) === finalM.home }">
              <span class="nm" :class="{ tbd: finalM.tbd }">{{ finalM.home }}</span>
              <input v-if="adminMode" type="number" min="0" v-model.number="state.ko.F.hs">
              <span v-else class="ko-score-ro">{{ state.ko.F.hs ?? '' }}</span>
            </div>
            <div class="ko-mid"></div>
            <div class="ko-team" :class="{ win: resultWinner(state.ko.F, finalM) === finalM.away }">
              <span class="nm" :class="{ tbd: finalM.tbd }">{{ finalM.away }}</span>
              <input v-if="adminMode" type="number" min="0" v-model.number="state.ko.F.as">
              <span v-else class="ko-score-ro">{{ state.ko.F.as ?? '' }}</span>
            </div>
            <div class="pen" v-if="adminMode && needsPen(state.ko.F)">
              Straffar:
              <button :class="{ on: state.ko.F.pen === 'home' }" @click="setPen(state.ko.F, 'home')">{{ finalM.home }}</button>
              <button :class="{ on: state.ko.F.pen === 'away' }" @click="setPen(state.ko.F, 'away')">{{ finalM.away }}</button>
            </div>
            <div class="pen" v-else-if="!adminMode && needsPen(state.ko.F) && state.ko.F.pen">
              <span class="pen-label">Straffar: <strong>{{ state.ko.F.pen === 'home' ? finalM.home : finalM.away }}</strong></span>
            </div>
          </div>

          <div class="ko-match" style="margin-top:14px">
            <div class="round-title" style="font-size:11px;margin-bottom:6px">Bronsmatch</div>
            <div class="ko-team" :class="{ win: resultWinner(state.ko.TP, thirdM) === thirdM.home }">
              <span class="nm" :class="{ tbd: thirdM.tbd }">{{ thirdM.home }}</span>
              <input v-if="adminMode" type="number" min="0" v-model.number="state.ko.TP.hs">
              <span v-else class="ko-score-ro">{{ state.ko.TP.hs ?? '' }}</span>
            </div>
            <div class="ko-mid"></div>
            <div class="ko-team" :class="{ win: resultWinner(state.ko.TP, thirdM) === thirdM.away }">
              <span class="nm" :class="{ tbd: thirdM.tbd }">{{ thirdM.away }}</span>
              <input v-if="adminMode" type="number" min="0" v-model.number="state.ko.TP.as">
              <span v-else class="ko-score-ro">{{ state.ko.TP.as ?? '' }}</span>
            </div>
            <div class="pen" v-if="adminMode && needsPen(state.ko.TP)">
              Straffar:
              <button :class="{ on: state.ko.TP.pen === 'home' }" @click="setPen(state.ko.TP, 'home')">{{ thirdM.home }}</button>
              <button :class="{ on: state.ko.TP.pen === 'away' }" @click="setPen(state.ko.TP, 'away')">{{ thirdM.away }}</button>
            </div>
            <div class="pen" v-else-if="!adminMode && needsPen(state.ko.TP) && state.ko.TP.pen">
              <span class="pen-label">Straffar: <strong>{{ state.ko.TP.pen === 'home' ? thirdM.home : thirdM.away }}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div class="champion" v-if="champion">
        <div class="lbl">🏆 Cupmästare</div>
        <div class="name">{{ champion }}</div>
      </div>
    </div>
  </div>
</template>
