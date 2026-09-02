import type { CandidateDraft } from "./possession";
import { MAX_CANDIDATES } from "./limits";
import { mergeDuplicates, type MergeRecord } from "./merge";

export type RankedCandidate = CandidateDraft & { rank: number; dedupeKey: string; score: number };

/** Only used to interleave the queue for variety — never to drop a candidate. */
function varietyKey(c: CandidateDraft): string {
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
 * Stage F. Merge windows that describe the same basketball decision
 * (timestamp + clip overlap, see {@link mergeDuplicates}), then rank by score
 * with a light variety bonus so the queue is not five of the same read.
 * Caps at MAX_CANDIDATES. Also returns the merge records.
 */
export function rankWithMergeReport(candidates: CandidateDraft[]): {
  ranked: RankedCandidate[];
  merges: MergeRecord[];
} {
  const { kept, merges } = mergeDuplicates(candidates);

  const scored = kept
    .map((c) => ({ ...c, score: score(c), dedupeKey: varietyKey(c), rank: 0 }))
    .sort((a, b) => b.score - a.score);

  // Interleave distinct skill categories into the front so the first few reps vary.
  const seenCat = new Set<string>();
  const front: RankedCandidate[] = [];
  const rest: RankedCandidate[] = [];
  for (const c of scored) {
    const cat = c.skillCategory ?? c.dedupeKey;
    if (!seenCat.has(cat)) {
      seenCat.add(cat);
      front.push(c);
    } else {
      rest.push(c);
    }
  }
  const ordered = [...front, ...rest].slice(0, MAX_CANDIDATES);
  return { ranked: ordered.map((c, i) => ({ ...c, rank: i + 1 })), merges };
}

/** Back-compat: the ranked queue only. */
export function dedupeAndRank(candidates: CandidateDraft[]): RankedCandidate[] {
  return rankWithMergeReport(candidates).ranked;
}
