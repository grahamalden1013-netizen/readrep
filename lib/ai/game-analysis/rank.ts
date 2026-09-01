import type { CandidateDraft } from "./possession";
import { MAX_CANDIDATES } from "./limits";

export type RankedCandidate = CandidateDraft & { rank: number; dedupeKey: string; score: number };

/** Bucket a decision so near-identical teaching moments collapse together. */
function dedupeKey(c: CandidateDraft): string {
  const cat = c.skillCategory ?? "uncategorised";
  const tags = [...c.decisionTags].map((t) => t.toLowerCase()).sort().slice(0, 2).join("+");
  return `${cat}:${tags || "general"}`;
}

/**
 * A weighted teaching-value score. Every input is already visible-evidence based
 * — the coach profile is not part of the score, only whether a real decision was
 * found and how clearly.
 */
function score(c: CandidateDraft): number {
  const alternatives = Math.min(1, (c.answerChoices.length - 1) / 3); // 2..4 -> .33..1
  const outcomeVisible = c.outcome && !/not clear|cannot|unknown/i.test(c.outcome) ? 1 : 0.6;
  const evidence = Math.min(1, c.visibleEvidence.length / 4);
  return (
    0.3 * c.playerIdConfidence +
    0.25 * c.decisionConfidence +
    0.2 * c.teachingValue +
    0.1 * alternatives +
    0.1 * outcomeVisible +
    0.05 * evidence
  );
}

/**
 * Stage F. Deduplicate to one candidate per teaching bucket (keeping the
 * strongest), then rank by score with a light variety bonus so the queue is not
 * five of the same read. Caps at MAX_CANDIDATES.
 */
export function dedupeAndRank(candidates: CandidateDraft[]): RankedCandidate[] {
  const scored = candidates
    .map((c) => ({ ...c, score: score(c), dedupeKey: dedupeKey(c), rank: 0 }))
    .sort((a, b) => b.score - a.score);

  const bestPerBucket = new Map<string, RankedCandidate>();
  for (const c of scored) {
    const existing = bestPerBucket.get(c.dedupeKey);
    if (!existing || c.score > existing.score) bestPerBucket.set(c.dedupeKey, c);
  }

  // Interleave buckets so the first few reps are varied.
  const buckets = [...bestPerBucket.values()].sort((a, b) => b.score - a.score);
  const seenCat = new Set<string>();
  const front: RankedCandidate[] = [];
  const rest: RankedCandidate[] = [];
  for (const c of buckets) {
    const cat = c.skillCategory ?? c.dedupeKey;
    if (!seenCat.has(cat)) {
      seenCat.add(cat);
      front.push(c);
    } else {
      rest.push(c);
    }
  }
  const ordered = [...front, ...rest.sort((a, b) => b.score - a.score)].slice(0, MAX_CANDIDATES);
  return ordered.map((c, i) => ({ ...c, rank: i + 1 }));
}
