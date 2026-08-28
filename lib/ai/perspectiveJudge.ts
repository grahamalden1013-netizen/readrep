import type { PerspectiveFeedback } from "@/types/ngn";
import { NEUTRALITY_CONTRACT } from "./neutrality";
import { generateJSON, isAIConfigured } from "./provider";
import * as T from "./text";

/**
 * Switch Sides scoring.
 *
 * This is rating-independent on purpose — a student must never be able to farm
 * competitive rating by writing perspective exercises, and must never be
 * penalised in the ladder for taking the exercise seriously.
 */

const PERSPECTIVE_CONTRACT = `${NEUTRALITY_CONTRACT}

You are evaluating a "Switch Sides" exercise. A student who just argued one side of a question has been asked to make the strongest possible case for the side they opposed.

Score how well they represented the opposing view:
- Accuracy: does this match what people on that side actually argue?
- Fairness: is it presented in good faith, at full strength?
- Strength: is this a case that would persuade an undecided reader?
- Understanding: does it capture the underlying values and priorities, not just the talking points?
- Strawman avoidance: does it resist the temptation to build a weak version that is easy to knock down? A response that argues the opposing side is wrong, or that undercuts the case while presenting it, scores very low here.

Score each 0-100. You are not judging whether the position is correct — only whether the student represented it well.`;

const PERSPECTIVE_SCHEMA = {
  type: "object",
  properties: {
    accuracy: { type: "integer", minimum: 0, maximum: 100 },
    fairness: { type: "integer", minimum: 0, maximum: 100 },
    strength: { type: "integer", minimum: 0, maximum: 100 },
    understanding: { type: "integer", minimum: 0, maximum: 100 },
    strawmanAvoidance: { type: "integer", minimum: 0, maximum: 100 },
    whatYouCaptured: { type: "string" },
    whatYouMissed: { type: "string" },
    summary: { type: "string" },
  },
  required: [
    "accuracy",
    "fairness",
    "strength",
    "understanding",
    "strawmanAvoidance",
    "whatYouCaptured",
    "whatYouMissed",
    "summary",
  ],
  additionalProperties: false,
} as const;

type PerspectiveModelOutput = PerspectiveFeedback["categories"] & {
  whatYouCaptured: string;
  whatYouMissed: string;
  summary: string;
};

export type PerspectiveInput = {
  question: string;
  /** The side the student argued in the debate — they now argue the opposite. */
  originalPosition: "support" | "oppose";
  /** The canonical strongest arguments for the side they are now representing. */
  targetArguments: string[];
  response: string;
};

/** Phrases that undercut a steelman even while pretending to make it. */
const UNDERCUT_MARKERS = [
  "but this is wrong",
  "although i disagree",
  "obviously this fails",
  "which makes no sense",
  "this is flawed",
  "of course, this ignores",
  "they wrongly",
  "they falsely",
  "they don't understand",
];

function localPerspectiveJudge(input: PerspectiveInput): PerspectiveFeedback {
  const response = input.response;
  const canonical = input.targetArguments.join(" ");

  const coverage = T.termOverlap(response, canonical);
  const length = T.lengthFactor(response, 110);
  const undercuts = UNDERCUT_MARKERS.filter((m) =>
    response.toLowerCase().includes(m),
  ).length;

  const accuracy = T.band((30 + coverage * 66) * (0.55 + 0.45 * length));
  const fairness = T.band(92 - undercuts * 22 - T.incivilityHits(response).length * 14);
  const strength = T.band(
    (T.reasoningScore(response) * 0.6 + T.evidenceScore(response, 0) * 0.4) *
      (0.7 + 0.3 * length),
  );
  const understanding = T.band((28 + coverage * 62) * (0.6 + 0.4 * length));
  const strawmanAvoidance = T.band(94 - undercuts * 26);

  const categories = {
    accuracy,
    fairness,
    strength,
    understanding,
    strawmanAvoidance,
  };

  const score = Math.round(
    accuracy * 0.25 +
      fairness * 0.2 +
      strength * 0.2 +
      understanding * 0.2 +
      strawmanAvoidance * 0.15,
  );

  // Name the specific canonical argument the student came closest to, and the
  // one they left on the table.
  const ranked = [...input.targetArguments].sort(
    (a, b) => T.termOverlap(response, b) - T.termOverlap(response, a),
  );
  const captured = ranked[0];
  const missed = ranked[ranked.length - 1];

  return {
    score,
    categories,
    whatYouCaptured: captured
      ? `You represented this argument well: "${T.quote(captured, 170)}"`
      : "It was hard to match your response to any of the standard arguments on that side.",
    whatYouMissed:
      missed && missed !== captured
        ? `You did not reach this one: "${T.quote(missed, 170)}"`
        : "Try covering a second distinct argument next time, not just one.",
    summary:
      undercuts > 0
        ? "You slipped back into arguing against the position while presenting it. A full-strength steelman never signals disagreement."
        : `You made the case for the side you opposed at ${score >= 85 ? "close to full" : score >= 65 ? "reasonable" : "partial"} strength. This score does not affect your Arena Rating.`,
  };
}

export async function judgePerspective(
  input: PerspectiveInput,
): Promise<PerspectiveFeedback> {
  if (!isAIConfigured()) return localPerspectiveJudge(input);

  const targetSide = input.originalPosition === "support" ? "oppose" : "support";

  const result = await generateJSON<PerspectiveModelOutput>({
    system: PERSPECTIVE_CONTRACT,
    prompt: `Debate question: ${input.question}

The student argued the "${input.originalPosition}" side. They have now been asked to make the strongest case for the "${targetSide}" side.

The strongest arguments commonly made on the "${targetSide}" side are:
${input.targetArguments.map((a) => `- ${a}`).join("\n")}

THE STUDENT WROTE:
${input.response}

Evaluate how well they represented the opposing case. Quote their words in whatYouCaptured. Name a specific argument they missed in whatYouMissed. Keep summary to two sentences.`,
    schema: PERSPECTIVE_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 2000,
  });

  if (!result) return localPerspectiveJudge(input);

  const categories = {
    accuracy: result.accuracy,
    fairness: result.fairness,
    strength: result.strength,
    understanding: result.understanding,
    strawmanAvoidance: result.strawmanAvoidance,
  };

  return {
    score: Math.round(
      categories.accuracy * 0.25 +
        categories.fairness * 0.2 +
        categories.strength * 0.2 +
        categories.understanding * 0.2 +
        categories.strawmanAvoidance * 0.15,
    ),
    categories,
    whatYouCaptured: result.whatYouCaptured,
    whatYouMissed: result.whatYouMissed,
    summary: result.summary,
  };
}
