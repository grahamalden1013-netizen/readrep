import type { DebateOutcome } from "@/types/ngn";

/**
 * Standard Elo, tuned for a student audience.
 *
 * K falls as a student plays more debates: early results should move the
 * rating quickly to find the right level, later results should be stable so a
 * single bad night does not undo a semester.
 */
export function kFactorFor(debatesCompleted: number, rating: number): number {
  if (debatesCompleted < 10) return 40;
  if (rating >= 2100) return 16;
  if (debatesCompleted < 30) return 28;
  return 20;
}

/** Probability that `rating` beats `opponentRating`. */
export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

function outcomeValue(outcome: DebateOutcome): number {
  if (outcome === "win") return 1;
  if (outcome === "draw") return 0.5;
  return 0;
}

export type RatingUpdate = {
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  opponentRatingBefore: number;
  opponentRatingAfter: number;
  opponentDelta: number;
  expected: number;
};

export function applyElo({
  rating,
  opponentRating,
  outcome,
  debatesCompleted,
}: {
  rating: number;
  opponentRating: number;
  outcome: DebateOutcome;
  debatesCompleted: number;
}): RatingUpdate {
  const expected = expectedScore(rating, opponentRating);
  const actual = outcomeValue(outcome);
  const k = kFactorFor(debatesCompleted, rating);

  const delta = Math.round(k * (actual - expected));
  // The opponent's K is derived from their own rating; demo opponents are
  // treated as established players.
  const opponentK = kFactorFor(30, opponentRating);
  const opponentDelta = Math.round(opponentK * (1 - actual - (1 - expected)));

  // A floor keeps a struggling student from spiralling out of the ladder.
  const ratingAfter = Math.max(100, rating + delta);

  return {
    ratingBefore: rating,
    ratingAfter,
    delta: ratingAfter - rating,
    opponentRatingBefore: opponentRating,
    opponentRatingAfter: Math.max(100, opponentRating + opponentDelta),
    opponentDelta,
    expected,
  };
}

/**
 * An "underdog win" is a win against an opponent the model expected to lose to.
 * Used for badge progress.
 */
export function isUnderdogWin(expected: number, outcome: DebateOutcome): boolean {
  return outcome === "win" && expected < 0.4;
}
