# Full-game analysis

"Upload a game. Select a player. NextRep finds the decisions worth replaying."

A coach uploads one full game, picks one player, presses **Analyze game**, and
comes back to a ranked queue of coachable decision moments. No manual scrubbing,
no per-rep construction. This document covers the pipeline, the durable worker,
the limits, and which coaching-profile answers influence which decisions.

## User-visible flow

| Step | Route | What happens |
| --- | --- | --- |
| Coaching profile (once) | `/settings` | ~15 enum questions, offense + defense. Stored per coach, reused for every game, never re-asked. |
| Upload a game | `/games/new` → `/games/[id]/processing` | Whole game to Mux. Nothing re-encoded locally. |
| Select + confirm a player | `/games/[id]/analysis` | Jersey + team colour + optional marker, then tap the sample frames where that player is visible. Those timestamps become coach-confirmed reference frames on the job. |
| Analyze game | `/games/[id]/analysis` | Creates one durable job. Calm honest stages. Safe to leave the page. |
| Review the queue | `/games/[id]/review` | One candidate at a time: clip → pause at the decision → draft question + reveal → Approve / Edit / Reject. "Why this moment?" is collapsed. |
| Player session | `/sessions/[id]` | Approved candidates are published as reps and the player gets the normal calm decision session. |
| Manual fallback | `/games/[id]/advanced` | The clip studio, kept available. Never the default post-upload destination. |

## Pipeline (`lib/ai/game-analysis/`)

```
Mux thumbnails ──► Stage A  live/dead filter        (cheap model, low-res batches)
                   Stage B  possession windows       (pure geometry, segments.ts)
                   Stage C  identify the target      ┐
                   Stage D  is there a real decision │ reasoning model, one call
                   Stage E  consult coaching profile ┘ per window (possession.ts)
                   Stage F  dedupe + rank             (rank.ts)
                          ──► ai_candidate_reps  (coach review queue)
```

- **Stage A — `segments.ts` + `discovery-provider.ts`.** Probe one frame every
  `DISCOVERY_SAMPLE_INTERVAL_SECONDS` (edges trimmed). Classify batches of
  `DISCOVERY_BATCH_SIZE` low-detail frames with the cheap discovery model as
  live half-court/transition play vs. studio / commercial / halftime / timeout /
  bench / crowd / scoreboard / replay / dead-ball. Merge verdicts into live
  spans, bridging a single dead sample (`LIVE_SPAN_GAP_TOLERANCE`). Capped at
  `MAX_DISCOVERY_CALLS`.
- **Stage B — `segments.ts`.** Cut each span into `POSSESSION_WINDOW_SECONDS`
  windows overlapping by `POSSESSION_WINDOW_OVERLAP_SECONDS`, so a decision has
  alignment → development → decision → action → outcome context on both sides.
  Windows below `MIN_POSSESSION_WINDOW_SECONDS` are dropped.
- **Stage C/D/E — `possession.ts` + `prompt.ts` + `schema.ts`.** For each window
  (up to `MAX_REASONING_CALLS`), send `POSSESSION_FRAMES` chronological frames
  plus the coach-confirmed reference frames to the reasoning model. The rubric:
  1. Identify the target using team colour + jersey (when legible) + reference
     frames + visual continuity + court location + appearance cues. If not
     confident at the decision point → `targetVisible = false`, nulls. Never
     attribute another player's action to the target.
  2. Is the target meaningfully involved and facing a real choice (on-ball
     offense, off-ball offense, **or** defense — not just ball possession)?
  3. Find the single pause point just before the action → `decisionOffsetSeconds`
     from the window start; require enough footage after it.
  4. Build the draft: 2–4 concrete choices, exactly one best read,
     `skillCategory` ∈ the five categories or null (never invented).
  5. **Only now** consult the coaching profile. Preferences may nudge the
     preferred choice, terminology, and emphasis. They must **not** change
     identification, whether the possession happened, the visible evidence, the
     actual outcome, the timestamps, or any factual description. A preference
     never makes a visible choice "wrong", only "preferred". Used preferences are
     listed in `coachPreferenceBasis`.
  `visibleEvidence`, `basketballInferences`, and `uncertainty` are kept separate.
  Timing is re-derived and re-validated server-side; evidence outside the window
  is dropped; a window with fewer than two in-window observations, invalid
  choices, or missing draft fields is rejected with a reason.
- **Stage F — `rank.ts`.** Bucket near-identical moments by skill category + top
  decision tags, keep the strongest per bucket, score by a weighted blend of
  player-ID confidence, decision confidence, teaching value, number of
  alternatives, outcome visibility, and evidence count. The score is
  **visible-evidence based only** — coach-profile relevance is deliberately not
  part of ranking, only of the recommended-choice wording. Interleave buckets so
  the first few reps vary. Cap at `MAX_CANDIDATES`; target ~5–10 strong reps.

Rejected windows never become candidate rows; their reasons are recorded in the
job cursor for the internal evaluation report.

## Durable worker (`lib/ai/game-analysis/worker.ts`)

There is no Modal / separate worker deploy target and no service-role key in this
environment, so the durable boundary is a **bounded, cursor-checkpointed tick**:

- `runAnalysisTick(jobId)` leases the job for `JOB_STALE_MS`, does **one stage's
  bounded step** (≤ 3 discovery batches, or 1 possession analysis, or the ranking
  pass), persists a resumable `cursor` + heartbeat + safe progress + cost + model
  usage, and returns `{ done }`.
- `startGameAnalysis` (server action) creates the job and kicks the first tick
  via `after()`. Each non-terminal tick re-schedules the next via `after()`, so
  one click spawns a self-continuing chain that survives the browser closing.
- `getGameAnalysisJob` (the poll) re-kicks a chain whose worker died (deploy,
  crash, cold start). The per-tick lease means a window is never analysed twice.
