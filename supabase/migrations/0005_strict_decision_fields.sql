-- Strict-decision evidence for accepted candidates (game-analysis prompt v2).
--
-- The frame-grounded justification a candidate must carry: what the possession
-- was, which action the target committed to, and the visible evidence for each
-- plausible alternative. Existing columns already hold the rest
-- (visible_evidence = targetEvidence, outcome = visibleOutcome).

alter table nextrep.ai_candidate_reps
  add column if not exists possession_summary       text,
  add column if not exists actual_action            text,
  add column if not exists plausible_alternatives   jsonb not null default '[]'::jsonb,
  add column if not exists why_not_routine          text,
  add column if not exists why_pause_before_commit  text;
