<script setup>
import { useTournament } from '../composables/useTournament'
import KoSeed from './KoSeed.vue'

const { state, qf, sf, finalM, thirdM, champion, adminMode } = useTournament()
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
      <div class="bracket2">
        <!-- Vänster: kvartsfinaler -->
        <div class="bcol">
          <div class="round-title">Kvartsfinal</div>
          <div class="pair to-right">
            <KoSeed :res="state.ko.QF[0]" :match="qf[0]" />
            <KoSeed :res="state.ko.QF[1]" :match="qf[1]" />
          </div>
        </div>

        <!-- Vänster: semifinal -->
        <div class="bcol">
          <div class="round-title">Semifinal</div>
          <div class="single to-right">
            <KoSeed :res="state.ko.SF[0]" :match="sf[0]" />
          </div>
        </div>

        <!-- Mitten: final -->
        <div class="bcol center">
          <div class="round-title">Final</div>
          <div class="single final-seed">
            <KoSeed :res="state.ko.F" :match="finalM" />
          </div>
        </div>

        <!-- Höger: semifinal -->
        <div class="bcol">
          <div class="round-title">Semifinal</div>
          <div class="single to-left">
            <KoSeed :res="state.ko.SF[1]" :match="sf[1]" mirror />
          </div>
        </div>

        <!-- Höger: kvartsfinaler -->
        <div class="bcol">
          <div class="round-title">Kvartsfinal</div>
          <div class="pair to-left">
            <KoSeed :res="state.ko.QF[2]" :match="qf[2]" mirror />
            <KoSeed :res="state.ko.QF[3]" :match="qf[3]" mirror />
          </div>
        </div>
      </div>

      <div class="champion" v-if="champion">
        <div class="lbl">🏆 Cupmästare</div>
        <div class="name">{{ champion }}</div>
      </div>

      <div class="bronze-block">
        <div class="round-title small">Bronsmatch</div>
        <div class="single bronze">
          <KoSeed :res="state.ko.TP" :match="thirdM" />
        </div>
      </div>
    </div>
  </div>
</template>
