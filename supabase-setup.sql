-- ============================================================
--  Supabase-setup för cup-appen
--  Kör hela denna fil i Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. Tabell som lagrar hela turneringen i en enda rad (id = 1)
create table if not exists public.tournaments (
  id          bigint primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- 2. Slå på radsäkerhet (RLS)
alter table public.tournaments enable row level security;

-- 3. Policyer: alla får läsa och skriva denna enda rad.
--    (Admin-PIN:en i appen är spärren för redigering. Datan är inte
--     hemlig – håll länken halvprivat om du vill undvika bus.)
drop policy if exists "läs för alla"   on public.tournaments;
drop policy if exists "skriv för alla" on public.tournaments;

create policy "läs för alla"
  on public.tournaments for select
  using (true);

create policy "skriv för alla"
  on public.tournaments for insert
  with check (true);

create policy "uppdatera för alla"
  on public.tournaments for update
  using (true) with check (true);

-- 4. Slå på realtid för tabellen (så deltagarna ser uppdateringar direkt)
alter publication supabase_realtime add table public.tournaments;
