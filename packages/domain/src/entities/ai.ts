import { z } from "zod";
import { brandedId, Instant, SemanticVersion, shortText } from "../primitives.js";
import { EvidenceCitation } from "../confidence.js";

export const AiOperationResultId = brandedId("AiOperationResultId");
export type AiOperationResultId = z.infer<typeof AiOperationResultId>;

/**
 * The eight narrow operations ReadRep is allowed to run (blueprint §8).
 *
 * Deliberately a closed set. Adding a ninth is an architectural decision, which
 * is the point: it prevents the drift toward one general-purpose mega-prompt.
 */
export const AiOperationName = z.enum([
  "frame_window_summary",
  "decision_candidate_rank",
  "coach_rule_match",
  "decision_analysis",
  "coach_review_assist",
  "player_question",
  "player_explanation",
  "session_recommendation",
]);
export type AiOperationName = z.infer<typeof AiOperationName>;

/** What it cost to produce a result. Recorded from the first call, never bolted on later. */
export const OperationCost = z.object({
  inputTokens: z.number().int().nonnegative().nullable().default(null),
  outputTokens: z.number().int().nonnegative().nullable().default(null),
  /** Micro-USD, integer, to avoid float drift when aggregating per game. */
  estimatedCostMicroUsd: z.number().int().nonnegative().nullable().default(null),
});
export type OperationCost = z.infer<typeof OperationCost>;

export const OperationStatus = z.enum([
  "succeeded",
  "schema_rejected",
  "timed_out",
  "provider_error",
  "refused",
]);
export type OperationStatus = z.infer<typeof OperationStatus>;

/**
 * The stored record of one AI operation.
 *
 * Every result carries the model, prompt, and schema versions that produced it,
 * so a model change can be evaluated against a fixed regression set before it
 * reaches production, and so an old claim can always be explained.
 *
 * `output` is `unknown` here on purpose: the typed shape belongs to the
 * operation's own schema in `@readrep/ai`, which validates before anything is
 * adopted. The domain layer stores the envelope, not the payload's type.
 */
export const AiOperationResult = z
  .object({
    id: AiOperationResultId,
    operation: AiOperationName,
    status: OperationStatus,

    /** Idempotency key: the same input must not be charged for twice. */
    inputHash: z.string().regex(/^[0-9a-f]{64}$/, {
      message: "expected a sha-256 hex digest of the operation input",
    }),

    providerName: shortText(60),
    modelVersion: shortText(120),
    promptVersion: SemanticVersion,
    schemaVersion: SemanticVersion,

    output: z.unknown().nullable().default(null),
    /** Populated for every non-success status. Never contains private media. */
    errorMessage: shortText(400).nullable().default(null),

    citation: EvidenceCitation.nullable().default(null),

    latencyMs: z.number().int().nonnegative(),
    cost: OperationCost,

    startedAt: Instant,
    completedAt: Instant,
  })
  .superRefine((r, ctx) => {
    if (r.status === "succeeded" && r.output === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["output"],
        message: "a succeeded operation must carry its validated output",
      });
    }
    if (r.status !== "succeeded" && r.errorMessage === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["errorMessage"],
        message: "a failed operation must record why it failed",
      });
    }
  });
export type AiOperationResult = z.infer<typeof AiOperationResult>;
