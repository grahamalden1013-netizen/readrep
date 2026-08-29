-- NextRep V1 schema.
--
-- V1 plays entirely from seeded reps and a signed cookie, so nothing in the app
-- requires this migration to be applied. It exists so that a Supabase project
-- can be provisioned to match the domain model in lib/reps/schema.ts when
-- durable, cross-device sessions are wired up.
--
-- Apply with: supabase db push  (or paste into the SQL editor).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table if not exists public.player_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at  timestamptz not null default now()
);

-- The team colour / jersey number a player is identified by on a given game.
create table if not exists public.player_identities (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.player_profiles (id) on delete cascade,
  jersey_number text not null,
  team_color    text not null,
  marker        text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Film
-- ---------------------------------------------------------------------------

create table if not exists public.games (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.player_profiles (id) on delete cascade,
  identity_id  uuid references public.player_identities (id) on delete set null,
  title        text not null,
  opponent     text not null,
  played_on    date not null,
  origin       text not null default 'upload' check (origin in ('demo', 'upload')),
  -- [{ "src": "...", "type": "video/webm; codecs=\"vp9\"" }, ...]
  encodings    jsonb not null default '[]'::jsonb,
  poster_src   text,
  captions_src text,
  disclaimer   text,
  created_at   timestamptz not null default now()
);

-- One row per attempt to turn a game into reps. V1 only ever writes
-- method='human-review'; automated detection would write its own method.
create table if not exists public.analysis_jobs (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games (id) on delete cascade,
  status      text not null default 'queued'
                check (status in ('queued', 'running', 'ready', 'review-required', 'failed')),
  method      text not null default 'human-review' check (method in ('seeded', 'human-review')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  error       text
);

-- ---------------------------------------------------------------------------
-- Reps
-- ---------------------------------------------------------------------------

create table if not exists public.skill_categories (
  slug  text primary key,
  label text not null
);

insert into public.skill_categories (slug, label) values
  ('help-recognition',    'Help recognition'),
  ('closeout-attack',     'Closeout attack'),
  ('transition-decision', 'Transition decision'),
  ('pick-and-roll-read',  'Pick-and-roll read'),
  ('defensive-rotation',  'Defensive rotation')
on conflict (slug) do update set label = excluded.label;

create table if not exists public.reps (
  id                uuid primary key default gen_random_uuid(),
  game_id           uuid not null references public.games (id) on delete cascade,
  position          integer not null,
  title             text not null,
  category          text not null references public.skill_categories (slug),
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
  unique (game_id, position),
  constraint reps_pause_inside_clip
    check (clip_start_ms < decision_pause_ms and decision_pause_ms < clip_end_ms)
);

create table if not exists public.answer_choices (
  rep_id    uuid not null references public.reps (id) on delete cascade,
  choice_id text not null,
  label     text not null,
  position  integer not null,
  primary key (rep_id, choice_id)
);

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

create table if not exists public.training_sessions (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.player_profiles (id) on delete cascade,
  game_id      uuid not null references public.games (id) on delete cascade,
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.session_reps (
  session_id uuid not null references public.training_sessions (id) on delete cascade,
  rep_id     uuid not null references public.reps (id) on delete cascade,
  position   integer not null,
  primary key (session_id, rep_id)
);

create table if not exists public.player_responses (
  session_id  uuid not null references public.training_sessions (id) on delete cascade,
  rep_id      uuid not null references public.reps (id) on delete cascade,
  choice_id   text not null,
  is_correct  boolean not null,
  answered_at timestamptz not null default now(),
  -- One answer per rep: a rep is a commitment, not something to retry.
  primary key (session_id, rep_id)
);

create index if not exists games_owner_idx on public.games (owner_id, created_at desc);
create index if not exists sessions_player_idx on public.training_sessions (player_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.player_profiles   enable row level security;
alter table public.player_identities enable row level security;
alter table public.games             enable row level security;
alter table public.analysis_jobs     enable row level security;
alter table public.reps              enable row level security;
alter table public.answer_choices    enable row level security;
alter table public.training_sessions enable row level security;
alter table public.session_reps      enable row level security;
alter table public.player_responses  enable row level security;
alter table public.skill_categories  enable row level security;

create policy "own profile" on public.player_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own identities" on public.player_identities
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "own games" on public.games
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "jobs for own games" on public.analysis_jobs
  for all using (
    exists (select 1 from public.games g where g.id = game_id and g.owner_id = auth.uid())
  );

-- Reps are readable by the game owner. Authoring happens through migrations or
-- the service role, never from the browser: the correct answer lives here.
create policy "reps for own games" on public.reps
  for select using (
    exists (select 1 from public.games g where g.id = game_id and g.owner_id = auth.uid())
  );

create policy "choices for own reps" on public.answer_choices
  for select using (
    exists (
      select 1 from public.reps r
      join public.games g on g.id = r.game_id
      where r.id = rep_id and g.owner_id = auth.uid()
    )
  );

create policy "skill categories are public" on public.skill_categories for select using (true);

create policy "own sessions" on public.training_sessions
  for all using (player_id = auth.uid()) with check (player_id = auth.uid());

create policy "own session reps" on public.session_reps
  for all using (
    exists (
      select 1 from public.training_sessions s
      where s.id = session_id and s.player_id = auth.uid()
    )
  );

create policy "own responses" on public.player_responses
  for all using (
    exists (
      select 1 from public.training_sessions s
      where s.id = session_id and s.player_id = auth.uid()
    )
  );
