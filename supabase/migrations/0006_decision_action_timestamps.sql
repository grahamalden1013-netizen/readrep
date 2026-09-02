-- Timestamp-grounding for accepted candidates (game-analysis prompt v2 + verifier).
--
-- Every factual claim in a candidate is now pinned to a frame time. These hold
-- when the committed action and its outcome are visible (seconds into the game).
-- plausible_alternatives already carries an `atSeconds` per entry.

alter table nextrep.ai_candidate_reps
  add column if not exists actual_action_seconds   double precision,
  add column if not exists visible_outcome_seconds double precision,
  add column if not exists verifier_verdict        jsonb;
