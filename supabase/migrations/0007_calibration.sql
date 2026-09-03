-- Temporary calibration workflow for measuring game-analysis-v2 recall/precision
-- against a small human-labelled gold set for one game.
--
-- Calibration labels are NEVER published as reps. They exist only to score the
-- pipeline. Genuine coach-confirmed crops of the target replace the scout
-- stand-ins for calibration testing.

create table if not exists nextrep.calibration_references (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references nextrep.player_profiles (id) on delete cascade,
  game_id           uuid not null references nextrep.games (id) on delete cascade,
  timestamp_seconds double precision not null,
  point             jsonb not null,             -- { x, y } normalized 0..1
  box               jsonb not null,             -- { x, y, w, h } normalized 0..1
  crop              text not null,              -- browser-made data: URL
  number_visible    boolean not null default false,
  jersey_color      text not null,
  created_at        timestamptz not null default now()
);

alter table nextrep.calibration_references enable row level security;
drop policy if exists "own calibration references" on nextrep.calibration_references;
create policy "own calibration references" on nextrep.calibration_references
  for all
  using (owner_id = auth.uid() and nextrep.owns_game(game_id))
  with check (owner_id = auth.uid() and nextrep.owns_game(game_id));

create table if not exists nextrep.calibration_labels (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references nextrep.player_profiles (id) on delete cascade,
  game_id            uuid not null references nextrep.games (id) on delete cascade,
  kind               text not null check (kind in ('decision', 'non-decision')),
  clip_start_seconds double precision not null,
  decision_seconds   double precision,          -- required for kind='decision'
  clip_end_seconds   double precision not null,
  target_point       jsonb,                     -- { x, y } click on the representative frame
  target_crop        text,                      -- browser-made data: URL
  actual_action      text,                      -- kind='decision'
  note               text,                      -- decision: why it is a real read
  rejection_reason   text,                      -- kind='non-decision'
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint calibration_decision_inside_clip
    check (kind <> 'decision' or (clip_start_seconds < decision_seconds and decision_seconds < clip_end_seconds))
);

drop trigger if exists calibration_labels_touch on nextrep.calibration_labels;
create trigger calibration_labels_touch before update on nextrep.calibration_labels
  for each row execute function nextrep.touch_updated_at();

alter table nextrep.calibration_labels enable row level security;
drop policy if exists "own calibration labels" on nextrep.calibration_labels;
create policy "own calibration labels" on nextrep.calibration_labels
  for all
  using (owner_id = auth.uid() and nextrep.owns_game(game_id))
  with check (owner_id = auth.uid() and nextrep.owns_game(game_id));
