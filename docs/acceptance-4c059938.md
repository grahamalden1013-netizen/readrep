# Acceptance baseline — game 4c059938, White #15

Full-coverage analysis run on **2026-09-01**. Every possession window processed
to a terminal state. Driven headless by `scripts/full-coverage-run.ts` against
the real Mux asset (`yqvyYqVLV1k1H2kvoqEtuFvZoVfvvIg8kf4nIfb2sQo`, 40:00),
using the production pipeline code (`lib/ai/game-analysis/*`).

## Method and its limits

- **References**: the harness cannot click a player, so it approximates the
  coach's confirmed crops with the scout's three strongest verified frames
  (7:57, 35:15, 18:09) plus their ±2/±4 s neighbours. Real coach crops would
  likely raise identification. This run is a **pipeline baseline, not a
  user-flow acceptance**.
- **Not done here** (needs a human): operating the browser, clicking the
  player, confirming each reference shows White #15 by eye, checking each clip
  against the film, and naming decision moments the system missed. Every
  vision-dependent proof below is left for the coach with the exact frame URL.
- The reasoning model, frame counts and confidence gates were **not changed**
  for this run.

## 1. Window coverage — 130 / 130 terminal ✓

`buildPossessionWindows` produced **130** windows over 10 live spans
(2 s … 39:38). The ledger has 130 entries, indices 0–129, **all unique** — no
window analysed twice. `retries` 0, `attempts > 1` on 0 windows, 0
`processing-failure`.

| Outcome | Count | Reasons |
| --- | --- | --- |
| valid-decision | 11 | candidate ×11 (0 flagged low-confidence) |
| target-not-visible | 70 | not visible ×70 |
| target-no-decision | 48 | no-decision ×48 |
| invalid-output | 1 | window 55 (18:02–18:20): a choice `id` longer than 8 chars failed the schema |
| processing-failure | 0 | — |

Claimed target sightings (`valid-decision` + `target-no-decision`) = **59**.

## 2. Every candidate concerns White #15 — NOT verified here

11 candidates, model `playerIdConfidence` 0.78–0.96. I cannot see the frames.
Coach check list (still at the decision pause):

| # | window | pause | title | id-conf |
| --- | --- | --- | --- | --- |
| 1 | 67 | 21:01 | Attack the Gap With a Help Read | 0.94 |
| 2 | 24 | 8:01 | High Ball Screen: Roll to the Rim | 0.96 |
| 3 | 33 | 9:59 | Transition attack: finish through the lane | 0.89 |
| 4 | 27 | 8:42 | Weak-Side Rim Rotation | 0.86 |
| 5 | 71 | 21:55 | Attack the Left-Side Closeout | 0.78 |
| 6 | 47 | 14:23 | Use the Screen, Then Find the Wing | 0.88 |
| 7 | 83 | 25:57 | High Screen: Roll Into Space | 0.94 |
| 8 | 25 | 8:06 | Roll to the Rim After the High Screen | 0.92 |
| 9 | 68 | 21:04 | Read the paint before committing the wing drive | 0.93 |
| 10 | 48 | 14:42 | Protect the Rim on the Late Drive | 0.84 |

Frame URLs are in `scratchpad/coverage-run.log` and the run output.

**Identification precision** = confirmed sightings ÷ 59 — the denominator is
known; the numerator needs the coach to review those 59 frames.

## 3. Every pause is before the visible decision — 1 defect found

`analyzePossession` re-derives and gates `clipStart < decision < clipEnd`, so
all 11 pass the ordering check. **But candidate #9 (window 68) has
`decisionSeconds == window.start` (21:04 exactly)** — the model placed the
pause on the first frame of the window, leaving no pre-decision context. That
candidate should be rejected or its clip re-cut. The other 10 sit 2.1–14.0 s
into their windows.

## 4. No duplicate moments — dedupe is leaking

`dedupeAndRank` merged 11 → 10 (window 35 collapsed). It did **not** catch three
near-adjacent pairs that look like the same possession seen through overlapping
windows:

