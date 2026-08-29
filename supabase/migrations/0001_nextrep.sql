-- NextRep schema.
--
-- Covers the authored side of the product: games, their hosted video assets,
-- reps and answer choices, plus training sessions, player responses, and the
-- webhook event log used for idempotent delivery.
--
-- The seeded demo does not need any of this: it ships as code and runs from a
-- cookie. This is what real uploaded film requires.
--
-- Everything lives in a dedicated `nextrep` schema rather than `public`, so it
-- cannot collide with anything else in the same project. After applying, add
-- `nextrep` to Settings -> API -> Exposed schemas, or PostgREST will not serve
-- these tables.
--
-- Apply with `supabase db push`, or paste into the SQL editor.

create extension if not exists "pgcrypto";

create schema if not exists nextrep;
grant usage on schema nextrep to anon, authenticated, service_role;
alter default privileges in schema nextrep
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table if not exists nextrep.player_profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at   timestamptz not null default now()
);

-- A profile row is required before a game can be owned, so create it with the user.
create or replace function nextrep.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = nextrep, public
as $$
begin
  insert into nextrep.player_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function nextrep.handle_new_user();

-- ---------------------------------------------------------------------------
-- Games and hosted video
-- ---------------------------------------------------------------------------

create table if not exists nextrep.games (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references nextrep.player_profiles (id) on delete cascade,
  title         text not null,
  opponent      text not null,
  played_on     date not null,
  -- The player identity a reviewer uses to find them on tape.
  jersey_number text not null,
  team_color    text not null,
  marker        text,
  origin        text not null default 'upload' check (origin in ('demo', 'upload')),
  created_at    timestamptz not null default now()
);

create index if not exists games_owner_idx on nextrep.games (owner_id, created_at desc);

create table if not exists nextrep.video_assets (
  game_id          uuid primary key references nextrep.games (id) on delete cascade,
  provider         text not null check (provider in ('mux', 'fixture')),
  status           text not null
                     check (status in ('awaiting-upload', 'uploading', 'processing', 'ready', 'errored', 'cancelled')),
  upload_id        text,
  asset_id         text,
  playback_id      text,
  duration_seconds double precision check (duration_seconds is null or duration_seconds > 0),
  aspect_ratio     text,
  error            text,
  file_name        text,
  ready_at         timestamptz,
  updated_at       timestamptz not null default now()
);

-- Webhooks arrive with provider ids and have to find their game fast.
create unique index if not exists video_assets_upload_idx on nextrep.video_assets (upload_id)
  where upload_id is not null;
create unique index if not exists video_assets_asset_idx on nextrep.video_assets (asset_id)
  where asset_id is not null;

-- ---------------------------------------------------------------------------
-- Reps
-- ---------------------------------------------------------------------------

create table if not exists nextrep.skill_categories (
  slug  text primary key,
  label text not null
);

insert into nextrep.skill_categories (slug, label) values
  ('help-recognition',    'Help recognition'),
  ('closeout-attack',     'Closeout attack'),
  ('transition-decision', 'Transition decision'),
  ('pick-and-roll-read',  'Pick-and-roll read'),
  ('defensive-rotation',  'Defensive rotation')
on conflict (slug) do update set label = excluded.label;

