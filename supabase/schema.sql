-- Datenbank-Einrichtung für den geräteübergreifenden Sync (iPhone <-> Mac ...).
-- Einmalig ausführen: Supabase-Dashboard -> SQL Editor -> einfügen -> "Run".
--
-- Danach speichert die App deinen kompletten Zustand in der Tabelle
-- app_state und synchronisiert ihn live zwischen allen angemeldeten
-- Geräten desselben Accounts.

-- 1) Tabelle für den App-Zustand (ein Eintrag pro Nutzer und Schlüssel).
create table if not exists public.app_state (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null,
  value      jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- 2) Row Level Security: jeder Nutzer sieht und ändert nur seine eigenen Daten.
alter table public.app_state enable row level security;

drop policy if exists "Eigene Zeilen lesen"   on public.app_state;
drop policy if exists "Eigene Zeilen anlegen"  on public.app_state;
drop policy if exists "Eigene Zeilen aendern"  on public.app_state;
drop policy if exists "Eigene Zeilen loeschen" on public.app_state;

create policy "Eigene Zeilen lesen"
  on public.app_state for select
  using (auth.uid() = user_id);

create policy "Eigene Zeilen anlegen"
  on public.app_state for insert
  with check (auth.uid() = user_id);

create policy "Eigene Zeilen aendern"
  on public.app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Eigene Zeilen loeschen"
  on public.app_state for delete
  using (auth.uid() = user_id);

-- 3) Realtime aktivieren, damit Aenderungen sofort auf den anderen
--    Geraeten ankommen. Fehler "already member" ist harmlos -> ignorieren.
alter publication supabase_realtime add table public.app_state;
