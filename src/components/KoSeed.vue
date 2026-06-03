<script setup>
import { computed } from 'vue'
import { useTournament } from '../composables/useTournament'

const props = defineProps({
  res: { type: Object, required: true },
  match: { type: Object, required: true },
  mirror: { type: Boolean, default: false }
})

const { adminMode, needsPen, setPen } = useTournament()

const homeName = computed(() => props.match.home ?? (props.match.isBye ? 'Bye' : '—'))
const awayName = computed(() => props.match.away ?? (props.match.isBye ? 'Bye' : '—'))
const homeTbd = computed(() => props.match.home == null)
const awayTbd = computed(() => props.match.away == null)
// Poänginmatning bara när båda lagen är kända och det inte är en bye
const editable = computed(() =>
  adminMode.value && !props.match.isBye && props.match.home != null && props.match.away != null)
const winner = computed(() => props.match.winner)
</script>

<template>
  <div class="seed" :class="{ mirror, bye: match.isBye }">
    <div class="ko-team" :class="{ win: winner != null && winner === match.home }">
      <span class="nm" :class="{ tbd: homeTbd }">{{ homeName }}</span>
      <input v-if="editable" type="number" min="0" v-model.number="res.hs">
      <span v-else class="ko-score-ro">{{ match.isBye ? '' : (res.hs ?? '') }}</span>
    </div>
    <div class="ko-mid"></div>
    <div class="ko-team" :class="{ win: winner != null && winner === match.away }">
      <span class="nm" :class="{ tbd: awayTbd }">{{ awayName }}</span>
      <input v-if="editable" type="number" min="0" v-model.number="res.as">
      <span v-else class="ko-score-ro">{{ match.isBye ? '' : (res.as ?? '') }}</span>
    </div>
    <div class="pen" v-if="editable && needsPen(res)">
      Straffar:
      <button :class="{ on: res.pen === 'home' }" @click="setPen(res, 'home')">{{ match.home }}</button>
      <button :class="{ on: res.pen === 'away' }" @click="setPen(res, 'away')">{{ match.away }}</button>
    </div>
    <div class="pen" v-else-if="!adminMode && needsPen(res) && res.pen">
      <span class="pen-label">Straffar: <strong>{{ res.pen === 'home' ? match.home : match.away }}</strong></span>
    </div>
  </div>
</template>
