/**
 * Text analysis used by the local (no-API-key) implementations of the judge.
 *
 * These heuristics are deliberately about *construction*, never about content:
 * nothing here can tell what political position a passage takes, which is what
 * keeps the fallback judge as neutral as the model-backed one.
 */

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this",
  "these", "those", "is", "are", "was", "were", "be", "been", "being", "to",
  "of", "in", "on", "for", "with", "as", "by", "at", "from", "it", "its", "we",
  "you", "your", "they", "them", "their", "i", "my", "me", "he", "she", "his",
  "her", "not", "no", "do", "does", "did", "have", "has", "had", "will",
  "would", "can", "could", "should", "may", "might", "must", "so", "there",
  "here", "what", "which", "who", "when", "where", "how", "why", "all", "any",
  "more", "most", "some", "such", "only", "own", "same", "too", "very", "just",
  "about", "also", "into", "over", "up", "out", "one", "our", "us", "because",
]);

/* -------------------------------------------------------------------------- */
/* Tokenising                                                                  */
/* -------------------------------------------------------------------------- */

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

export function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
}

export function contentWords(text: string): string[] {
  return words(text).filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

/** Share of `b`'s distinctive vocabulary that also appears in `a`. */
export function termOverlap(a: string, b: string): number {
  const target = new Set(contentWords(b));
  if (target.size === 0) return 0;
  const source = new Set(contentWords(a));
  let hits = 0;
  for (const term of target) if (source.has(term)) hits += 1;
  return hits / target.size;
}

/* -------------------------------------------------------------------------- */
/* Marker vocabularies                                                         */
/* -------------------------------------------------------------------------- */

const EVIDENCE_MARKERS = [
  "according to", "study", "studies", "data", "report", "survey", "census",
  "research", "statistics", "found that", "showed that", "cbo", "gao",
  "bureau", "department of", "supreme court", "analysis", "researchers",
  "published", "measured", "estimate",
];

const REASONING_MARKERS = [
  "because", "therefore", "which means", "as a result", "consequently",
  "this shows", "the reason", "if ", "then ", "leads to", "follows that",
  "in other words", "for example", "for instance", "suggests that",
];

const REBUTTAL_MARKERS = [
  "you argued", "you claimed", "your argument", "you said", "my opponent",
  "the claim that", "you point to", "in response", "however", "but this",
  "that reasoning", "this does not", "even if", "you're right that",
  "you are right that", "granting that",
];

const STEELMAN_MARKERS = [
  "the strongest", "i understand why", "fair point", "you're right that",
  "you are right that", "i can see why", "the best case for", "concede",
  "to be fair", "genuinely", "legitimate concern", "reasonable to",
  "i agree that", "worth taking seriously",
];

const INCIVILITY_MARKERS = [
  "stupid", "idiot", "idiotic", "moron", "dumb", "clueless", "brainwashed",
  "sheep", "shut up", "pathetic", "ridiculous person", "you people",
  "libtard", "fascist", "nazi", "commie", "snowflake", "delusional",
  "lying", "liar", "propaganda", "obviously wrong",
];

const HEDGE_MARKERS = [
  "may", "might", "could", "suggests", "appears", "tends to", "in some cases",
  "often", "generally",
];

const ABSOLUTE_MARKERS = [
  "always", "never", "everyone", "no one", "nobody", "all of them",
  "completely", "totally", "obviously", "clearly everyone", "any rational",
];

function countMarkers(text: string, markers: string[]): number {
  const lower = text.toLowerCase();
  return markers.reduce(
    (total, marker) => total + (lower.includes(marker) ? 1 : 0),
    0,
  );
}

export function hasNumericClaim(text: string): boolean {
  return /\b\d[\d,.]*\s*(%|percent|million|billion|thousand|dollars|\$)|\$\s?\d/i.test(
    text,
  );
}

export function hasCitation(text: string): boolean {
  return (
    /https?:\/\//i.test(text) ||
    countMarkers(text, EVIDENCE_MARKERS) > 0
  );
}

export function incivilityHits(text: string): string[] {
  const lower = text.toLowerCase();
  return INCIVILITY_MARKERS.filter((m) => lower.includes(m));
}

/* -------------------------------------------------------------------------- */
/* Sub-scores                                                                  */
/* -------------------------------------------------------------------------- */

/** Clamp into the 0–100 band and round. */
export function band(value: number, min = 8, max = 98): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}

/**
 * Length is a prerequisite, not a virtue: below the floor a response cannot
 * have done the work, above the ceiling extra words stop earning credit.
 */
export function lengthFactor(text: string, target: number): number {
  const count = words(text).length;
  if (count === 0) return 0;
  if (count >= target) return 1;
  return Math.max(0.15, count / target);
}