create table if not exists nextrep.reps (
  id                uuid primary key default gen_random_uuid(),
  game_id           uuid not null references nextrep.games (id) on delete cascade,
  position          integer not null check (position >= 1),
  status            text not null default 'draft' check (status in ('draft', 'published')),
  published_at      timestamptz,
  title             text not null,
  category          text not null references nextrep.skill_categories (slug),
  difficulty        text not null check (difficulty in ('easy', 'medium', 'hard')),
  clip_start_ms     integer not null check (clip_start_ms >= 0),
  decision_pause_ms integer not null,
  clip_end_ms       integer not null,
  situation         text not null,
  prompt            text not null,
  correct_choice_id text not null,
  actual_choice_id  text not null,
  actual_outcome    text not null,
  explanation       text not null,
  coaching_cue      text not null,
  created_at        timestamptz not null default now(),
  -- The invariant the studio enforces, enforced again at the last line.
  constraint reps_pause_inside_clip
    check (clip_start_ms < decision_pause_ms and decision_pause_ms < clip_end_ms),
  constraint reps_published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

create index if not exists reps_game_idx on nextrep.reps (game_id, position);

create table if not exists nextrep.answer_choices (
  rep_id    uuid not null references nextrep.reps (id) on delete cascade,
  choice_id text not null,
  label     text not null,
  position  integer not null,
  primary key (rep_id, choice_id)
);

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

create table if not exists nextrep.training_sessions (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references nextrep.player_profiles (id) on delete cascade,
  game_id      uuid not null references nextrep.games (id) on delete cascade,
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists sessions_player_idx on nextrep.training_sessions (player_id, started_at desc);

create table if not exists nextrep.session_reps (
  session_id uuid not null references nextrep.training_sessions (id) on delete cascade,
  rep_id     uuid not null references nextrep.reps (id) on delete cascade,
  position   integer not null,
  primary key (session_id, rep_id)
);

create table if not exists nextrep.player_responses (
  session_id  uuid not null references nextrep.training_sessions (id) on delete cascade,
  rep_id      uuid not null references nextrep.reps (id) on delete cascade,
  choice_id   text not null,
  is_correct  boolean not null,
  answered_at timestamptz not null default now(),
  -- One answer per rep: a rep is a commitment, not something to retry.
  primary key (session_id, rep_id)
);

-- ---------------------------------------------------------------------------
-- Webhook delivery log
-- ---------------------------------------------------------------------------

-- Provider event ids. The primary key is the idempotency mechanism: a repeated
-- delivery conflicts and is skipped rather than applied twice.
create table if not exists nextrep.webhook_events (
  id          text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Film is private. Every policy resolves back to nextrep.games.owner_id = auth.uid().
-- ---------------------------------------------------------------------------

alter table nextrep.player_profiles   enable row level security;
alter table nextrep.games             enable row level security;
alter table nextrep.video_assets      enable row level security;
alter table nextrep.skill_categories  enable row level security;
alter table nextrep.reps              enable row level security;
alter table nextrep.answer_choices    enable row level security;
alter table nextrep.training_sessions enable row level security;
alter table nextrep.session_reps      enable row level security;
alter table nextrep.player_responses  enable row level security;
alter table nextrep.webhook_events    enable row level security;

-- Invoker rights on purpose: row-level security on nextrep.games already limits
-- the caller to their own rows, so this returns the same answer without
-- becoming a privileged RPC that anyone could call.
create or replace function nextrep.owns_game(target uuid)
returns boolean
language sql
stable
security invoker
set search_path = nextrep, public
as $$
  select exists (
    select 1 from nextrep.games g where g.id = target and g.owner_id = auth.uid()
  );
$$;

drop policy if exists "own profile" on nextrep.player_profiles;
create policy "own profile" on nextrep.player_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own games" on nextrep.games;
create policy "own games" on nextrep.games
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "video assets for own games" on nextrep.video_assets;
create policy "video assets for own games" on nextrep.video_assets
  for all using (nextrep.owns_game(game_id)) with check (nextrep.owns_game(game_id));

drop policy if exists "skill categories are readable" on nextrep.skill_categories;
create policy "skill categories are readable" on nextrep.skill_categories
  for select using (true);

drop policy if exists "reps for own games" on nextrep.reps;
create policy "reps for own games" on nextrep.reps
  for all using (nextrep.owns_game(game_id)) with check (nextrep.owns_game(game_id));

drop policy if exists "choices for own reps" on nextrep.answer_choices;
create policy "choices for own reps" on nextrep.answer_choices
  for all using (
    exists (select 1 from nextrep.reps r where r.id = rep_id and nextrep.owns_game(r.game_id))
  ) with check (
    exists (select 1 from nextrep.reps r where r.id = rep_id and nextrep.owns_game(r.game_id))
  );

drop policy if exists "own sessions" on nextrep.training_sessions;
create policy "own sessions" on nextrep.training_sessions
  for all using (player_id = auth.uid()) with check (player_id = auth.uid());

drop policy if exists "own session reps" on nextrep.session_reps;
create policy "own session reps" on nextrep.session_reps
  for all using (
    exists (select 1 from nextrep.training_sessions s where s.id = session_id and s.player_id = auth.uid())
  ) with check (
    exists (select 1 from nextrep.training_sessions s where s.id = session_id and s.player_id = auth.uid())
  );

drop policy if exists "own responses" on nextrep.player_responses;
create policy "own responses" on nextrep.player_responses
  for all using (
    exists (select 1 from nextrep.training_sessions s where s.id = session_id and s.player_id = auth.uid())
  ) with check (
    exists (select 1 from nextrep.training_sessions s where s.id = session_id and s.player_id = auth.uid())
  );

-- No policies on webhook_events by design: only the service role, which
-- bypasses RLS, may read or write the delivery log. A linter will flag this
-- table as "RLS enabled, no policy" — that is the intended configuration.
