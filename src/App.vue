<script setup>
import { ref } from 'vue'
import { useTournament } from './composables/useTournament'
import GroupsView from './components/GroupsView.vue'
import ScheduleView from './components/ScheduleView.vue'
import BracketView from './components/BracketView.vue'
import SettingsView from './components/SettingsView.vue'
import logoUrl from './dj-logga.png'

const { state, adminMode, enterAdmin, exitAdmin, exportData, importData } = useTournament()
const view = ref('schedule')
const fileInput = ref(null)

const showPinDialog = ref(false)
const pinInput = ref('')
const pinError = ref(false)

const openPinDialog = () => {
  pinInput.value = ''
  pinError.value = false
  showPinDialog.value = true
}

const submitPin = () => {
  const ok = enterAdmin(pinInput.value)
  if (ok) {
    showPinDialog.value = false
    pinInput.value = ''
    pinError.value = false
  } else {
    pinError.value = true
    pinInput.value = ''
  }
}

const cancelPin = () => {
  showPinDialog.value = false
  pinInput.value = ''
  pinError.value = false
}

const handlePinKey = (e) => {
  if (e.key === 'Enter') submitPin()
  if (e.key === 'Escape') cancelPin()
}
</script>

<template>
  <!-- PIN-dialog overlay -->
  <div v-if="showPinDialog" class="pin-overlay" @click.self="cancelPin">
    <div class="pin-modal">
      <div class="pin-title">Admin-PIN</div>
      <input
        class="pin-input"
        type="password"
        v-model="pinInput"
        @keydown="handlePinKey"
        placeholder="Ange PIN…"
        autofocus
        maxlength="20"
      >
      <div v-if="pinError" class="pin-error">Fel PIN — försök igen</div>
      <div class="pin-actions">
        <button class="btn ghost" @click="cancelPin">Avbryt</button>
        <button class="btn solid" @click="submitPin">Lås upp</button>
      </div>
    </div>
  </div>

  <header class="top">
    <div class="brand">
      <img :src="logoUrl" class="brand-logo" alt="Cuplogotyp">
      <div>
        <div class="kicker">Turneringscentral</div>
        <h1 class="title">
          <template v-if="adminMode">
            <input class="ed" v-model="state.name" :style="{ width: Math.max(state.name.length, 4) + 'ch' }">
          </template>
          <template v-else>{{ state.name }}</template>
        </h1>
      </div>
    </div>
    <div class="tools">
      <template v-if="adminMode">
        <button class="btn ghost" @click="exportData">↧ Exportera</button>
        <button class="btn ghost" @click="fileInput.click()">↥ Importera</button>
        <input ref="fileInput" type="file" accept="application/json" class="filehidden" @change="importData">
      </template>
      <button class="btn admin-btn" :class="{ active: adminMode }" @click="adminMode ? exitAdmin() : openPinDialog()" :title="adminMode ? 'Lås adminläget' : 'Lås upp adminläget'">
        {{ adminMode ? '🔓' : '🔒' }} Admin
      </button>
    </div>
  </header>

  <nav class="tabs">
    <button :class="{ active: view === 'schedule' }" @click="view = 'schedule'">Spelschema</button>
    <button :class="{ active: view === 'groups' }" @click="view = 'groups'">Grupper</button>
    <button :class="{ active: view === 'bracket' }" @click="view = 'bracket'">Slutspel</button>
    <button v-if="adminMode" :class="{ active: view === 'settings' }" @click="view = 'settings'">Inställningar</button>
  </nav>

  <div v-if="adminMode" class="admin-banner">
    Adminläge aktivt — du kan redigera resultat och lagnamn
  </div>

  <GroupsView v-show="view === 'groups'" />
  <ScheduleView v-show="view === 'schedule'" />
  <BracketView v-show="view === 'bracket'" />
  <SettingsView v-if="adminMode" v-show="view === 'settings'" />

  <footer></footer>
</template>
