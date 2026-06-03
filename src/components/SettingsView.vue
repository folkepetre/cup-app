<script setup>
import { ref, computed } from 'vue'
import { useTournament } from '../composables/useTournament'

const { state, applyFormat, resetAll } = useTournament()

// Format-utkast (tillämpas först när man trycker "Bygg om format")
const draftCounts = ref(state.groups.map((g) => g.teams.length))
const draftAdvance = ref(state.advancePerGroup)

const groupLetter = (i) => String.fromCharCode(65 + i)

const totalTeams = computed(() => draftCounts.value.reduce((a, b) => a + b, 0))
const Q = computed(() => draftAdvance.value * draftCounts.value.length)
const bracketSize = computed(() => {
  if (Q.value < 2) return 0
  let p = 1; while (p < Q.value) p *= 2; return p
})
const byes = computed(() => (bracketSize.value ? bracketSize.value - Q.value : 0))

const warnings = computed(() => {
  const w = []
  if (draftCounts.value.length === 0) w.push('Lägg till minst en grupp.')
  if (draftCounts.value.some((c) => c < draftAdvance.value)) {
    w.push('Någon grupp har färre lag än antalet som ska gå vidare.')
  }
  if (Q.value < 2) w.push('Minst 2 lag måste gå vidare för att ett slutspel ska kunna spelas.')
  return w
})

const dirty = computed(() =>
  JSON.stringify(draftCounts.value) !== JSON.stringify(state.groups.map((g) => g.teams.length)) ||
  draftAdvance.value !== state.advancePerGroup)

const addGroup = () => { if (draftCounts.value.length < 26) draftCounts.value.push(4) }
const removeGroup = (i) => { draftCounts.value.splice(i, 1) }
const incTeam = (i) => { draftCounts.value[i]++ }
const decTeam = (i) => { if (draftCounts.value[i] > 1) draftCounts.value[i]-- }
const incAdv = () => { draftAdvance.value++ }
const decAdv = () => { if (draftAdvance.value > 1) draftAdvance.value-- }
const resetDraft = () => {
  draftCounts.value = state.groups.map((g) => g.teams.length)
  draftAdvance.value = state.advancePerGroup
}

const buildFormat = () => {
  if (warnings.value.length) { alert('Rätta till först:\n\n• ' + warnings.value.join('\n• ')); return }
  if (confirm('Bygga om formatet? Alla resultat nollställs, och lagnamn återställs i grupper som ändrar storlek.')) {
    applyFormat([...draftCounts.value], draftAdvance.value)
  }
}
</script>

<template>
  <div>
    <p class="section-intro">
      Byt namn på turnering, lag och PIN-kod. Här bygger du också upp cupens format. Allt sparas automatiskt.
    </p>

    <!-- Grunduppgifter -->
    <div class="card">
      <div class="settings-row">
        <div class="field" style="max-width:340px">
          <label>Turneringens namn</label>
          <input v-model="state.name">
        </div>
        <div class="field" style="max-width:180px">
          <label>Admin-PIN</label>
          <input v-model="state.adminPin" type="text" maxlength="12" autocomplete="off">
        </div>
      </div>
    </div>

    <!-- Format -->
    <div class="card" style="margin-top:18px">
      <h2>Cupformat</h2>
      <p class="hint" style="margin-top:0">
        Ställ in antal grupper, lag per grupp (får vara olika stora) och hur många som går vidare per grupp.
        Slutspelsträdet byggs automatiskt – udda antal hanteras med bye.
      </p>

      <div class="fmt-advance">
        <label>Antal som går vidare per grupp</label>
        <div class="stepper">
          <button class="btn ghost" @click="decAdv">−</button>
          <span class="stepper-val">{{ draftAdvance }}</span>
          <button class="btn ghost" @click="incAdv">+</button>
        </div>
      </div>

      <div class="fmt-groups">
        <div class="fmt-group" v-for="(c, i) in draftCounts" :key="i">
          <div class="fmt-group-head">
            <span class="tag">Grupp {{ groupLetter(i) }}</span>
            <button class="x" title="Ta bort grupp" @click="removeGroup(i)">✕</button>
          </div>
          <div class="stepper">
            <button class="btn ghost" @click="decTeam(i)">−</button>
            <span class="stepper-val">{{ c }}</span>
            <button class="btn ghost" @click="incTeam(i)">+</button>
          </div>
          <div class="fmt-group-sub">lag</div>
        </div>

        <button class="fmt-add" @click="addGroup">+ Lägg till grupp</button>
      </div>

      <div class="fmt-summary">
        <span><strong>{{ totalTeams }}</strong> lag totalt</span>
        <span class="arrow">→</span>
        <span><strong>{{ Q }}</strong> till slutspel</span>
        <template v-if="bracketSize">
          <span class="arrow">→</span>
          <span><strong>{{ bracketSize }}</strong>-lagsträd<template v-if="byes"> ({{ byes }} bye)</template></span>
        </template>
      </div>

      <div class="fmt-warn" v-for="(w, wi) in warnings" :key="wi">⚠️ {{ w }}</div>

      <div class="fmt-actions">
        <button class="btn solid" :disabled="!dirty || warnings.length" @click="buildFormat">Bygg om format</button>
        <button class="btn ghost" v-if="dirty" @click="resetDraft">Ångra ändringar</button>
        <span class="hint" v-if="dirty">Ändringar tillämpas först när du bygger om (nollställer resultat).</span>
      </div>
    </div>

    <!-- Lagnamn -->
    <div class="card" style="margin-top:18px">
      <h2>Lagnamn</h2>
      <p class="hint" style="margin-top:0">Tips: håll lagnamnen korta så ser tabellerna snyggast ut på mobilen.</p>
      <div class="settings-grid" style="margin-top:14px">
        <div v-for="g in state.groups" :key="g.id">
          <h2 style="font-size:18px;margin-bottom:0"><span class="tag">Grupp {{ g.id }}</span></h2>
          <div class="team-edit">
            <input v-for="(t, ti) in g.teams" :key="ti" v-model="g.teams[ti]">
          </div>
        </div>
      </div>
    </div>

    <!-- Nollställ -->
    <div class="card" style="margin-top:18px">
      <h2>Nollställ</h2>
      <p class="hint" style="margin-top:0">
        Rensar alla resultat och återställer standardformatet (4 grupper × 4 lag). Går inte att ångra –
        exportera en backup först om du är osäker.
      </p>
      <button class="btn danger" @click="resetAll">Nollställ allt</button>
    </div>
  </div>
</template>