export function evidenceScore(text: string, evidenceCount: number): number {
  const markers = countMarkers(text, EVIDENCE_MARKERS);
  const numbers = hasNumericClaim(text) ? 1 : 0;
  const links = (text.match(/https?:\/\//g) ?? []).length;

  const base =
    32 +
    Math.min(30, markers * 11) +
    numbers * 12 +
    Math.min(16, links * 8) +
    Math.min(22, evidenceCount * 11);

  return band(base * (0.55 + 0.45 * lengthFactor(text, 90)));
}

export function reasoningScore(text: string): number {
  const markers = countMarkers(text, REASONING_MARKERS);
  const parts = sentences(text);
  // A single undifferentiated block is usually assertion, not argument.
  const structure = parts.length >= 3 ? 12 : parts.length === 2 ? 6 : 0;
  const absolutes = countMarkers(text, ABSOLUTE_MARKERS);

  const base = 36 + Math.min(34, markers * 9) + structure - absolutes * 5;
  return band(base * (0.5 + 0.5 * lengthFactor(text, 110)));
}

export function rebuttalScore(
  text: string,
  opponentText: string,
  isRebuttalRound: boolean,
): number {
  if (!isRebuttalRound) {
    // Opening rounds are not graded on rebuttal; score the anticipation of
    // objections instead so the category is never a dead 0.
    const anticipates = countMarkers(text, ["some argue", "critics", "opponents", "one objection"]);
    return band(48 + anticipates * 12);
  }

  const markers = countMarkers(text, REBUTTAL_MARKERS);
  const overlap = termOverlap(text, opponentText);

  const base = 26 + Math.min(30, markers * 10) + overlap * 46;
  return band(base * (0.55 + 0.45 * lengthFactor(text, 100)));
}

export function clarityScore(text: string): number {
  const parts = sentences(text);
  if (parts.length === 0) return 12;

  const lengths = parts.map((s) => words(s).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  // Very long sentences cost clarity; very short ones read as fragments.
  const lengthPenalty = mean > 32 ? (mean - 32) * 1.6 : mean < 8 ? (8 - mean) * 2.2 : 0;
  const variety =
    new Set(contentWords(text)).size / Math.max(1, contentWords(text).length);

  const base = 66 + variety * 26 - lengthPenalty;
  return band(base * (0.6 + 0.4 * lengthFactor(text, 70)));
}

export function opponentUnderstandingScore(
  text: string,
  opponentText: string,
): number {
  const steelman = countMarkers(text, STEELMAN_MARKERS);
  const overlap = termOverlap(text, opponentText);
  const strawman = countMarkers(text, ABSOLUTE_MARKERS);

  const base = 30 + Math.min(30, steelman * 13) + overlap * 40 - strawman * 6;
  return band(base * (0.55 + 0.45 * lengthFactor(text, 100)));
}

export function civilityScore(text: string): number {
  const hits = incivilityHits(text).length;
  const hedges = countMarkers(text, HEDGE_MARKERS);
  const absolutes = countMarkers(text, ABSOLUTE_MARKERS);

  if (hits > 0) return band(58 - hits * 16, 5, 70);
  return band(88 + Math.min(10, hedges * 3) - absolutes * 4, 40, 100);
}

/* -------------------------------------------------------------------------- */
/* Passage selection for feedback                                              */
/* -------------------------------------------------------------------------- */

/** Score a single sentence on the same construction signals, for feedback. */
function sentenceStrength(sentence: string, opponentText: string): number {
  return (
    countMarkers(sentence, EVIDENCE_MARKERS) * 3 +
    countMarkers(sentence, REASONING_MARKERS) * 2 +
    countMarkers(sentence, STEELMAN_MARKERS) * 3 +
    (hasNumericClaim(sentence) ? 2 : 0) +
    termOverlap(sentence, opponentText) * 4 -
    countMarkers(sentence, ABSOLUTE_MARKERS) * 3 -
    incivilityHits(sentence).length * 6
  );
}

export function strongestSentence(text: string, opponentText: string): string | null {
  const parts = sentences(text);
  if (parts.length === 0) return null;
  return parts.reduce((best, s) =>
    sentenceStrength(s, opponentText) > sentenceStrength(best, opponentText) ? s : best,
  );
}

export function weakestSentence(text: string, opponentText: string): string | null {
  const parts = sentences(text);
  if (parts.length < 2) return null;
  return parts.reduce((worst, s) =>
    sentenceStrength(s, opponentText) < sentenceStrength(worst, opponentText) ? s : worst,
  );
}

/** Sentences making a factual or causal claim with nothing behind it. */
export function unsupportedClaims(text: string): string[] {
  return sentences(text)
    .filter((s) => {
      const asserts =
        hasNumericClaim(s) ||
        countMarkers(s, ABSOLUTE_MARKERS) > 0 ||
        /\b(causes?|caused|proves?|proven|will lead to|results? in)\b/i.test(s);
      return asserts && !hasCitation(s);
    })
    .slice(0, 3);
}

/** Distinctive points the opponent raised that the student never touched. */
export function missedCounterarguments(
  text: string,
  opponentText: string,
): string[] {
  const answered = new Set(contentWords(text));
  return sentences(opponentText)
    .filter((s) => {
      const key = contentWords(s);
      if (key.length < 4) return false;
      const covered = key.filter((w) => answered.has(w)).length / key.length;
      return covered < 0.3;
    })
    .slice(0, 2);
}

/** Trim a passage to something quotable inside a feedback card. */
export function quote(passage: string | null, limit = 150): string {
  if (!passage) return "";
  const clean = passage.trim().replace(/\s+/g, " ");
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1).trimEnd()}…`;
}
