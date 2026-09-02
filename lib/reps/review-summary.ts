import type { CandidateRepRow } from "@/lib/db/game-analysis";

export type ReviewSummary = {
  total: number;
  evaluated: number;
  correctPlayerRate: number | null;
  meaningfulDecisionRate: number | null;
  goodPauseRate: number | null;
  approved: number;
  rejected: { title: string; rank: number | null; reason: string | null }[];
};

const rate = (num: number, den: number) => (den === 0 ? null : Math.round((num / den) * 100) / 100);

/**
 * The human-review scorecard. All rates are over the candidates actually judged
 * on that axis, so an unreviewed queue reads "—" rather than 0%.
 */
export function summariseReview(rows: CandidateRepRow[]): ReviewSummary {
  const nonRejected = rows.filter((r) => r.status !== "rejected");
  const playerJudged = nonRejected.filter((r) => r.reviewPlayerVerdict);
  const decisionJudged = nonRejected.filter((r) => r.reviewDecisionVerdict);
  const pauseJudged = nonRejected.filter(
    (r) => r.reviewPlayerVerdict || r.reviewDecisionVerdict || r.reviewBadPause,
  );
  return {
    total: nonRejected.length,
    evaluated: nonRejected.filter(
      (r) => r.reviewPlayerVerdict || r.reviewDecisionVerdict || r.reviewBadPause || r.reviewNotes,
    ).length,
    correctPlayerRate: rate(
      playerJudged.filter((r) => r.reviewPlayerVerdict === "correct").length,
      playerJudged.length,
    ),
    meaningfulDecisionRate: rate(
      decisionJudged.filter((r) => r.reviewDecisionVerdict === "real").length,
      decisionJudged.length,
    ),
    goodPauseRate: rate(pauseJudged.filter((r) => !r.reviewBadPause).length, pauseJudged.length),
    approved: rows.filter((r) => r.status === "approved" || r.status === "edited").length,
    rejected: rows
      .filter((r) => r.status === "rejected")
      .map((r) => ({ title: r.title ?? "Decision moment", rank: r.rank, reason: r.rejectionReason })),
  };
}
