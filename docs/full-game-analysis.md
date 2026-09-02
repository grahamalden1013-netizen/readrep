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
| Confirm a player | `/games/[id]/analysis` | See "Player confirmation" below — a scan for real sightings, a click on the player in each, and Yes / No / Not clear. Produces 2–3 crop-backed references. |
| Analyze game | `/games/[id]/analysis` | Creates one durable job. Calm honest stages. Safe to leave the page. |
| Review the queue | `/games/[id]/review` | One candidate at a time: clip → pause at the decision → draft question + reveal → Approve / Edit / Reject. "Why this moment?" is collapsed. |
| Player session | `/sessions/[id]` | Approved candidates are published as reps and the player gets the normal calm decision session. |
| Manual fallback | `/games/[id]/advanced` | The clip studio, kept available. Never the default post-upload destination. |

## Player confirmation (`scout.ts` + `components/analysis/player-confirm.tsx`)

Analysis will not start until the coach has confirmed the player on real footage.
The page shows nothing but "Is this your player?" — no models, prompts, stages,
or confidence numbers.

1. **Scan** (`scoutTeamColorCandidates`). A coarse grid across the game (edges
   trimmed by `SCOUT_EDGE_TRIM_SECONDS` so the intro/wrap-up never appears).
   `gpt-5-nano`, `reasoning: minimal`, low-res batches: which frames are live
   basketball with a player in the target colour. Studio, commercials, replays,
   timeouts, bench and dead-ball frames are dropped. Nearby sightings cluster.
2. **Verify** (`verifyBatch`). The shortlisted clusters — and only those — go to
   `gpt-5-mini` at high detail on ~900px stills: is a target-colour player really
   present and *prominent* (not background), and does a number read? Clusters
   that fail are discarded. This is what makes a candidate "team colour visible",
   not a nano guess. In a real 40-min run this cut 60 nano hits to 18.
3. **Confirm.** Each surviving moment is shown as a looping 3–5s preview
   (`animated.webp`) plus a still. The coach **clicks the player**; the browser
   crops a box around the click off the CORS-open Mux image and stores the crop,
   the normalized point + box, the timestamp, the jersey colour, and whether the
   number was readable there — then answers **Yes, I can read #N / Yes, number
   not visible / No / Not clear**.
4. **Gate** (`confirmedReferenceSetSchema`). "Analyze game" unlocks only with
   `MIN_CONFIRMED_REFERENCES`–`MAX_CONFIRMED_REFERENCES` confirmations **and at
   least one where the number was readable** — the app never proceeds on an
   identity the jersey number never visibly supported.
5. **Follow.** The worker feeds the analyzer each crop plus its source frame and
   ~±2s neighbours as references, and tells it to learn the player's colour,
   build, hair, sleeves and number from them and track that same player through
   visual continuity — *not* the number alone, which is often turned away.

> The scan currently runs inside the `scoutPlayerCandidates` server action
> (~2–3 min). For production it should become a durable job like the analysis
> itself; the function is already pure and side-effect free.

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
> **Prompt v2 (`game-analysis-v2`).** Decision discovery was rebuilt around a
> strict definition: a valid moment needs a confidently-identified, materially
> involved target who, at a precise instant, faces **≥ 2 plausible actions each
> supported by VISIBLE court geometry** (not generic basketball knowledge),
> commits to one, and whose action + immediate outcome are visible after the
> pause. The model is told `decision: false` is the expected answer for routine
> basketball and must never infer a decision from a catch or manufacture weak
> choices. The deterministic gate lives in **`gate.ts`**
> (`evaluatePossessionResult`, unit-tested against
> `test/fixtures/decision-21-01-response.json`); rejections carry
> `no-meaningful-decision` / `outcome-not-visible` / `target-not-visible` /
> `insufficient-pre-decision-context`. New per-candidate fields:
> `possessionSummary`, `actualAction`, `plausibleAlternatives` +
> `visibleEvidenceForEachAlternative`, `whyThisIsNotRoutine`,
> `whyThePauseIsBeforeCommitment` (migration `0005`).

- **Stage C/D/E — `possession.ts` + `prompt.ts` + `schema.ts` + `gate.ts`.** For each window
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