- #2 (win 24, 8:01) and #8 (win 25, 8:06) — both "roll to the rim off a high screen"
- #6 (win 47, 14:23) and #10 (win 48, 14:42) — screen read vs. rim protection, 19 s apart
- #1 (win 67, 21:01) and #9 (win 68, 21:04) — both drive-help / paint reads

The dedupe key mixes in model-produced `decisionTags`, which differ slightly
between overlapping windows, so the buckets don't collapse. This needs a
timestamp-proximity merge (e.g. same skill within ~6 s ⇒ one moment).

## 5. Survives leaving and reopening — ✓

`scripts/full-coverage-run.ts` checkpoints
`scratchpad/coverage-cursor.json` after every window. Demonstrated:

1. `--reset --max 6` → windows 0–5, cursor at `possessionIndex 6`.
2. Manually rewound `possessionIndex` to 0, re-ran `--max 6` → output
   `+6 windows, 6 already-done skipped`; ledger indices 0–11, all unique.
3. The overnight run's host actually slept mid-call (~10 h wall gap); on kill +
   resume it continued from window 88 with the ledger intact (88 unique
   entries) and finished 130/130.

The durable Supabase job uses the identical cursor contract: `possessionIndex`
is monotonic, a covered index is skipped, and `getGameAnalysisJob` re-kicks a
stalled chain. The job is not marked `completed` until
`ledger.length === windows.length`.

## 6. Player session contains only coach-approved reps — ✓ (code-enforced)

`lib/actions/candidates.ts › buildSessionFromApproved` selects only
`status in ('approved','edited')`, re-runs `validateRepDraft` against the real
video duration, publishes those as `nextrep.reps`, then calls
`startSessionForGame`. A `pending_review` / `needs_attention` / `rejected`
candidate can never reach a session. Covered by
`test/ai-rep` + the rep publish gate tests.

## Run totals

| | |
| --- | --- |
| wall time (analysis loop) | 27.5 min (excludes the ~10 h the host was asleep) |
| reasoning calls | 130 |
| retries | 0 |
| tokens | 1,688,682 in / 170,854 out |
| estimated cost | ≈ $3.62 reasoning + ≈ $0.30 scout/discovery = **≈ $3.92** |
| model | `gpt-5.6-terra` (`OPENAI_REP_MODEL` unset → default) |

## Repair run (2026-09-01) — defects 1–3

`scripts/repair-run.ts` recomputes the queue from the persisted baseline data
(`scratchpad/coverage-cursor.json`) with **2 new model calls only** (windows 55
and 68).

