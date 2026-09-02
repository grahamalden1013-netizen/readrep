import type { CandidateDraft } from "./possession";
import { DUPLICATE_DECISION_GAP_SECONDS } from "./limits";

/**
 * Timestamp-based duplicate merging.
 *
 * Overlapping possession windows describe the SAME basketball decision with
 * different titles, categories and model tags, so a tag/category bucket can't
 * see the duplicate. This groups candidates by temporal proximity, then only
 * merges a group when the clips actually overlap in time — two decisions that
 * merely occur close together (no clip overlap) are kept separate.
 */

export type MergeRecord = {
  /** Index (into the input array) of the survivor. */
  kept: number;
  /** Indices folded into the survivor. */
  merged: number[];
  reason: string;
};

function clipsOverlap(a: CandidateDraft, b: CandidateDraft): number {
  const start = Math.max(a.clipStartSeconds, b.clipStartSeconds);
  const end = Math.min(a.clipEndSeconds, b.clipEndSeconds);
  return end - start; // > 0 means they overlap
}

/** Same basketball decision? Requires temporal proximity AND clip overlap. */
function sameDecision(a: CandidateDraft, b: CandidateDraft): { same: boolean; reason: string } {
  const gap = Math.abs(a.decisionSeconds - b.decisionSeconds);
  if (gap > DUPLICATE_DECISION_GAP_SECONDS) {
    return { same: false, reason: `decisions ${gap.toFixed(1)}s apart (> ${DUPLICATE_DECISION_GAP_SECONDS}s)` };
  }
  const overlap = clipsOverlap(a, b);
  if (overlap <= 0) {
    return { same: false, reason: `decisions ${gap.toFixed(1)}s apart but clips do not overlap` };
  }
  const os = Math.max(a.clipStartSeconds, b.clipStartSeconds);
  const oe = Math.min(a.clipEndSeconds, b.clipEndSeconds);
  return {
    same: true,
    reason: `same possession — clips overlap ${os.toFixed(0)}..${oe.toFixed(0)}s, decisions ${gap.toFixed(1)}s apart`,
  };
}

/**
 * The tiebreaker ladder for which candidate in a duplicate group to keep:
 *  a. clearer target identification
 *  b. more pre-decision context
 *  c. more precise pause point (decision confidence as the proxy)
 *  d. stronger visible evidence
 *  e. clearer answer choices
 * Returns > 0 when `a` is stronger than `b`.
 */
export function strongerBy(a: CandidateDraft, b: CandidateDraft): number {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const ladder: number[] = [
    round2(a.playerIdConfidence) - round2(b.playerIdConfidence),
    a.decisionSeconds - a.clipStartSeconds - (b.decisionSeconds - b.clipStartSeconds),
    round2(a.decisionConfidence) - round2(b.decisionConfidence),
    a.visibleEvidence.length - b.visibleEvidence.length,
    a.answerChoices.length - b.answerChoices.length,
    a.answerChoices.reduce((s, c) => s + c.text.length, 0) - b.answerChoices.reduce((s, c) => s + c.text.length, 0),
  ];
  for (const d of ladder) if (Math.abs(d) > 1e-6) return d;
  return a.decisionSeconds - b.decisionSeconds; // stable: earlier wins
}

export function mergeDuplicates(candidates: CandidateDraft[]): {
  kept: CandidateDraft[];
  merges: MergeRecord[];
} {
  const n = candidates.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const reasons = new Map<string, string>();

  const order = [...candidates.keys()].sort((i, j) => candidates[i].decisionSeconds - candidates[j].decisionSeconds);
  for (let p = 0; p < order.length; p += 1) {
    for (let q = p + 1; q < order.length; q += 1) {
      const i = order[p];
      const j = order[q];
      if (candidates[j].decisionSeconds - candidates[i].decisionSeconds > DUPLICATE_DECISION_GAP_SECONDS) break;
      const verdict = sameDecision(candidates[i], candidates[j]);
      if (verdict.same) {
        parent[find(i)] = find(j);
        reasons.set([i, j].sort((a, b) => a - b).join(","), verdict.reason);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i += 1) {
    const root = find(i);
    (groups.get(root) ?? groups.set(root, []).get(root)!).push(i);
  }

  const kept: CandidateDraft[] = [];
  const merges: MergeRecord[] = [];
  for (const members of groups.values()) {
    if (members.length === 1) {
      kept.push(candidates[members[0]]);
      continue;
    }
    const winner = members.reduce((best, i) => (strongerBy(candidates[i], candidates[best]) > 0 ? i : best), members[0]);
    kept.push(candidates[winner]);
    const merged = members.filter((i) => i !== winner);
    const reason =
      merged
        .map((m) => reasons.get([Math.min(winner, m), Math.max(winner, m)].join(",")))
        .find(Boolean) ?? "overlapping windows describe the same possession";
    merges.push({ kept: winner, merged, reason });
  }

  // preserve chronological order in the output
  kept.sort((a, b) => a.decisionSeconds - b.decisionSeconds);
  return { kept, merges };
}
