import { z } from "zod";
import { SKILL_CATEGORIES } from "@/lib/reps/schema";

export const CANDIDATE_PROMPT_VERSION = "game-analysis-v1";

const confidence = z.number().min(0).max(1);

/** The model's verdict for one possession window. */
export const possessionResultSchema = z.object({
  // --- identification of the target player in THIS window ---
  targetVisible: z.boolean(),
  targetIdentificationConfidence: confidence,
  /** How the target player is involved, or why not. */
  involvement: z.string().trim().max(600).nullable(),

  // --- is there a genuine decision, and when ---
  hasDecision: z.boolean(),
  /** Seconds from the START of the supplied window to the pause point. */
  decisionOffsetSeconds: z.number().nonnegative().nullable(),
  decisionConfidence: confidence,

  // --- the draft rep (null unless targetVisible && hasDecision) ---
  title: z.string().trim().min(3).max(200).nullable(),
  skillCategory: z.enum(SKILL_CATEGORIES).nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable(),
  situation: z.string().trim().min(3).max(800).nullable(),
  prompt: z.string().trim().min(3).max(600).nullable(),
  /** An ORDERED list of choice text. Ids are assigned server-side (A, B, C, D). */
  answerChoices: z.array(z.object({ text: z.string().trim().min(3).max(200) })).max(4),
  /** 0-based position of the best read within answerChoices. */
  bestReadIndex: z.number().int().min(0).max(3).nullable(),
  /** 0-based position of what the player actually did, or null. */
  actualDecisionIndex: z.number().int().min(0).max(3).nullable(),
  actualDecision: z.string().trim().max(600).nullable(),
  outcome: z.string().trim().max(600).nullable(),
  coachingExplanation: z.string().trim().max(2000).nullable(),

  // --- separated reasoning ---
  visibleEvidence: z
    .array(z.object({ timestampSeconds: z.number().nonnegative(), observation: z.string().trim().min(3).max(600) }))
    .max(20),
  basketballInferences: z.array(z.object({ statement: z.string().trim().min(3).max(600), confidence })).max(12),
  /** Which supplied coach preferences the model actually used, and how. */
  coachPreferenceBasis: z
    .array(z.object({ questionId: z.string().max(64), influence: z.string().trim().min(3).max(400) }))
    .max(8),
  decisionTags: z.array(z.string().trim().max(40)).max(10),
  uncertainty: z.array(z.string().trim().min(2).max(600)).max(10),
  warnings: z.array(z.string().trim().min(2).max(600)).max(12),

  teachingValue: confidence,
});

export type PossessionResult = z.infer<typeof possessionResultSchema>;

/** JSON Schema for the Responses API. The Zod schema above is the real gate. */
export const POSSESSION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "targetVisible",
    "targetIdentificationConfidence",
    "involvement",
    "hasDecision",
    "decisionOffsetSeconds",
    "decisionConfidence",
    "title",
    "skillCategory",
    "difficulty",
    "situation",
    "prompt",
    "answerChoices",
    "bestReadIndex",
    "actualDecisionIndex",
    "actualDecision",
    "outcome",
    "coachingExplanation",
    "visibleEvidence",
    "basketballInferences",
    "coachPreferenceBasis",
    "decisionTags",
    "uncertainty",
    "warnings",
    "teachingValue",
  ],
  properties: {
    targetVisible: { type: "boolean" },
    targetIdentificationConfidence: { type: "number", minimum: 0, maximum: 1 },
    involvement: { type: ["string", "null"] },
    hasDecision: { type: "boolean" },
    decisionOffsetSeconds: { type: ["number", "null"], minimum: 0 },
    decisionConfidence: { type: "number", minimum: 0, maximum: 1 },
    title: { type: ["string", "null"] },
    skillCategory: {
      type: ["string", "null"],
      enum: [...SKILL_CATEGORIES, null],
    },
    difficulty: { type: ["string", "null"], enum: ["easy", "medium", "hard", null] },
    situation: { type: ["string", "null"] },
    prompt: { type: ["string", "null"] },
    answerChoices: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text"],
        properties: { text: { type: "string" } },
      },
    },
    bestReadIndex: { type: ["integer", "null"], minimum: 0, maximum: 3 },
    actualDecisionIndex: { type: ["integer", "null"], minimum: 0, maximum: 3 },
    actualDecision: { type: ["string", "null"] },
    outcome: { type: ["string", "null"] },
    coachingExplanation: { type: ["string", "null"] },
    visibleEvidence: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["timestampSeconds", "observation"],
        properties: { timestampSeconds: { type: "number" }, observation: { type: "string" } },
      },
    },
    basketballInferences: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["statement", "confidence"],
        properties: { statement: { type: "string" }, confidence: { type: "number", minimum: 0, maximum: 1 } },
      },
    },
    coachPreferenceBasis: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["questionId", "influence"],
        properties: { questionId: { type: "string" }, influence: { type: "string" } },
      },
    },
    decisionTags: { type: "array", maxItems: 10, items: { type: "string" } },
    uncertainty: { type: "array", maxItems: 10, items: { type: "string" } },
    warnings: { type: "array", maxItems: 12, items: { type: "string" } },
    teachingValue: { type: "number", minimum: 0, maximum: 1 },
  },
} as const;
