# Så här får du cupen live på nätet 🚀

Två delar: **Supabase** (delad databas så alla ser samma resultat) och
**Netlify** (publik webbadress deltagarna surfar in på).

---

## Del 1 – Supabase (databasen)

1. Gå till [supabase.com](https://supabase.com) → logga in → **New project**.
   - Välj ett namn (t.ex. `cupen`) och ett lösenord (spara det). Region: Europe.
   - Vänta ~1 min medan projektet skapas.

2. Skapa tabellen: vänstermenyn → **SQL Editor** → **New query** →
   klistra in hela innehållet i `supabase-setup.sql` (ligger i projektet) → **Run**.
   Det ska stå "Success".

3. Hämta dina nycklar: **Settings** (kugghjulet) → **API**. Kopiera:
   - **Project URL** (ser ut som `https://xxxx.supabase.co`)
   - **anon public**-nyckeln (lång textsträng)

➡️ **Skicka dessa två till mig** (eller lägg in dem själv enligt nedan).

### Köra lokalt med molnet (valfritt)
Skapa filen `.env.local` i projektmappen:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=din-anon-key
```
Starta om `npm run dev`. En grön **Live**-prick visas uppe till höger.

---

## Del 2 – Netlify (hostingen)

1. Gå till [netlify.com](https://netlify.com) → logga in med GitHub.
2. **Add new site** → **Import an existing project** → välj GitHub →
   välj repot `folkepetre/cup-app`.
3. Netlify läser `netlify.toml` automatiskt:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **VIKTIGT** – lägg in nycklarna innan deploy:
   **Site settings → Environment variables → Add a variable**:
   - `VITE_SUPABASE_URL` = din Project URL
   - `VITE_SUPABASE_ANON_KEY` = din anon-key
5. **Deploy**. Efter ~1 min får du en adress som `cupen-2026.netlify.app`.
   (Du kan byta namnet under Site settings → Change site name.)

Klart! Dela länken med deltagarna. Du loggar in som admin med PIN (1234,
byt den under **Inställningar**) och alla ser dina resultat live. ✅

---

## Hur det fungerar
- All data ligger i en rad i Supabase. När du (admin) sparar ett resultat
  skrivs det till molnet.
- Deltagarnas sidor lyssnar i realtid och uppdateras automatiskt – de
  behöver inte ladda om.
- Utan nycklar kör appen i **lokalt läge** (bara din egen webbläsare),
  precis som tidigare.

> Obs: vem som helst med länken kan tekniskt sett skriva till databasen
> (PIN:en är en spärr i appen, inte i databasen). För en vänskaplig cup
> räcker det gott – håll bara länken någorlunda privat.
