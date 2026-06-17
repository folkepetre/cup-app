<script setup>
import { ref, computed } from 'vue'
import { useTournament } from '../composables/useTournament'

const { state, applyFormat, resetAll, confirmDialog, alertDialog } = useTournament()

// Format-utkast (tillämpas först när man trycker "Bygg om format")
const draftCounts = ref(state.groups.map((g) => g.teams.length))
const draftBands = ref([...(state.playoffBands && state.playoffBands.length ? state.playoffBands : [state.advancePerGroup || 2])])

const groupLetter = (i) => String.fromCharCode(65 + i)
const pow2 = (n) => { if (n < 2) return 0; let p = 1; while (p < n) p *= 2; return p }

const totalTeams = computed(() => draftCounts.value.reduce((a, b) => a + b, 0))
const numGroups = computed(() => draftCounts.value.length)
const advanceTotal = computed(() => draftBands.value.reduce((a, b) => a + b, 0))
const minGroupSize = computed(() => (draftCounts.value.length ? Math.min(...draftCounts.value) : 0))

// Info per slutspel: vilka placeringar, antal lag, trädstorlek, byes
const tierInfo = computed(() => {
  let lo = 0
  return draftBands.value.map((size, i) => {
    const count = size * numGroups.value
    const B = pow2(count)
    const info = { id: groupLetter(i), name: `${groupLetter(i)}-slutspel`, size, lo: lo + 1, hi: lo + size, count, byes: B ? B - count : 0, B }
    lo += size
    return info
  })
})

const warnings = computed(() => {
  const w = []
  if (draftCounts.value.length === 0) w.push('Lägg till minst en grupp.')
  if (draftBands.value.length === 0) w.push('Lägg till minst ett slutspel.')
  if (advanceTotal.value > minGroupSize.value) {
    w.push('Slutspelen kräver fler placeringar än vad någon grupp har lag. Minska antal placeringar eller lägg till lag.')
  }
  if (tierInfo.value.some((t) => t.count < 2)) w.push('Varje slutspel behöver minst 2 lag.')
  return w
})

const dirty = computed(() =>
  JSON.stringify(draftCounts.value) !== JSON.stringify(state.groups.map((g) => g.teams.length)) ||
  JSON.stringify(draftBands.value) !== JSON.stringify(state.playoffBands && state.playoffBands.length ? state.playoffBands : [state.advancePerGroup || 2]))

const addGroup = () => { if (draftCounts.value.length < 26) draftCounts.value.push(4) }
const removeGroup = (i) => { draftCounts.value.splice(i, 1) }
const incTeam = (i) => { draftCounts.value[i]++ }
const decTeam = (i) => { if (draftCounts.value[i] > 1) draftCounts.value[i]-- }

const addTier = () => { if (draftBands.value.length < 8) draftBands.value.push(1) }
const removeTier = (i) => { if (draftBands.value.length > 1) draftBands.value.splice(i, 1) }
const incBand = (i) => { draftBands.value[i]++ }
const decBand = (i) => { if (draftBands.value[i] > 1) draftBands.value[i]-- }

const resetDraft = () => {
  draftCounts.value = state.groups.map((g) => g.teams.length)
  draftBands.value = [...(state.playoffBands && state.playoffBands.length ? state.playoffBands : [state.advancePerGroup || 2])]
}

const buildFormat = async () => {
  if (warnings.value.length) {
    await alertDialog({ title: 'Rätta till först', message: warnings.value.join(' ') })
    return
  }
  const ok = await confirmDialog({
    title: 'Bygga om formatet?',
    message: 'Alla resultat nollställs, och lagnamn återställs i grupper som ändrar storlek.',
    confirmText: 'Bygg om',
    danger: true
  })
  if (ok) applyFormat([...draftCounts.value], [...draftBands.value])
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
        Ställ in grupper (får vara olika stora) och ett eller flera slutspel. Varje slutspel tar ett
        antal placeringar per grupp – t.ex. A = plats 1–2, B = plats 3–4. Träden byggs automatiskt och
        udda antal hanteras med bye.
      </p>

      <label class="fmt-label">Grupper &amp; lag</label>
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

      <label class="fmt-label" style="margin-top:18px">Slutspel (placeringar per grupp)</label>
      <div class="fmt-groups">
        <div class="fmt-group" v-for="(t, i) in tierInfo" :key="i">
          <div class="fmt-group-head">
            <span class="tag">{{ t.name }}</span>
            <button class="x" v-if="draftBands.length > 1" title="Ta bort slutspel" @click="removeTier(i)">✕</button>
          </div>
          <div class="stepper">
            <button class="btn ghost" @click="decBand(i)">−</button>
            <span class="stepper-val">{{ t.size }}</span>
            <button class="btn ghost" @click="incBand(i)">+</button>
          </div>
          <div class="fmt-group-sub">plats {{ t.lo }}<template v-if="t.hi > t.lo">–{{ t.hi }}</template></div>
          <div class="fmt-tier-meta">{{ t.count }} lag<template v-if="t.byes"> · {{ t.byes }} bye</template></div>
        </div>
        <button class="fmt-add" v-if="draftBands.length < 8" @click="addTier">+ Lägg till slutspel</button>
      </div>

      <div class="fmt-summary">
        <span><strong>{{ totalTeams }}</strong> lag totalt</span>
        <span class="arrow">→</span>
        <span><strong>{{ advanceTotal }}</strong> av {{ minGroupSize }} per grupp vidare</span>
        <span class="arrow">→</span>
        <span><strong>{{ draftBands.length }}</strong> slutspel</span>
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
