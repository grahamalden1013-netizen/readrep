import { z } from "zod";

/**
 * Skill categories double as the axes of a player's basketball-IQ snapshot,
 * so they are a closed set rather than free text.
 */
export const SKILL_CATEGORIES = [
  "help-recognition",
  "closeout-attack",
  "transition-decision",
  "pick-and-roll-read",
  "defensive-rotation",
] as const;

export const skillCategorySchema = z.enum(SKILL_CATEGORIES);
export type SkillCategory = z.infer<typeof skillCategorySchema>;

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  "help-recognition": "Help recognition",
  "closeout-attack": "Closeout attack",
  "transition-decision": "Transition decision",
  "pick-and-roll-read": "Pick-and-roll read",
  "defensive-rotation": "Defensive rotation",
};

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const answerChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});
export type AnswerChoice = z.infer<typeof answerChoiceSchema>;

export const playerIdentitySchema = z.object({
  jerseyNumber: z.string().min(1).max(3),
  teamColor: z.string().min(1),
  /** e.g. "white leg sleeves" — helps a human reviewer find the player on tape. */
  marker: z.string().max(120).optional(),
});
export type PlayerIdentity = z.infer<typeof playerIdentitySchema>;

export const encodingSchema = z.object({
  src: z.string().min(1),
  /** MIME type for the <source> element, e.g. `video/webm; codecs="vp9"`. */
  type: z.string().min(1),
});
export type Encoding = z.infer<typeof encodingSchema>;

/**
 * What the player element actually consumes. `progressive` is a list of
 * <source> encodings; `hls` is a single manifest URL (how Mux serves playback).
 */
export const videoSourceSchema = z.union([
  z.object({
    kind: z.literal("progressive"),
    /** Ordered by preference; the browser picks the first it can decode. */
    encodings: z.array(encodingSchema).min(1),
    posterSrc: z.string().min(1).optional(),
    captionsSrc: z.string().min(1).optional(),
    /**
     * Set when the footage is not real game tape. Surfaced in the UI so neither
     * the demo nor a fixture run is passed off as genuine recorded film.
     */
    disclaimer: z.string().max(200).optional(),
  }),
  z.object({
    kind: z.literal("hls"),
    src: z.string().min(1),
    posterSrc: z.string().min(1).optional(),
    captionsSrc: z.string().min(1).optional(),
    disclaimer: z.string().max(200).optional(),
  }),
]);
export type VideoSource = z.infer<typeof videoSourceSchema>;

export const VIDEO_ASSET_STATUSES = [
  "awaiting-upload",
  "uploading",
  "processing",
  "ready",
  "errored",
  "cancelled",
] as const;
export const videoAssetStatusSchema = z.enum(VIDEO_ASSET_STATUSES);
export type VideoAssetStatus = z.infer<typeof videoAssetStatusSchema>;

/** Provider-side state for an uploaded game's video. Null for seeded games. */
export const videoAssetSchema = z.object({
  provider: z.enum(["mux", "fixture"]),
  status: videoAssetStatusSchema,
  uploadId: z.string().min(1).nullable(),
  assetId: z.string().min(1).nullable(),
  playbackId: z.string().min(1).nullable(),
  durationSeconds: z.number().positive().nullable(),
  aspectRatio: z.string().min(1).nullable(),
  error: z.string().max(500).nullable(),
  fileName: z.string().max(200).nullable(),
  readyAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});
export type VideoAsset = z.infer<typeof videoAssetSchema>;

export const gameSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  opponent: z.string().min(1).max(80),
  playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  identity: playerIdentitySchema,
  /** Static playback for seeded games. Uploaded games resolve from videoAsset. */
  video: videoSourceSchema.nullable(),
  videoAsset: videoAssetSchema.nullable(),
  /** "demo" games ship with the product; "upload" games come from a user. */
  origin: z.enum(["demo", "upload"]),
  createdAt: z.string().datetime(),
});
export type Game = z.infer<typeof gameSchema>;

export const ANALYSIS_STAGES = [
  "preparing-video",
  "locating-player",
  "reviewing-possessions",
  "selecting-moments",
  "building-reps",
] as const;

export const analysisStageSchema = z.enum(ANALYSIS_STAGES);
export type AnalysisStage = z.infer<typeof analysisStageSchema>;

/**
 * V1 has no automated moment detection. A job is either replayed against
 * already-prepared reps (the seeded game) or parked for human review.
 */
export const analysisJobSchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
  status: z.enum(["queued", "running", "ready", "review-required", "failed"]),
  method: z.enum(["seeded", "human-review"]),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  error: z.string().nullable(),
});
export type AnalysisJob = z.infer<typeof analysisJobSchema>;

export const repSchema = z
  .object({
    id: z.string().min(1),
    gameId: z.string().min(1),
    order: z.number().int().min(1),
    /** A draft is editable and unplayable; publishing freezes it into sessions. */
    status: z.enum(["draft", "published"]).default("published"),
    publishedAt: z.string().datetime().nullable().default(null),
    title: z.string().min(1).max(80),
    category: skillCategorySchema,
    difficulty: difficultySchema,
    clipStartMs: z.number().int().min(0),
    /** The clip pauses here, immediately before the decision is made. */
    decisionPauseMs: z.number().int().min(0),
    clipEndMs: z.number().int().min(0),
    situation: z.string().min(1).max(240),
    prompt: z.string().min(1).max(240),
    choices: z.array(answerChoiceSchema).min(2).max(4),
    correctChoiceId: z.string().min(1),
    /** What the player actually did on tape, as a choice id. */
    actualChoiceId: z.string().min(1),
    actualOutcome: z.string().min(1).max(160),
    explanation: z.string().min(1).max(600),
    coachingCue: z.string().min(1).max(120),
  })
  .refine((rep) => rep.clipStartMs < rep.decisionPauseMs, {
    message: "decisionPauseMs must come after clipStartMs",
    path: ["decisionPauseMs"],
  })
  .refine((rep) => rep.decisionPauseMs < rep.clipEndMs, {
    message: "clipEndMs must come after decisionPauseMs",
    path: ["clipEndMs"],
  })
  .refine((rep) => rep.choices.some((choice) => choice.id === rep.correctChoiceId), {
    message: "correctChoiceId must match one of the choices",
    path: ["correctChoiceId"],
  })
  .refine((rep) => rep.choices.some((choice) => choice.id === rep.actualChoiceId), {
    message: "actualChoiceId must match one of the choices",
    path: ["actualChoiceId"],
  })
  .refine((rep) => new Set(rep.choices.map((choice) => choice.id)).size === rep.choices.length, {
    message: "choice ids must be unique",
    path: ["choices"],
  });
export type Rep = z.infer<typeof repSchema>;

export const playerResponseSchema = z.object({
  repId: z.string().min(1),
  choiceId: z.string().min(1),
  isCorrect: z.boolean(),
  answeredAt: z.string().datetime(),
});
export type PlayerResponse = z.infer<typeof playerResponseSchema>;

export const trainingSessionSchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
  repIds: z.array(z.string().min(1)).min(1),
  responses: z.array(playerResponseSchema),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export type TrainingSession = z.infer<typeof trainingSessionSchema>;

export const skillResultSchema = z.object({
  category: skillCategorySchema,
  attempted: z.number().int().min(0),
  correct: z.number().int().min(0),
});
export type SkillResult = z.infer<typeof skillResultSchema>;

export const playerProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1).max(80),
  identity: playerIdentitySchema.nullable(),
  skills: z.array(skillResultSchema),
});
export type PlayerProfile = z.infer<typeof playerProfileSchema>;
