-- ReadRep initial schema
--
-- Phase 0 persists through a local file-backed adapter, so nothing runs this
-- file yet. It is committed now because the schema is a design artifact, not an
-- implementation detail: it is where the domain's invariants become constraints
-- the database enforces, and reviewing it is how those invariants get checked
-- before Phase 1 depends on them.
--
-- Two properties are enforced here rather than left to application code:
--   1. Decision quality and play outcome are separate columns on separate
--      enums. There is no boolean correctness column anywhere in this schema,
--      and adding one would be a schema change a reviewer would see.
--   2. A learning moment may only be player-facing when its provenance is
--      coach_approved or manual_authoring, and coach_approved requires the
--      review that approved it.
--
-- Row-level security is deliberately NOT the authorization boundary. ReadRep
-- authorizes in the server data-access layer, which can express consent state
-- and access grants; RLS is added in Phase 1 as defence in depth, not as the
-- primary control. See docs/adr/0004-authentication-and-authorization.md.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enumerations. Mirrors of the zod enums in @readrep/domain.
-- ---------------------------------------------------------------------------

CREATE TYPE readrep_role AS ENUM ('coach', 'player', 'guardian', 'program_admin', 'trainer');
CREATE TYPE membership_status AS ENUM ('invited', 'active', 'suspended', 'removed');

CREATE TYPE consent_scope AS ENUM (
  'film_upload', 'automated_analysis', 'coach_assignment', 'trainer_access', 'extended_retention'
);
CREATE TYPE consent_state AS ENUM (
  'not_requested', 'requested', 'granted', 'denied', 'withdrawn', 'expired'
);

CREATE TYPE provenance_kind AS ENUM (
  'manual_authoring', 'ai_proposal', 'coach_approved', 'player_input', 'system_derived'
);
CREATE TYPE confidence_band AS ENUM ('low', 'medium', 'high');

-- The five-point scale. Note there is no 'correct' and no 'incorrect'.
CREATE TYPE decision_quality AS ENUM (
  'preferred', 'acceptable', 'suboptimal', 'high_risk', 'unclear'
);

-- Recorded independently of decision_quality, and never derived from it.
CREATE TYPE play_outcome AS ENUM (
  'made_shot', 'missed_shot', 'assist', 'turnover', 'foul_drawn',
  'offensive_rebound', 'defensive_stop', 'reset', 'unknown'
);

CREATE TYPE processing_state AS ENUM (
  'created', 'awaiting_upload', 'uploading', 'uploaded', 'securing', 'transcoding',
  'preparing_frames', 'awaiting_player_confirmation', 'discovering_candidate_moments',
  'analyzing_candidates', 'awaiting_coach_review', 'ready_for_assignment', 'completed',
  'failed', 'retrying', 'deleting', 'deleted'
);
CREATE TYPE stage_status AS ENUM ('pending', 'running', 'succeeded', 'failed', 'skipped');

CREATE TYPE review_verdict AS ENUM ('approved', 'rejected', 'needs_more_evidence');
CREATE TYPE candidate_status AS ENUM ('proposed', 'in_review', 'approved', 'rejected', 'superseded');
CREATE TYPE assignment_status AS ENUM ('assigned', 'in_progress', 'completed', 'revoked');
CREATE TYPE response_type AS ENUM (
  'multiple_choice', 'select_player', 'select_court_area', 'short_text'
);

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  email           CITEXT UNIQUE,
  display_name    TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deactivated_at  TIMESTAMPTZ
);

