<script setup>
import { ref, computed } from 'vue'
import { useTournament } from '../composables/useTournament'
import KoSeed from './KoSeed.vue'

const { brackets, adminMode, koRoundLabel } = useTournament()

const active = ref(0)
const current = computed(() => brackets.value[Math.min(active.value, brackets.value.length - 1)] || null)
const multi = computed(() => brackets.value.length > 1)

const rounds = computed(() => (current.value ? current.value.rounds : []))
const lastIndex = computed(() => rounds.value.length - 1)
const finalMatch = computed(() => (rounds.value.length ? rounds.value[lastIndex.value][0] : null))

const leftColumns = computed(() => {
  const cols = []
  for (let r = 0; r < lastIndex.value; r++) {
    const round = rounds.value[r]
    const half = Math.ceil(round.length / 2)
    cols.push({ round: r, fromEnd: rounds.value.length - 1 - r, matches: round.slice(0, half) })
  }
  return cols
})
const rightColumns = computed(() => {
  const cols = []
  for (let r = lastIndex.value - 1; r >= 0; r--) {
    const round = rounds.value[r]
    const half = Math.ceil(round.length / 2)
    cols.push({ round: r, fromEnd: rounds.value.length - 1 - r, matches: round.slice(half) })
  }
  return cols
})
</script>

<template>
  <div>
    <p class="section-intro" v-if="adminMode">
      Slutspelsträden fylls i automatiskt utifrån grupptabellerna. Mata in resultat så flyttas
      vinnaren vidare av sig själv. Vid oavgjort: välj vem som gick vidare på straffar.
      Lag med bye går vidare direkt.
    </p>
    <p class="section-intro" v-else>
      Slutspelsträden uppdateras automatiskt när resultaten matas in.
    </p>

    <!-- Flikar när det finns flera slutspel (A/B/C…) -->
    <div class="tier-tabs" v-if="multi">
      <button
        v-for="(b, i) in brackets" :key="b.id"
        :class="{ active: i === active }"
        @click="active = i">
        {{ b.name }}
      </button>
    </div>

    <div class="card" v-if="current">
      <div class="bracket2" v-if="rounds.length">
        <div class="bcol" v-for="col in leftColumns" :key="'L' + col.round">
          <div class="round-title">{{ koRoundLabel(col.fromEnd) }}</div>
          <div class="rcol to-right">
            <KoSeed v-for="(mt, m) in col.matches" :key="m" :res="mt.res" :match="mt" />
          </div>
        </div>

        <div class="bcol center">
          <div class="round-title">Final</div>
          <div class="rcol final-seed">
            <KoSeed v-if="finalMatch" :res="finalMatch.res" :match="finalMatch" />
          </div>
        </div>

        <div class="bcol" v-for="col in rightColumns" :key="'R' + col.round">
          <div class="round-title">{{ koRoundLabel(col.fromEnd) }}</div>
          <div class="rcol to-left">
            <KoSeed v-for="(mt, m) in col.matches" :key="m" :res="mt.res" :match="mt" mirror />
          </div>
        </div>
      </div>
      <p v-else class="hint">Det här slutspelet visas när minst två lag kvalificerat sig.</p>

      <div class="champion" v-if="current.champion">
        <div class="lbl">🏆 {{ multi ? current.name + ' – vinnare' : 'Cupmästare' }}</div>
        <div class="name">{{ current.champion }}</div>
      </div>

      <div class="bronze-block" v-if="current.third">
        <div class="round-title small">Bronsmatch</div>
        <div class="rcol bronze">
          <KoSeed :res="current.third.res" :match="current.third" />
        </div>
      </div>
    </div>

    <div class="card" v-else>
      <p class="hint">Inget slutspel är konfigurerat ännu.</p>
    </div>
  </div>
</template>
