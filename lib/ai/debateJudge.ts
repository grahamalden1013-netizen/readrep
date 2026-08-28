import type {
  CategoryScores,
  EvidenceItem,
  JudgeFeedback,
  RoundEntry,
} from "@/types/ngn";
import { JUDGE_CONTRACT } from "./neutrality";
import { generateJSON, isAIConfigured } from "./provider";
import * as T from "./text";

/**
 * Category weights. Understanding your opponent is worth as much as evidence:
 * that is the product's whole thesis expressed as arithmetic.
 */
export const SCORE_WEIGHTS: CategoryScores = {
  evidence: 0.2,
  reasoning: 0.25,
  rebuttal: 0.2,
  clarity: 0.1,
  opponentUnderstanding: 0.2,
  civility: 0.05,
};

export function weightedOverall(categories: CategoryScores): number {
  const total = (Object.keys(SCORE_WEIGHTS) as (keyof CategoryScores)[]).reduce(
    (sum, key) => sum + categories[key] * SCORE_WEIGHTS[key],
    0,
  );
  return Math.round(total);
}

export type JudgeInput = {
  topic: string;
  question: string;
  /** Which side this transcript argued — recorded for context, never scored. */
  position: "support" | "oppose";
  rounds: RoundEntry[];
  evidence: EvidenceItem[];
};

/* ==========================================================================
   Model-backed judge
   ========================================================================== */

const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    evidence: { type: "integer", minimum: 0, maximum: 100 },
    reasoning: { type: "integer", minimum: 0, maximum: 100 },
    rebuttal: { type: "integer", minimum: 0, maximum: 100 },
    clarity: { type: "integer", minimum: 0, maximum: 100 },
    opponentUnderstanding: { type: "integer", minimum: 0, maximum: 100 },
    civility: { type: "integer", minimum: 0, maximum: 100 },
    strongestMoment: { type: "string" },
    weakestMoment: { type: "string" },
    improvement: { type: "string" },
    unsupportedClaims: { type: "array", items: { type: "string" }, maxItems: 3 },
    missedCounterarguments: {
      type: "array",
      items: { type: "string" },
      maxItems: 2,
    },
    summary: { type: "string" },
  },
  required: [
    "evidence",
    "reasoning",
    "rebuttal",
    "clarity",
    "opponentUnderstanding",
    "civility",
    "strongestMoment",
    "weakestMoment",
    "improvement",
    "unsupportedClaims",
    "missedCounterarguments",
    "summary",
  ],
  additionalProperties: false,
} as const;

type JudgeModelOutput = CategoryScores & {
  strongestMoment: string;
  weakestMoment: string;
  improvement: string;
  unsupportedClaims: string[];
  missedCounterarguments: string[];
  summary: string;
};

function transcript(input: JudgeInput): string {
  const rounds = input.rounds
    .map(
      (round) =>
        `--- Round ${round.roundIndex + 1} (${round.type}) ---\n` +
        `STUDENT UNDER EVALUATION wrote:\n${round.userText || "(no response submitted)"}\n\n` +
        `OPPONENT wrote:\n${round.opponentText || "(no response submitted)"}`,
    )
    .join("\n\n");

  const evidence = input.evidence.length
    ? input.evidence
        .map(
          (e) =>
            `- ${e.publisher} — "${e.title}" (${e.url})\n  Quote: ${e.quote}\n  Student's note: ${e.note}`,
        )
        .join("\n")
    : "(none attached)";

  return `Debate question: ${input.question}

The student under evaluation argued the "${input.position}" side. This was assigned by the platform and must not affect any score.

TRANSCRIPT
${rounds}

EVIDENCE THE STUDENT ATTACHED
${evidence}

Evaluate ONLY the student under evaluation. Quote their actual words in strongestMoment and weakestMoment. Keep summary to two sentences. Keep improvement to one specific, actionable sentence.`;
}

/* ==========================================================================
   Local judge (no API key)
   ========================================================================== */