| | |
| --- | --- |
| candidates before dedupe | 10 (11 baseline − 1 removed for context) |
| candidates after dedupe | **9** |
| merged | window **25 → 24** — "same possession — clips overlap 479–487 s, decisions 5.4 s apart" (this is the baseline #2/#8 pair) |
| rejected for insufficient-pre-decision-context | **1** — window 68 (baseline #9): reprocessed under the fixed pipeline it returns `target-not-visible`; the stored draft's pause sat on the window's first frame. Removed. |
| #1/#9 pair | resolved — #9 removed by defect 1, leaving #1 (window 67) alone |
| #6/#10 pair | resolved — kept **separate** (windows 47 & 48, 19 s apart, clips do not overlap; different possessions) |
| window 55 parses now | **yes** → `target-not-visible` (a real semantic outcome, not `invalid-output`). No valid decision was lost — the model reports #15 is not visible there. |
| repair-run cost | 2 model calls, 24,702 in / 2,014 out tokens ≈ **$0.05** + a few frame fetches |

Tests added (`test/game-analysis-pipeline.test.ts`, 141 total, all pass):
`mergeDuplicates` merges overlapping windows with inconsistent tags keeping the
clearer id; keeps close-but-non-overlapping decisions; resolves the three
baseline leak pairs; never merges well-spaced possessions; `classifyOutcome`
maps `insufficient-pre-decision-context` to `target-no-decision`; schema tests
updated for indexed choices.

### Final queue after repair (9 reps, still to be checked against the film)

| # | window | decision | lead | title | category | preview |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 67 | 21:01 | 7.0 s | Attack the Gap With a Help Read | help-recognition | `animated.webp?start=1254&end=1267` |
| 2 | 24 | 8:01 | 7.0 s | High Ball Screen: Roll to the Rim | pick-and-roll-read | `?start=474&end=487` |
| 3 | 33 | 9:59 | 7.0 s | Transition attack: finish through the lane | transition-decision | `?start=592&end=605` |
| 4 | 27 | 8:42 | 7.0 s | Weak-Side Rim Rotation | defensive-rotation | `?start=515&end=528` |
| 5 | 71 | 21:55 | 7.0 s | Attack the Left-Side Closeout | closeout-attack | `?start=1308&end=1321` |
| 6 | 47 | 14:23 | 7.0 s | Use the Screen, Then Find the Wing | pick-and-roll-read | `?start=856&end=869` |
| 7 | 83 | 25:57 | 7.0 s | High Screen: Roll Into Space | pick-and-roll-read | `?start=1550&end=1562` |
| 8 | 35 | 10:28 | 7.0 s | Drive Help, Then Kick Out | help-recognition | `?start=621&end=634` |
| 9 | 48 | 14:42 | 7.0 s | Protect the Rim on the Late Drive | defensive-rotation | `?start=875&end=886` |

(prefix: `https://image.mux.com/yqvyYqVLV1k1H2kvoqEtuFvZoVfvvIg8kf4nIfb2sQo/`)

Every entry now has 7.0 s of pre-decision context. The pipeline still needs a
manual film check for identification accuracy and candidate quality — **not
accepted on those axes.**

## game-analysis-v2 + independent verifier — validation of the nine baseline clips (2026-09-01)

Two-pass pipeline:

1. **Discovery** (`analyzePossession`, prompt `game-analysis-v2`) — temporal
   frames → the model returns a decision or `decision: false`.
2. **Deterministic gate** (`gate.ts › evaluatePossessionResult`) — every factual
   claim must land on a real supplied frame; `plausibleAlternatives` each need a
   frame timestamp at or before the pause; the committed action and its outcome
   each need a frame after the pause. An alternative that only asserts "visible
   evidence" with no locatable frame is dropped.
3. **Independent verifier** (`verify.ts › verifyDecision`) — a **separate** model
   call that receives the same frames + the proposed structured decision, is
   **not told to preserve it**, and answers five yes/no questions from the frames
   alone. Runs only for proposals that pass discovery + the gate.
4. **Accept** only when discovery + gate + verifier all pass. Any verifier
   disagreement → `needs_attention` (never published).

Rescored **without changing any window timestamp** (`scripts/rescore-9.ts`, 9
discovery calls, 0 verifier calls, **+$0.27**):

| win | title | discovery | gate | verifier | final |
| --- | --- | --- | --- | --- | --- |
| 67 | Attack the Gap With a Help Read | `decision:false` | `no-meaningful-decision` | not run | **reject** |
| 24 | High Ball Screen: Roll to the Rim | `decision:false` | `no-meaningful-decision` | not run | **reject** |
| 33 | Transition attack: finish through the lane | `decision:false` | `no-meaningful-decision` | not run | **reject** |
| 27 | Weak-Side Rim Rotation | `decision:false` | `no-meaningful-decision` | not run | **reject** |
| 71 | Attack the Left-Side Closeout | `decision:false` | `target-not-confidently-visible` | not run | **reject** |
| 47 | Use the Screen, Then Find the Wing | `decision:false` | `no-meaningful-decision` (target not materially involved) | not run | **reject** |
| 83 | High Screen: Roll Into Space | `decision:false` | `no-meaningful-decision` | not run | **reject** |
| 35 | Drive Help, Then Kick Out | `decision:false` | `no-meaningful-decision` | not run | **reject** |
| 48 | Protect the Rim on the Late Drive | `decision:false` | `no-meaningful-decision` | not run | **reject** |

**Accepted 0 / 9. needs_attention 0 / 9. Rejected 9 / 9.** The verifier never
ran because nothing reached it — discovery itself declined to call any of these a
decision. No surviving candidate ⇒ no timestamp-grounding table to produce (the
grounding format is proven by the gate unit tests and would be emitted per
survivor by `rescore-9.ts`).

**1 — 21:01 regression:** `test/fixtures/decision-21-01-response.json` is the
real captured v2 response for window 67 — `decision: false`,
`noDecisionReason: "no-meaningful-decision"`, `possessionSummary` describing a
dead-ball inbounds. `test/decision-gate-regression.test.ts` asserts it parses,
is rejected as `no-meaningful-decision`, and never yields a draft.

The nine seeded rows are `status = rejected` with these reasons; the review page
shows nothing to review and lists all nine as rejected with the v2 reason. The
130-window game has **not** been re-run under v2.

## Full-game game-analysis-v2 baseline (2026-09-02)

One clean versioned run — **`pipelineVersion: game-analysis-v2` on every ledger
entry**. Own resumable cursor (`scratchpad/v2-baseline-cursor.json`), **not** the
v1 ledger. Exactly-once (127 unique window indices, `possessionIndex` monotonic).
No threshold changes. `scripts/v2-baseline-run.ts`, hard $5 cost ceiling
(not reached).

| metric | value |
| --- | --- |
| total live-play windows | 127 (9 live spans, Stage A) |
| total windows processed | **127 / 127** — status COMPLETE |
| discovery decisions | **0** |
| discovery no-decisions | **127** |
| deterministic-gate passes / rejections | 0 / 127 |
| verifier passes / failures / disagreements | 0 / 0 / 0 (never ran — nothing reached it) |
| **FINAL accepted candidates** | **0** |
| **needs_attention candidates** | **0** |
| model calls | 152 (25 Stage A + 127 discovery + 0 verifier) |
| retries | 2 |
| tokens | 1,651,519 in / 120,429 out |
| total estimated cost | **$3.18** (ceiling $5) |
| wall time | ~3 h elapsed across restarts + host sleep; ~55 min of model time |

**Rejection-reason distribution — every window rejected at the discovery stage
(the model itself returned `decision: false`):**

| n | stage · reason |
| --- | --- |
| 54 | discovery · no-meaningful-decision |
| 29 | discovery · target-not-confidently-identified |
| 17 | discovery · target-not-materially-involved |
| 14 | discovery · target-not-visible |
| 4 | discovery · target-not-confidently-tracked |
| 3 | discovery · no-clear-target-commitment |
| 6 | discovery · other (no-committed-action, dead-ball-in-window, tracking variants) |

**Zero candidates survived. Reported honestly — the system was not tuned.**
No window in the 40-minute game contained a decision the model would assert
that also survived grounding + verification, with these scout-derived
reference frames.

All nine negative regression fixtures still fail (`test/v2-negative-regression.test.ts`
+ `test/decision-gate-regression.test.ts`, 13 tests, green).

The v2 result is persisted as job `a0000000-…-0000000e7a20`
(`prompt_version = game-analysis-v2`, `status = completed`, `candidate_count = 0`,
`rejected_count = 127`). It is the latest analysis for the game, so the review
page shows the v2 baseline: nothing to review, 0 approved.

## Baseline conclusions (do not "fix" before this is agreed)

- Coverage, resumability, exactly-once, terminal-state accounting, and the
  approved-only session gate **hold**.
- Yield on this game/player with proxy references: **11 raw / 10 ranked
  candidates from 130 windows**; ~54 % of windows can't identify #15 at all,
  which is expected without real coach crops.
- Known defects to address after sign-off: (a) one pause at window start,
  (b) overlapping-window duplicates surviving dedupe, (c) one decision lost to
  the 8-char `choice.id` limit.
