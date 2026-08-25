import { z } from "zod";

/**
 * Fields every grounded operation output must carry.
 *
 * An operation that cannot cite a window of film, state its confidence, and
 * enumerate what it could not see does not get to contribute to a coach's
 * review queue. Requiring these at the schema level means an under-specified
 * model response is rejected before it is ever adopted.
 */
export const GroundedOutput = z.object({
  confidence: z.object({
    score: z.number().min(0).max(1),
    basis: z.string().trim().min(1).max(280),
  }),
  uncertainty: z
    .array(
      z.object({
        kind: z.enum([
          "off_screen",
          "occlusion",
          "camera_cut",
          "motion_blur",
          "ambiguous_identity",
          "similar_jerseys",
          "substitution_boundary",
          "insufficient_evidence",
          "no_applicable_coach_rule",
          "timing_dependent",
          "court_geometry_unknown",
          "ball_not_visible",
        ]),
        detail: z.string().trim().min(1).max(280),
      }),
    )
    .default([]),
});
export type GroundedOutput = z.infer<typeof GroundedOutput>;

/** The bounded slice of film an operation is allowed to reason about. */
export const EvidenceWindow = z.object({
  videoAssetId: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  /** Sampled frame identifiers. Operations never receive the whole game. */
  frameIds: z.array(z.string().min(1)).max(64).default([]),
});
export type EvidenceWindow = z.infer<typeof EvidenceWindow>;

/** A coach rule supplied to an operation, already resolved by the caller. */
export const SuppliedCoachRule = z.object({
  ruleId: z.string().min(1),
  topic: z.string().min(1),
  statement: z.string().min(1).max(400),
});
export type SuppliedCoachRule = z.infer<typeof SuppliedCoachRule>;

/**
 * An observation an operation claims to have seen.
 *
 * `visible` is required and separate from the text. An operation that wants to
 * mention something off screen must say so here rather than asserting it, which
 * is what keeps "never reason about off-screen events as if they were visible"
 * checkable instead of aspirational.
 */
export const Observation = z.object({
  atMs: z.number().int().nonnegative(),
  description: z.string().trim().min(1).max(400),
  visible: z.boolean(),
});
export type Observation = z.infer<typeof Observation>;
