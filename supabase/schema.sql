-- ============================================================
-- CACCIA AL TESORO - Schema Supabase
-- Esegui questo file nel SQL Editor di Supabase
-- ============================================================

-- Abilita estensione UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- TABELLE
-- ============================================================

-- Eventi (cacce al tesoro)
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  date date,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed')),
  created_at timestamptz default now()
);

-- Tappe di un evento
create table checkpoints (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  order_index integer not null,
  title text not null,
  clue text not null,                        -- Indizio testuale
  clue_image_url text,                       -- Immagine indizio (opzionale)
  unlock_message text,                       -- Messaggio mostrato allo sblocco
  latitude double precision,                 -- Coordinate GPS del checkpoint
  longitude double precision,
  requires_media boolean not null default false,   -- Upload obbligatorio
  geo_radius_meters integer default 200,     -- Raggio geofencing (0 = disabilitato)
  created_at timestamptz default now()
);

-- Gruppi partecipanti
create table groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  invite_code text not null unique,
  current_checkpoint_index integer not null default 0,
  finished boolean not null default false,
  finished_at timestamptz,
  created_at timestamptz default now()
);

-- Progresso gruppo (log storico tappe completate)
create table group_progress (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  checkpoint_id uuid not null references checkpoints(id) on delete cascade,
  completed_at timestamptz default now(),
  unique(group_id, checkpoint_id)
);

-- Media inviati dai gruppi
create table submissions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  checkpoint_id uuid not null references checkpoints(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  unique(group_id, checkpoint_id)
);

-- Posizioni GPS in tempo reale dei gruppi
create table group_positions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade unique,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  updated_at timestamptz default now()
);

-- ============================================================
-- INDICI
-- ============================================================
create index on checkpoints(event_id, order_index);
create index on groups(invite_code);
create index on groups(event_id);
create index on submissions(status);
create index on submissions(group_id, checkpoint_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table events enable row level security;
alter table checkpoints enable row level security;
alter table groups enable row level security;
alter table group_progress enable row level security;
alter table submissions enable row level security;
alter table group_positions enable row level security;

-- Admin: accesso completo (utenti autenticati via Supabase Auth)
create policy "Admin full access events" on events
  for all using (auth.role() = 'authenticated');

create policy "Admin full access checkpoints" on checkpoints
  for all using (auth.role() = 'authenticated');

create policy "Admin full access groups" on groups
  for all using (auth.role() = 'authenticated');

create policy "Admin full access progress" on group_progress
  for all using (auth.role() = 'authenticated');

create policy "Admin full access submissions" on submissions
  for all using (auth.role() = 'authenticated');

create policy "Admin full access positions" on group_positions
  for all using (auth.role() = 'authenticated');

-- Gruppi (anon): lettura eventi attivi, scrittura propri dati
create policy "Groups read active events" on events
  for select using (status = 'active');

create policy "Groups read checkpoints" on checkpoints
  for select using (true);

create policy "Groups read own group" on groups
  for select using (true);

create policy "Groups update own group" on groups
  for update using (true);

create policy "Groups insert progress" on group_progress
  for insert with check (true);

create policy "Groups read own progress" on group_progress
  for select using (true);

create policy "Groups insert submissions" on submissions
  for insert with check (true);

create policy "Groups read own submissions" on submissions
  for select using (true);

create policy "Groups upsert position" on group_positions
  for all using (true);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table submissions;
alter publication supabase_realtime add table group_positions;
alter publication supabase_realtime add table groups;

-- ============================================================
-- STORAGE BUCKET (esegui separatamente o via dashboard)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('media', 'media', true);
-- create policy "Groups upload media" on storage.objects for insert with check (bucket_id = 'media');
-- create policy "Public read media" on storage.objects for select using (bucket_id = 'media');
