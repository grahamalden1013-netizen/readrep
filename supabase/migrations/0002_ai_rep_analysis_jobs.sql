-- AI Rep Copilot: durable state + audit metadata for one coach-selected
-- possession analysed by the OpenAI Responses API.
--
-- Follows the same ownership model as the rest of the nextrep schema: every row
-- resolves to nextrep.games.owner_id = auth.uid(). A signed-out caller matches
-- nothing; one user cannot see or write another user's jobs.
--
-- Apply after 0001_nextrep.sql with `supabase db push`, or paste into the SQL
-- editor. No secrets (OpenAI key, Mux URLs, image bytes) are ever stored here.

create table if not exists nextrep.ai_rep_analysis_jobs (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references nextrep.player_profiles (id) on delete cascade,
  game_id               uuid not null references nextrep.games (id) on delete cascade,
  video_asset_id        text,
  status                text not null default 'queued'
                          check (status in ('queued', 'running', 'completed', 'failed')),
  -- Honest, coarse progress for the Studio UI (no fake percentages).
  phase                 text not null default 'queued'
                          check (phase in ('queued', 'preparing-frames', 'studying', 'building-draft', 'done', 'failed')),

  clip_start_seconds    double precision not null check (clip_start_seconds >= 0),
  decision_seconds      double precision not null check (decision_seconds >= 0),
  clip_end_seconds      double precision not null check (clip_end_seconds > clip_start_seconds),
  target_jersey_number  text not null,
  target_team_color     text not null,

  provider              text not null default 'openai',
  model                 text,
  model_fallback_used   boolean not null default false,
  prompt_version        text not null,

  result_json           jsonb,
  warnings_json          jsonb not null default '[]'::jsonb,
  error_code            text,
  error_message_safe    text,

  frame_count           integer,
  input_tokens          integer,
  output_tokens         integer,
  total_tokens          integer,
  estimated_cost_usd    double precision,
  latency_ms            integer,

  created_at            timestamptz not null default now(),
  started_at            timestamptz,
  completed_at          timestamptz,
  updated_at            timestamptz not null default now(),

  constraint ai_jobs_decision_inside_clip
    check (clip_start_seconds < decision_seconds and decision_seconds < clip_end_seconds)
);

create index if not exists ai_rep_jobs_game_idx
  on nextrep.ai_rep_analysis_jobs (game_id, created_at desc);
create index if not exists ai_rep_jobs_owner_idx
  on nextrep.ai_rep_analysis_jobs (owner_id, created_at desc);

-- One active analysis per game + exact clip window. A completed or failed job
-- does not block a fresh attempt; only queued/running ones do.
create unique index if not exists ai_rep_jobs_one_active_per_clip
  on nextrep.ai_rep_analysis_jobs (game_id, clip_start_seconds, decision_seconds, clip_end_seconds)
  where status in ('queued', 'running');

create or replace function nextrep.touch_ai_rep_job_updated_at()
returns trigger
language plpgsql
set search_path = nextrep, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ai_rep_jobs_touch_updated_at on nextrep.ai_rep_analysis_jobs;
create trigger ai_rep_jobs_touch_updated_at
  before update on nextrep.ai_rep_analysis_jobs
  for each row execute function nextrep.touch_ai_rep_job_updated_at();

alter table nextrep.ai_rep_analysis_jobs enable row level security;

drop policy if exists "own ai rep jobs" on nextrep.ai_rep_analysis_jobs;
create policy "own ai rep jobs" on nextrep.ai_rep_analysis_jobs
  for all
  using (owner_id = auth.uid() and nextrep.owns_game(game_id))
  with check (owner_id = auth.uid() and nextrep.owns_game(game_id));