- Ceilings: `JOB_WALL_CLOCK_MS` (whole run), `MAX_JOB_ATTEMPTS`, `MAX_*_CALLS`.
  Past a ceiling the job fails cleanly with a safe message.

**Production recommendation:** replace the `after()` chain with a real
background worker — a Modal function, a Supabase Edge Function on a cron, or a
queue consumer — claiming jobs with `SELECT ... FOR UPDATE SKIP LOCKED`, using
the exact same `cursor` contract. The tick functions are already
resume-safe and side-effect-idempotent per step, so only the driver changes.

## Data model

- `nextrep.coaching_profiles` — one row per coach (`owner_id` PK), `schema_version`,
  `answers` jsonb (`{ [questionId]: enumValue }`), `completed_at`. RLS:
  `owner_id = auth.uid()`.
- `nextrep.ai_game_analysis_jobs` — one durable run per `(game, jersey, colour)`
  while active (partial unique index). Status, stage, `cursor`, audit counters
  (spans, possessions, candidates, rejected, discovery/reasoning calls, tokens,
  estimated cost), heartbeat. RLS: `owner_id = auth.uid() AND owns_game(game_id)`.
- `nextrep.ai_candidate_reps` — the review queue, **separate from published
  `nextrep.reps`**. Full draft + `visible_evidence` / `basketball_inferences` /
  `coach_preference_basis` / `uncertainty` kept apart, confidences, `rank`,
  `status` (`pending_review` / `approved` / `edited` / `rejected` /
  `needs_attention`), `published_rep_id`. A `CHECK` enforces
  `clip_start < decision < clip_end`. RLS as above. A candidate becomes a
  published rep only through `buildSessionFromApproved`, which re-validates every
  rep against `validateRepDraft` and the real video duration before saving.

## Limits (`lib/ai/game-analysis/limits.ts`)

| Constant | Value | Purpose |
| --- | --- | --- |
| `MAX_GAME_SECONDS` | 3600 | Longer games are refused. |
| `DISCOVERY_SAMPLE_INTERVAL_SECONDS` | 12 | Stage A probe grid. |
| `DISCOVERY_BATCH_SIZE` | 12 | Frames per cheap call. |
| `MAX_DISCOVERY_CALLS` | 40 | Stage A ceiling. |
| `POSSESSION_WINDOW_SECONDS` / overlap | 18 / 4 | Stage B window shape. |
| `MAX_REASONING_CALLS` | 20 | Expensive-model ceiling per game. |
| `POSSESSION_FRAMES` / width | 14 / 852 | Frames per reasoning call. |
| `CANDIDATE_ID_CONFIDENCE_MIN` | 0.55 | Below → reject window. |
| `CANDIDATE_DECISION_CONFIDENCE_MIN` | 0.5 | Below → reject window. |
| `CANDIDATE_FLAG_CONFIDENCE` | 0.62 | Below → keep but `needs_attention`. |
| `MAX_CANDIDATES` | 12 | Hard cap on the review queue. |
| `JOB_STALE_MS` | 240000 | Lease TTL / stale-chain reclaim. |
| `JOB_WALL_CLOCK_MS` | 1200000 | Whole-analysis ceiling. |
| `MAX_JOB_ATTEMPTS` | 4 | Retry ceiling. |

Models: `OPENAI_DISCOVERY_MODEL` (default `gpt-5-nano`) for Stage A;
`OPENAI_REP_MODEL` (default `gpt-5.6-terra`) for Stage C/D/E. Cost is a labelled
**estimate** from `GAME_MODEL_PRICING`, recorded on the job, never shown in the
player UI.

## Which coaching answer influences which decision

`relevantPreferences(profile, decisionTags)` (`lib/coaching/profile.ts`) returns
an answer only when its `appliesTo` tags intersect the tags the analyzer derived
from the **visible** situation, and never for a `depends` answer. The model is
told to use only the ones the visible situation warrants and to report them.

| Question id | Side | Influences decision tags |
| --- | --- | --- |
| `pace` | offense | pace, transition-offense |
| `transition_priority` | offense | transition-offense, shot-selection |
| `shot_profile` | offense | shot-selection, late-clock |
| `paint_touch` | offense | paint-touch, drive-help |
| `drive_help` | offense | drive-help, paint-touch, spacing |
| `spacing` | offense | spacing, drive-help |
| `late_clock` | offense | late-clock, shot-selection |
| `offensive_rebound` | offense | offensive-rebound, transition-defense |
| `on_ball_pressure` | defense | on-ball-defense |
| `help_position` | defense | help-defense, closeout |
| `ball_screen_coverage` | defense | ball-screen-defense, switching |
| `switching` | defense | switching, ball-screen-defense |
| `closeout` | defense | closeout, help-defense |
| `transition_defense` | defense | transition-defense, defensive-rebound |
| `defensive_rebound` | defense | defensive-rebound, transition-defense |

Preferences influence only the **recommended choice wording, terminology, and
emphasis** in the draft — never player identification, whether a possession
happened, the visible evidence, the actual outcome, the timestamps, the factual
description, or the ranking.

## Privacy and safety

- OpenAI + Mux credentials are server-only; the client bundle contains neither
  the SDK nor any key (verified by build + bundle scan).
- Frames are fetched from Mux's public-playback thumbnail endpoint (no signing),
  base64'd in memory for the model call, and never persisted.
- No candidate is auto-published. `buildSessionFromApproved` requires explicit
  coach approval and re-validates every rep.
- All three tables enforce authenticated ownership via RLS; a signed-out or
  wrong-account caller sees nothing.
- Failures surface as safe messages; raw provider errors, prompts, tokens, and
  DB ids never reach the customer UI.