function localJudge(input: JudgeInput): JudgeFeedback {
  const userText = input.rounds.map((r) => r.userText).join("\n\n");
  const opponentText = input.rounds.map((r) => r.opponentText).join("\n\n");
  const hasRebuttalRound = input.rounds.some(
    (r) => r.type === "rebuttal" || r.type === "counter",
  );

  const categories: CategoryScores = {
    evidence: T.evidenceScore(userText, input.evidence.length),
    reasoning: T.reasoningScore(userText),
    rebuttal: T.rebuttalScore(userText, opponentText, hasRebuttalRound),
    clarity: T.clarityScore(userText),
    opponentUnderstanding: T.opponentUnderstandingScore(userText, opponentText),
    civility: T.civilityScore(userText),
  };

  const strongest = T.strongestSentence(userText, opponentText);
  const weakest = T.weakestSentence(userText, opponentText);
  const unsupported = T.unsupportedClaims(userText);
  const missed = T.missedCounterarguments(userText, opponentText);

  // Improvement always points at the lowest category, so feedback is specific.
  const lowest = (Object.keys(categories) as (keyof CategoryScores)[]).reduce(
    (min, key) => (categories[key] < categories[min] ? key : min),
  );

  const improvements: Record<keyof CategoryScores, string> = {
    evidence:
      "Attach a source to your central claim. One specific number from a named organisation does more work than three confident sentences.",
    reasoning:
      "Say the word \"because\" at least once per argument. State the claim, then the reason, then why the reason supports the claim.",
    rebuttal:
      "Name the exact sentence you are answering before you answer it. Quote your opponent, then respond to what they actually wrote.",
    clarity:
      "Break your longest sentence into two. A judge should be able to restate your argument after reading it once.",
    opponentUnderstanding:
      "Restate your opponent's strongest point in your own words before you dismantle it. Answering the best version is what earns this category.",
    civility:
      "Aim the criticism at the argument, not at the person making it. Swap loaded words for a description of the reasoning you disagree with.",
  };

  return {
    overall: weightedOverall(categories),
    categories,
    strongestMoment: strongest
      ? `Your strongest passage: "${T.quote(strongest)}" — this one carries specific support rather than assertion.`
      : "Your response was too short to identify a strongest passage. Write at least a few full sentences next round.",
    weakestMoment: weakest
      ? `Your weakest passage: "${T.quote(weakest)}" — this states a position without giving the judge a reason to accept it.`
      : "No clearly weak passage stood out, but there was not much to evaluate.",
    improvement: improvements[lowest],
    unsupportedClaims: unsupported.map((claim) => T.quote(claim, 120)),
    missedCounterarguments: missed.map((claim) => T.quote(claim, 120)),
    summary: `Scored on construction only — the side you argued had no effect on this result. Your strongest category was ${strongestCategoryLabel(categories)}; ${categoryLabel(lowest)} has the most room to grow.`,
  };
}

const CATEGORY_LABELS: Record<keyof CategoryScores, string> = {
  evidence: "Evidence",
  reasoning: "Reasoning",
  rebuttal: "Rebuttal",
  clarity: "Clarity",
  opponentUnderstanding: "Understanding Opponent",
  civility: "Civility",
};

export function categoryLabel(key: keyof CategoryScores): string {
  return CATEGORY_LABELS[key];
}

function strongestCategoryLabel(categories: CategoryScores): string {
  const best = (Object.keys(categories) as (keyof CategoryScores)[]).reduce(
    (max, key) => (categories[key] > categories[max] ? key : max),
  );
  return CATEGORY_LABELS[best];
}

/* ==========================================================================
   Public entry point
   ========================================================================== */

export async function judgeDebate(input: JudgeInput): Promise<JudgeFeedback> {
  if (!isAIConfigured()) return localJudge(input);

  const result = await generateJSON<JudgeModelOutput>({
    system: JUDGE_CONTRACT,
    prompt: transcript(input),
    schema: JUDGE_SCHEMA as unknown as Record<string, unknown>,
  });

  if (!result) return localJudge(input);

  const categories: CategoryScores = {
    evidence: result.evidence,
    reasoning: result.reasoning,
    rebuttal: result.rebuttal,
    clarity: result.clarity,
    opponentUnderstanding: result.opponentUnderstanding,
    civility: result.civility,
  };

  return {
    overall: weightedOverall(categories),
    categories,
    strongestMoment: result.strongestMoment,
    weakestMoment: result.weakestMoment,
    improvement: result.improvement,
    unsupportedClaims: result.unsupportedClaims ?? [],
    missedCounterarguments: result.missedCounterarguments ?? [],
    summary: result.summary,
  };
}
