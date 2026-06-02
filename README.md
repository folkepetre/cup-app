# Fotbollscup ⚽

En enkel turneringssajt för en cup med 16 lag: 4 grupper à 4 lag, autoberäknad
tabell, spelschema och slutspelsträd. Byggd med Vue 3 + Vite. Resultaten sparas
lokalt i webbläsaren.

## Kom igång

Kräver [Node.js](https://nodejs.org) (version 18 eller senare).

```bash
npm install      # installera beroenden (görs en gång)
npm run dev      # starta utvecklingsserver med hot reload
```

Öppna sedan adressen som visas i terminalen (oftast http://localhost:5173).

## Bygg för publicering

```bash
npm run build    # skapar en optimerad version i mappen dist/
npm run preview  # förhandsgranska den byggda versionen lokalt
```

Innehållet i `dist/` kan laddas upp till valfri statisk hosting — Netlify,
Vercel eller GitHub Pages funkar gratis.

> Hostar du på GitHub Pages i en underkatalog? Avkommentera och sätt `base` i
> `vite.config.js` till `/<repo-namn>/`.

## Så funkar det

- **Grupper** – mata in mål per match, tabellen räknas ut automatiskt
  (poäng → målskillnad → gjorda mål). Topp 2 i varje grupp går vidare.
- **Spelschema** – komplett översikt över alla matcher, bra att dela/skriva ut.
- **Slutspel** – kvartsfinalisterna hämtas automatiskt från grupptabellerna.
  Skriv in ett resultat så flyttas vinnaren vidare. Vid oavgjort väljer du
  vinnare på straffar.
- **Inställningar** – byt turneringsnamn och lagnamn.
- **Exportera / Importera** (uppe till höger) – spara och läs in en JSON-backup.

## Projektstruktur

```
src/
  App.vue                     skal: header, navigation, vyväxling
  main.js                     ingång
  style.css                   global stil
  components/
    GroupsView.vue            grupptabeller + resultatinmatning
    ScheduleView.vue          spelschema (läsvy)
    BracketView.vue           slutspelsträd
    SettingsView.vue          inställningar
  composables/
    useTournament.js          ALL logik: state, tabellberäkning,
                              slutspel och lagring
```

## Vill du anpassa?

- **Annat antal grupper/lag:** ändra `defaultState()` i `useTournament.js`.
  Matchordningen `PAIRS` gäller 4 lag per grupp – justera om du ändrar gruppstorlek.
- **Tiebreak-regler:** sorteringen finns i `standings()` i `useTournament.js`.
  Här kan du t.ex. lägga till inbördes möten.
- **Slutspelets seedning:** paren sätts i `qf`-beräkningen i `useTournament.js`.

## Liveuppdatering för alla besökare

I nuläget sparas datan i din egen webbläsare (localStorage) – besökare ser alltså
inte dina inmatade resultat. För att alla ska se samma liveställning behöver datan
ligga centralt. Allt som rör lagring är samlat i `useTournament.js` (`load()` +
`watch()`), så det är den enda filen du behöver röra för att byta till antingen
en incheckad JSON-fil i repot eller en molndatabas som Firebase/Supabase.
