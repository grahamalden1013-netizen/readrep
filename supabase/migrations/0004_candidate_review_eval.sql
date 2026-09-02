-- Human basketball-quality review of analysis candidates.
--
-- Adds evaluation fields to nextrep.ai_candidate_reps. These are the coach's
-- verdicts while reviewing; they never change the candidate's content
-- (timing, question, choices, evidence) and never publish anything.

alter table nextrep.ai_candidate_reps
  add column if not exists review_player_verdict text
    check (review_player_verdict in ('correct', 'wrong')),
  add column if not exists review_decision_verdict text
    check (review_decision_verdict in ('real', 'not-meaningful')),
  add column if not exists review_bad_pause boolean not null default false,
  add column if not exists review_notes text,
  add column if not exists reviewed_at timestamptz;
