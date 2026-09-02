import { z } from "zod";
import { SKILL_CATEGORIES } from "@/lib/reps/schema";

export const CANDIDATE_PROMPT_VERSION = "game-analysis-v2";

const confidence = z.number().min(0).max(1);

/** The observable commitment events a real decision resolves into. */
export const DECISION_ACTIONS = [
  "pass",
  "shot",
  "drive",
  "attack-closeout",
  "screen",
  "roll-or-pop",
  "cut-or-relocate",
  "help-rotation",
  "switch",
  "closeout",
  "tag",
  "rebound-assignment",
  "transition-assignment",
] as const;
export type DecisionAction = (typeof DECISION_ACTIONS)[number];

/**
 * The model's verdict for one possession window. A window either contains a
 * genuine decision by the target — with visible support for two or more
 * alternatives — or it does not (`decision: false`).
 */
export const possessionResultSchema = z.object({
  // --- Stage 1: track the target -------------------------------------
  targetVisible: z.boolean(),
  targetConfidence: confidence,
  /** Frames where the target is actually visible, with what identifies them. */
  targetEvidence: z
    .array(z.object({ timestampSeconds: z.number().nonnegative(), observation: z.string().trim().min(3).max(400) }))
    .max(20),

  // --- Stage 2: possession -----------------------------------------
  possessionSummary: z.string().trim().max(800).nullable(),
  targetInvolvement: z
    .enum(["on-ball-offense", "off-ball-offense", "on-ball-defense", "off-ball-defense", "not-involved"])
    .nullable(),

  // --- Stages 3-5: is there a real decision -----------------------
  decision: z.boolean(),
  /** When decision=false: why not (routine, already-decided, too-early, too-late, not-involved, hypothetical, catch-only, forced-output). */
  noDecisionReason: z.string().trim().max(400).nullable(),

  /** Seconds from the START of the window to the pause point. */
  decisionOffsetSeconds: z.number().nonnegative().nullable(),
  decisionConfidence: confidence,
  actualAction: z.enum(DECISION_ACTIONS).nullable(),
  /** Seconds from the window start to where the committed action is visible (after the pause). */
  actualActionOffsetSeconds: z.number().nonnegative().nullable(),
  visibleOutcome: z.string().trim().max(600).nullable(),
  /** Seconds from the window start to where the outcome is visible. */
  visibleOutcomeOffsetSeconds: z.number().nonnegative().nullable(),
  plausibleAlternatives: z
    .array(
      z.object({
        action: z.string().trim().min(3).max(120),
        /** Seconds from the window start to a frame that shows this option is available. */
        atSecondsFromWindowStart: z.number().nonnegative(),
        visibleEvidence: z.string().trim().min(3).max(400),
      }),
    )
    .max(4),
  whyThisIsNotRoutine: z.string().trim().max(600).nullable(),
  whyThePauseIsBeforeCommitment: z.string().trim().max(600).nullable(),

  // --- Stage 6: the rep draft (only when decision=true) ---------
  title: z.string().trim().min(3).max(200).nullable(),
  skillCategory: z.enum(SKILL_CATEGORIES).nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable(),
  situation: z.string().trim().min(3).max(800).nullable(),
  prompt: z.string().trim().min(3).max(600).nullable(),
  /** Ordered choice text; ids A/B/C/D are assigned server-side. */
  answerChoices: z.array(z.object({ text: z.string().trim().min(3).max(200) })).max(4),
  bestReadIndex: z.number().int().min(0).max(3).nullable(),
  actualDecisionIndex: z.number().int().min(0).max(3).nullable(),
  coachingExplanation: z.string().trim().max(2000).nullable(),

  // --- separated reasoning ------------------------------------------
  basketballInferences: z.array(z.object({ statement: z.string().trim().min(3).max(600), confidence })).max(12),
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
    "targetConfidence",
    "targetEvidence",
    "possessionSummary",
    "targetInvolvement",
    "decision",
    "noDecisionReason",
    "decisionOffsetSeconds",
    "decisionConfidence",
    "actualAction",
    "actualActionOffsetSeconds",
    "visibleOutcome",
    "visibleOutcomeOffsetSeconds",
    "plausibleAlternatives",
    "whyThisIsNotRoutine",
    "whyThePauseIsBeforeCommitment",
    "title",
    "skillCategory",
    "difficulty",
    "situation",
    "prompt",
    "answerChoices",
    "bestReadIndex",
    "actualDecisionIndex",
    "coachingExplanation",
    "basketballInferences",
    "coachPreferenceBasis",
    "decisionTags",
    "uncertainty",
    "warnings",
    "teachingValue",
  ],
  properties: {
    targetVisible: { type: "boolean" },
    targetConfidence: { type: "number", minimum: 0, maximum: 1 },
    targetEvidence: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["timestampSeconds", "observation"],
        properties: { timestampSeconds: { type: "number" }, observation: { type: "string" } },
      },
    },
    possessionSummary: { type: ["string", "null"] },
    targetInvolvement: {
      type: ["string", "null"],
      enum: ["on-ball-offense", "off-ball-offense", "on-ball-defense", "off-ball-defense", "not-involved", null],
    },
    decision: { type: "boolean" },
    noDecisionReason: { type: ["string", "null"] },
    decisionOffsetSeconds: { type: ["number", "null"], minimum: 0 },
    decisionConfidence: { type: "number", minimum: 0, maximum: 1 },
    actualAction: { type: ["string", "null"], enum: [...DECISION_ACTIONS, null] },
    actualActionOffsetSeconds: { type: ["number", "null"], minimum: 0 },
    visibleOutcome: { type: ["string", "null"] },
    visibleOutcomeOffsetSeconds: { type: ["number", "null"], minimum: 0 },
    plausibleAlternatives: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["action", "atSecondsFromWindowStart", "visibleEvidence"],
        properties: {
          action: { type: "string" },
          atSecondsFromWindowStart: { type: "number", minimum: 0 },
          visibleEvidence: { type: "string" },
        },
      },
    },
    whyThisIsNotRoutine: { type: ["string", "null"] },
    whyThePauseIsBeforeCommitment: { type: ["string", "null"] },
    title: { type: ["string", "null"] },
    skillCategory: { type: ["string", "null"], enum: [...SKILL_CATEGORIES, null] },
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
    coachingExplanation: { type: ["string", "null"] },
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
