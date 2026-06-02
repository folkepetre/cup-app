<script setup>
import { useTournament } from '../composables/useTournament'

const { state, resetAll } = useTournament()
</script>

<template>
  <div>
    <p class="section-intro">
      Byt namn på turnering, lag och PIN-kod. Allt sparas automatiskt. Använd Exportera för att ta en backup.
    </p>

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

      <div class="settings-grid" style="margin-top:22px">
        <div v-for="g in state.groups" :key="g.id">
          <h2 style="font-size:18px;margin-bottom:0"><span class="tag">Grupp {{ g.id }}</span></h2>
          <div class="team-edit">
            <input v-for="(t, ti) in g.teams" :key="ti" v-model="g.teams[ti]">
          </div>
        </div>
      </div>
      <p class="hint">Tips: håll lagnamnen korta så ser tabellerna snyggast ut på mobilen.</p>
    </div>

    <div class="card" style="margin-top:18px">
      <h2>Nollställ</h2>
      <p class="hint" style="margin-top:0">
        Rensar alla resultat och återställer lagnamnen. Går inte att ångra — exportera en backup först om du är osäker.
      </p>
      <button class="btn danger" @click="resetAll">Nollställ allt</button>
    </div>
  </div>
</template>
