-- NextRep automatic decision-training flow.
--
-- Adds:
--   * coaching_profiles      one versioned enum-answer survey per coach, reused across games
--   * ai_game_analysis_jobs  one durable full-game analysis run per (game, target player)
--   * ai_candidate_reps      the ranked coach review queue produced by an analysis
--
-- Everything resolves to nextrep.games.owner_id = auth.uid(); a signed-out or
-- wrong-account caller sees nothing. No secrets, Mux URLs or image bytes are
-- ever stored here.
--
-- Apply after 0002 with `supabase db push`.

-- --------------------------------------------------------------------------
-- Coaching profile
-- --------------------------------------------------------------------------
create table if not exists nextrep.coaching_profiles (
  owner_id        uuid primary key references nextrep.player_profiles (id) on delete cascade,
  schema_version  integer not null default 1,
  answers         jsonb not null default '{}'::jsonb,     -- { [questionId]: enumValue }
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create or replace function nextrep.touch_updated_at()
returns trigger language plpgsql set search_path = nextrep, public as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists coaching_profiles_touch on nextrep.coaching_profiles;
create trigger coaching_profiles_touch before update on nextrep.coaching_profiles
  for each row execute function nextrep.touch_updated_at();

alter table nextrep.coaching_profiles enable row level security;
drop policy if exists "own coaching profile" on nextrep.coaching_profiles;
create policy "own coaching profile" on nextrep.coaching_profiles
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- --------------------------------------------------------------------------
-- Full-game analysis job (durable; a background worker advances the stage)
-- --------------------------------------------------------------------------
create table if not exists nextrep.ai_game_analysis_jobs (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references nextrep.player_profiles (id) on delete cascade,
  game_id               uuid not null references nextrep.games (id) on delete cascade,
  video_asset_id        text,
  playback_id           text,

  target_jersey_number  text not null,
  target_team_color     text not null,
  target_marker         text,
  target_reference      jsonb not null default '[]'::jsonb,

  status                text not null default 'queued'
                          check (status in ('queued','running','completed','failed','cancelled')),
  stage                 text not null default 'queued'
                          check (stage in ('queued','preparing','locating-player','reviewing-possessions',
                                           'finding-decisions','building-reps','ranking','done','failed')),
  progress_note         text,
  cursor                jsonb not null default '{}'::jsonb,

  duration_seconds      double precision,
  coach_profile_version integer,
  provider              text not null default 'openai',
  discovery_model       text,
  reasoning_model       text,
  prompt_version        text,

  live_span_count       integer,
  possession_count      integer,
  analyzed_count        integer,
  candidate_count       integer,
  rejected_count        integer,
  approved_count        integer default 0,
  discovery_calls       integer default 0,
  reasoning_calls       integer default 0,
  input_tokens          bigint default 0,
  output_tokens         bigint default 0,
  estimated_cost_usd    double precision default 0,
  attempts              integer not null default 0,
  error_code            text,
  error_message_safe    text,

  heartbeat_at          timestamptz,
  created_at            timestamptz not null default now(),
  started_at            timestamptz,
  completed_at          timestamptz,
  updated_at            timestamptz not null default now()
);

create index if not exists ai_game_jobs_game_idx on nextrep.ai_game_analysis_jobs (game_id, created_at desc);
create index if not exists ai_game_jobs_owner_idx on nextrep.ai_game_analysis_jobs (owner_id, created_at desc);
create unique index if not exists ai_game_jobs_one_active
  on nextrep.ai_game_analysis_jobs (game_id, target_jersey_number, target_team_color)
  where status in ('queued','running');
create index if not exists ai_game_jobs_claimable_idx
  on nextrep.ai_game_analysis_jobs (status, heartbeat_at)
  where status in ('queued','running');

drop trigger if exists ai_game_jobs_touch on nextrep.ai_game_analysis_jobs;
create trigger ai_game_jobs_touch before update on nextrep.ai_game_analysis_jobs
  for each row execute function nextrep.touch_updated_at();

alter table nextrep.ai_game_analysis_jobs enable row level security;
drop policy if exists "own game analysis jobs" on nextrep.ai_game_analysis_jobs;
create policy "own game analysis jobs" on nextrep.ai_game_analysis_jobs
  for all
  using (owner_id = auth.uid() and nextrep.owns_game(game_id))
  with check (owner_id = auth.uid() and nextrep.owns_game(game_id));

-- --------------------------------------------------------------------------
-- Candidate reps (the ranked review queue)
-- --------------------------------------------------------------------------
create table if not exists nextrep.ai_candidate_reps (
  id                        uuid primary key default gen_random_uuid(),
  analysis_job_id           uuid not null references nextrep.ai_game_analysis_jobs (id) on delete cascade,
  game_id                   uuid not null references nextrep.games (id) on delete cascade,
  owner_id                  uuid not null references nextrep.player_profiles (id) on delete cascade,

  target_jersey_number      text not null,
  target_team_color         text not null,

  clip_start_seconds        double precision not null check (clip_start_seconds >= 0),
  decision_seconds          double precision not null,
  clip_end_seconds          double precision not null check (clip_end_seconds > clip_start_seconds),

  title                     text,
  skill_category            text references nextrep.skill_categories (slug),
  difficulty                text check (difficulty in ('easy','medium','hard')),
  situation                 text,
  prompt                    text,
  answer_choices            jsonb not null default '[]'::jsonb,
  best_read_choice_id       text,
  actual_decision_choice_id text,
  actual_decision           text,
  outcome                   text,
  coaching_explanation      text,

  visible_evidence          jsonb not null default '[]'::jsonb,
  basketball_inferences     jsonb not null default '[]'::jsonb,
  coach_preference_basis    jsonb not null default '[]'::jsonb,
  involvement               text,
  uncertainty               jsonb not null default '[]'::jsonb,

  player_identification_confidence double precision,
  decision_confidence       double precision,
  teaching_value_score      double precision,
  rank                      integer,
  dedupe_key                text,

  status                    text not null default 'pending_review'
                              check (status in ('pending_review','approved','edited','rejected','needs_attention')),
  rejection_reason          text,
  published_rep_id          uuid references nextrep.reps (id) on delete set null,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint candidate_decision_inside_clip
    check (clip_start_seconds < decision_seconds and decision_seconds < clip_end_seconds)
);

create index if not exists ai_candidate_reps_job_idx on nextrep.ai_candidate_reps (analysis_job_id, rank);
create index if not exists ai_candidate_reps_game_idx on nextrep.ai_candidate_reps (game_id, status);

drop trigger if exists ai_candidate_reps_touch on nextrep.ai_candidate_reps;
create trigger ai_candidate_reps_touch before update on nextrep.ai_candidate_reps
  for each row execute function nextrep.touch_updated_at();

alter table nextrep.ai_candidate_reps enable row level security;
drop policy if exists "own candidate reps" on nextrep.ai_candidate_reps;
create policy "own candidate reps" on nextrep.ai_candidate_reps
  for all
  using (owner_id = auth.uid() and nextrep.owns_game(game_id))
  with check (owner_id = auth.uid() and nextrep.owns_game(game_id));
