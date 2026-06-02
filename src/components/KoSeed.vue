<script setup>
import { useTournament } from '../composables/useTournament'

defineProps({
  res: { type: Object, required: true },
  match: { type: Object, required: true },
  mirror: { type: Boolean, default: false }
})

const { adminMode, resultWinner, needsPen, setPen } = useTournament()
</script>

<template>
  <div class="seed" :class="{ mirror }">
    <div class="ko-team" :class="{ win: resultWinner(res, match) === match.home }">
      <span class="nm" :class="{ tbd: match.tbd }">{{ match.home }}</span>
      <input v-if="adminMode" type="number" min="0" v-model.number="res.hs">
      <span v-else class="ko-score-ro">{{ res.hs ?? '' }}</span>
    </div>
    <div class="ko-mid"></div>
    <div class="ko-team" :class="{ win: resultWinner(res, match) === match.away }">
      <span class="nm" :class="{ tbd: match.tbd }">{{ match.away }}</span>
      <input v-if="adminMode" type="number" min="0" v-model.number="res.as">
      <span v-else class="ko-score-ro">{{ res.as ?? '' }}</span>
    </div>
    <div class="pen" v-if="adminMode && needsPen(res)">
      Straffar:
      <button :class="{ on: res.pen === 'home' }" @click="setPen(res, 'home')">{{ match.home }}</button>
      <button :class="{ on: res.pen === 'away' }" @click="setPen(res, 'away')">{{ match.away }}</button>
    </div>
    <div class="pen" v-else-if="!adminMode && needsPen(res) && res.pen">
      <span class="pen-label">Straffar: <strong>{{ res.pen === 'home' ? match.home : match.away }}</strong></span>
    </div>
  </div>
</template>