CREATE TABLE teams (
  id                            TEXT PRIMARY KEY,
  name                          TEXT NOT NULL,
  program_name                  TEXT,
  season                        TEXT NOT NULL,
  level                         TEXT NOT NULL,
  owner_user_id                 TEXT NOT NULL REFERENCES users(id),
  active_coach_system_revision  INTEGER CHECK (active_coach_system_revision > 0),
  -- Privacy defaults are restrictive; there is no 'public' option to set.
  guardians_may_view_film       BOOLEAN NOT NULL DEFAULT TRUE,
  players_may_see_teammate_attempts BOOLEAN NOT NULL DEFAULT FALSE,
  trainers_may_be_granted       BOOLEAN NOT NULL DEFAULT FALSE,
  original_retention_days       INTEGER NOT NULL DEFAULT 365 CHECK (original_retention_days BETWEEN 1 AND 3650),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE players (
  id            TEXT PRIMARY KEY,
  team_id       TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  user_id       TEXT REFERENCES users(id),
  is_minor      BOOLEAN NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX players_team_idx ON players(team_id);

CREATE TABLE player_jerseys (
  id             BIGSERIAL PRIMARY KEY,
  player_id      TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  number         TEXT NOT NULL CHECK (number ~ '^[0-9]{1,2}$'),
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to   TIMESTAMPTZ,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE TABLE memberships (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id     TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role        readrep_role NOT NULL,
  status      membership_status NOT NULL,
  player_id   TEXT REFERENCES players(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id, role),
  -- Only a player membership links to a roster row.
  CHECK (role = 'player' OR player_id IS NULL)
);
CREATE INDEX memberships_user_idx ON memberships(user_id);
CREATE INDEX memberships_team_idx ON memberships(team_id);

CREATE TABLE guardian_relationships (
  id                  TEXT PRIMARY KEY,
  guardian_user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_id           TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  relationship        TEXT NOT NULL,
  verified_at         TIMESTAMPTZ,
  verified_by_user_id TEXT REFERENCES users(id),
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A verified relationship must record who verified it.
  CHECK (verified_at IS NULL OR verified_by_user_id IS NOT NULL)
);
CREATE INDEX guardian_user_idx ON guardian_relationships(guardian_user_id);

CREATE TABLE access_grants (
  id                 TEXT PRIMARY KEY,
  team_id            TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id          TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  grantee_user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by_user_id TEXT NOT NULL REFERENCES users(id),
  granted_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ,
  revoked_at         TIMESTAMPTZ
);
CREATE INDEX access_grants_grantee_idx ON access_grants(grantee_user_id);

CREATE TABLE consent_records (
  id                  TEXT PRIMARY KEY,
  player_id           TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  scope               consent_scope NOT NULL,
  state               consent_state NOT NULL,
  granted_by_user_id  TEXT REFERENCES users(id),
  granted_at          TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  withdrawn_at        TIMESTAMPTZ,
  method              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, scope),
  -- Granted consent must record who granted it and when.
  CHECK (state <> 'granted' OR (granted_by_user_id IS NOT NULL AND granted_at IS NOT NULL)),
  CHECK (state <> 'withdrawn' OR withdrawn_at IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- Games and video
-- ---------------------------------------------------------------------------

CREATE TABLE games (
  id                  TEXT PRIMARY KEY,
  team_id             TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  status              TEXT NOT NULL,
  uploaded_by_user_id TEXT NOT NULL REFERENCES users(id),
  context             JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX games_team_idx ON games(team_id);

CREATE TABLE game_target_players (
  game_id   TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (game_id, player_id)
);

-- No playable URL is stored. Provider identifiers only; playback is authorized
-- per request and expires. A URL in this table is a URL that eventually reaches
-- a client.
CREATE TABLE video_assets (
  id                    TEXT PRIMARY KEY,
  game_id               TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  status                TEXT NOT NULL,
  provider_name         TEXT NOT NULL,
  provider_asset_id     TEXT,
  provider_upload_id    TEXT,
  provider_playback_id  TEXT,
  duration_ms           BIGINT CHECK (duration_ms >= 0),
  renditions            JSONB NOT NULL DEFAULT '[]'::jsonb,
  retention_expires_at  TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (provider_playback_id NOT LIKE 'http%')
);
CREATE UNIQUE INDEX video_assets_game_idx ON video_assets(game_id);
CREATE INDEX video_assets_retention_idx ON video_assets(retention_expires_at)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Processing
-- ---------------------------------------------------------------------------

CREATE TABLE processing_runs (
  id                  TEXT PRIMARY KEY,
  game_id             TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  video_asset_id      TEXT REFERENCES video_assets(id),
  state               processing_state NOT NULL,
  resume_state        processing_state,
  pipeline_version    TEXT NOT NULL,
  failure             JSONB,
  deletion            JSONB,
  -- Dedupe log for at-least-once event delivery.
  applied_event_keys  TEXT[] NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (state <> 'failed' OR failure IS NOT NULL),
  CHECK (state <> 'retrying' OR resume_state IS NOT NULL),
  CHECK (state NOT IN ('deleting', 'deleted') OR deletion IS NOT NULL)
);
CREATE UNIQUE INDEX processing_runs_game_idx ON processing_runs(game_id);

CREATE TABLE processing_stages (
  id               TEXT PRIMARY KEY,
  run_id           TEXT NOT NULL REFERENCES processing_runs(id) ON DELETE CASCADE,
  state            processing_state NOT NULL,
  status           stage_status NOT NULL,
  sequence         INTEGER NOT NULL CHECK (sequence >= 0),
  -- Dedupes the work a worker performs, distinct from the run's event log.
  idempotency_key  TEXT NOT NULL,
  attempts         INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts     INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  progress         JSONB,
  artifacts        JSONB NOT NULL DEFAULT '[]'::jsonb,
  failure          JSONB,
  cost_micro_usd   BIGINT NOT NULL DEFAULT 0 CHECK (cost_micro_usd >= 0),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  UNIQUE (run_id, state),
  UNIQUE (idempotency_key),
  CHECK (status <> 'failed' OR failure IS NOT NULL),
  CHECK (status <> 'succeeded' OR completed_at IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- Vision (Phase 2)
-- ---------------------------------------------------------------------------

CREATE TABLE tracks (
  id                   TEXT PRIMARY KEY,
  game_id              TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  video_asset_id       TEXT NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
  subject              TEXT NOT NULL,
  affiliation          TEXT NOT NULL,
  start_ms             BIGINT NOT NULL CHECK (start_ms >= 0),
  end_ms               BIGINT NOT NULL,
  observations         JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Null until a human confirms. A track is evidence, not identity.
  confirmed_player_id  TEXT REFERENCES players(id),
  confidence_score     REAL NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  confidence_band      confidence_band NOT NULL,
  confidence_basis     TEXT NOT NULL,
  uncertainty          JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_ms > start_ms)
);
CREATE INDEX tracks_game_idx ON tracks(game_id);

CREATE TABLE identity_evidence (
  id                   TEXT PRIMARY KEY,
  track_id             TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  candidate_player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  signal               TEXT NOT NULL,
  weight               REAL NOT NULL CHECK (weight BETWEEN -1 AND 1),
  at_ms                BIGINT,
  detail               TEXT NOT NULL,
  confidence_score     REAL NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  confirmed_by_user_id TEXT REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX identity_evidence_track_idx ON identity_evidence(track_id);

CREATE TABLE possessions (
  id              TEXT PRIMARY KEY,
  game_id         TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  video_asset_id  TEXT NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
  start_ms        BIGINT NOT NULL CHECK (start_ms >= 0),
  end_ms          BIGINT NOT NULL,
  control         TEXT NOT NULL,
  sequence        INTEGER NOT NULL CHECK (sequence >= 0),
  derived_events  JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score REAL NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  uncertainty     JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, sequence),
  CHECK (end_ms > start_ms)
);

-- ---------------------------------------------------------------------------
-- Coach system
-- ---------------------------------------------------------------------------

CREATE TABLE coach_systems (
  id                  TEXT PRIMARY KEY,
  team_id             TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  revision            INTEGER NOT NULL CHECK (revision > 0),
  status              TEXT NOT NULL,
  authored_by_user_id TEXT NOT NULL REFERENCES users(id),
  summary             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at        TIMESTAMPTZ,
  superseded_at       TIMESTAMPTZ,
  UNIQUE (team_id, revision)
);
-- At most one active revision per team.
CREATE UNIQUE INDEX coach_systems_one_active ON coach_systems(team_id)
  WHERE status = 'active';

-- Rules are immutable per revision. An edit creates new rows so that a moment
-- approved last month still cites the wording that was in force last month.
CREATE TABLE coach_rules (
  id                  TEXT PRIMARY KEY,
  key                 TEXT NOT NULL,
  coach_system_id     TEXT NOT NULL REFERENCES coach_systems(id) ON DELETE CASCADE,
  team_id             TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  revision            INTEGER NOT NULL CHECK (revision > 0),
  topic               TEXT NOT NULL,
  statement           TEXT NOT NULL,
  detail              TEXT,
  terminology         TEXT[] NOT NULL DEFAULT '{}',
  applies_to          TEXT[] NOT NULL DEFAULT '{}',
  source_question_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coach_system_id, key)
);
CREATE INDEX coach_rules_team_idx ON coach_rules(team_id);

-- ---------------------------------------------------------------------------
-- Candidates, review, learning
-- ---------------------------------------------------------------------------

CREATE TABLE decision_candidates (
  id                    TEXT PRIMARY KEY,
  game_id               TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  video_asset_id        TEXT NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
  team_id               TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id             TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  possession_id         TEXT REFERENCES possessions(id),
  status                candidate_status NOT NULL,
  start_ms              BIGINT NOT NULL CHECK (start_ms >= 0),
  end_ms                BIGINT NOT NULL,
  pause_point_ms        BIGINT NOT NULL,
  teachability_score    REAL NOT NULL CHECK (teachability_score BETWEEN 0 AND 1),
  -- The proposal, preserved verbatim and never edited in place.
  interpretation        JSONB NOT NULL,
  provenance            provenance_kind NOT NULL,
  outcome               play_outcome NOT NULL,
  coach_system_revision INTEGER CHECK (coach_system_revision > 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_ms > start_ms),
  CHECK (pause_point_ms >= start_ms AND pause_point_ms < end_ms)
);
CREATE INDEX decision_candidates_team_status_idx ON decision_candidates(team_id, status);

CREATE TABLE coach_reviews (
  id                    TEXT PRIMARY KEY,
  candidate_id          TEXT NOT NULL UNIQUE REFERENCES decision_candidates(id) ON DELETE CASCADE,
  team_id               TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  reviewer_user_id      TEXT NOT NULL REFERENCES users(id),
  verdict               review_verdict NOT NULL,
  -- The coach's version, kept apart from the proposal above.
  edited_interpretation JSONB,
  preferred_option_id   TEXT,
  note                  TEXT,
  confidence_score      REAL NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  confidence_band       confidence_band NOT NULL,
  confidence_basis      TEXT NOT NULL,
  rejection_reason      TEXT,
  rejection_detail      TEXT,
  coach_system_revision INTEGER,
  reviewed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A rejection must say why; nothing else may carry a reason.
  CHECK ((verdict = 'rejected') = (rejection_reason IS NOT NULL))
);

CREATE TABLE learning_moments (
  id                   TEXT PRIMARY KEY,
  team_id              TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id            TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id              TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  video_asset_id       TEXT NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
  source_candidate_id  TEXT NOT NULL REFERENCES decision_candidates(id),
  source_review_id     TEXT REFERENCES coach_reviews(id),
  provenance           provenance_kind NOT NULL,
  start_ms             BIGINT NOT NULL CHECK (start_ms >= 0),
  end_ms               BIGINT NOT NULL,
  pause_point_ms       BIGINT NOT NULL,
  question_prompt      TEXT NOT NULL,
  response_type        response_type NOT NULL,
  interpretation       JSONB NOT NULL,
  outcome              play_outcome NOT NULL,
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at           TIMESTAMPTZ,
  CHECK (end_ms > start_ms),
  CHECK (pause_point_ms >= start_ms AND pause_point_ms < end_ms),
  -- Only coach-approved or manually authored content may face a player.
  CHECK (provenance IN ('coach_approved', 'manual_authoring')),
  -- Coach-approved content must point at the review that approved it.
  CHECK (provenance <> 'coach_approved' OR source_review_id IS NOT NULL)
);
CREATE INDEX learning_moments_player_idx ON learning_moments(player_id) WHERE retired_at IS NULL;

CREATE TABLE assignments (
  id                  TEXT PRIMARY KEY,
  team_id             TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id           TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  assigned_by_user_id TEXT NOT NULL REFERENCES users(id),
  title               TEXT NOT NULL,
  status              assignment_status NOT NULL,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ
);
CREATE INDEX assignments_player_idx ON assignments(player_id);

CREATE TABLE assignment_moments (
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  moment_id     TEXT NOT NULL REFERENCES learning_moments(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (assignment_id, moment_id),
  UNIQUE (assignment_id, position)
);

CREATE TABLE player_attempts (
  id                TEXT PRIMARY KEY,
  moment_id         TEXT NOT NULL REFERENCES learning_moments(id) ON DELETE CASCADE,
  assignment_id     TEXT REFERENCES assignments(id) ON DELETE SET NULL,
  player_id         TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id           TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  response          JSONB NOT NULL,
  -- The graded read. There is no is_correct column, by design.
  decision_quality  decision_quality NOT NULL,
  committed_at      TIMESTAMPTZ NOT NULL,
  revealed_at       TIMESTAMPTZ,
  time_to_decide_ms INTEGER CHECK (time_to_decide_ms >= 0),
  attempt_number    INTEGER NOT NULL CHECK (attempt_number > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (moment_id, player_id, attempt_number),
  -- The outcome cannot be revealed before the player committed.
  CHECK (revealed_at IS NULL OR revealed_at >= committed_at)
);
CREATE INDEX player_attempts_player_idx ON player_attempts(player_id);

CREATE TABLE reflections (
  id          TEXT PRIMARY KEY,
  attempt_id  TEXT NOT NULL REFERENCES player_attempts(id) ON DELETE CASCADE,
  moment_id   TEXT NOT NULL REFERENCES learning_moments(id) ON DELETE CASCADE,
  player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id     TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  missed_cue  TEXT,
  revisit     BOOLEAN NOT NULL DEFAULT FALSE,
  provenance  provenance_kind NOT NULL DEFAULT 'player_input',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (provenance = 'player_input')
);

-- ---------------------------------------------------------------------------
-- AI operations and audit
-- ---------------------------------------------------------------------------

CREATE TABLE ai_operation_results (
  id                       TEXT PRIMARY KEY,
  operation                TEXT NOT NULL,
  status                   TEXT NOT NULL,
  -- Idempotency: the same input must not be charged for twice.
  input_hash               CHAR(64) NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  provider_name            TEXT NOT NULL,
  model_version            TEXT NOT NULL,
  prompt_version           TEXT NOT NULL,
  schema_version           TEXT NOT NULL,
  output                   JSONB,
  error_message            TEXT,
  citation                 JSONB,
  latency_ms               INTEGER NOT NULL CHECK (latency_ms >= 0),
  input_tokens             INTEGER,
  output_tokens            INTEGER,
  estimated_cost_micro_usd BIGINT CHECK (estimated_cost_micro_usd >= 0),
  game_id                  TEXT REFERENCES games(id) ON DELETE CASCADE,
  started_at               TIMESTAMPTZ NOT NULL,
  completed_at             TIMESTAMPTZ NOT NULL,
  UNIQUE (operation, input_hash),
  CHECK (status <> 'succeeded' OR output IS NOT NULL),
  CHECK (status = 'succeeded' OR error_message IS NOT NULL)
);
CREATE INDEX ai_operation_results_game_idx ON ai_operation_results(game_id);

-- Append only. No UPDATE and no DELETE are granted on this table in Phase 1.
CREATE TABLE audit_events (
  id                TEXT PRIMARY KEY,
  actor_user_id     TEXT REFERENCES users(id),
  actor_description TEXT NOT NULL DEFAULT 'system',
  team_id           TEXT REFERENCES teams(id) ON DELETE SET NULL,
  action            TEXT NOT NULL,
  resource_type     TEXT NOT NULL,
  resource_id       TEXT NOT NULL,
  outcome           TEXT NOT NULL CHECK (outcome IN ('allowed', 'denied', 'error')),
  ip_address        INET,
  user_agent        TEXT,
  request_id        TEXT,
  -- Scalars only. Never media content, names, or free text a player wrote.
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_team_time_idx ON audit_events(team_id, occurred_at DESC);
CREATE INDEX audit_events_denied_idx ON audit_events(occurred_at DESC) WHERE outcome = 'denied';

COMMIT;
