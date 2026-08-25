import { z } from "zod";
import { brandedId, ClipRange, SemanticVersion, shortText } from "./primitives.js";

export const FrameId = brandedId("FrameId");
export type FrameId = z.infer<typeof FrameId>;

export const ArtifactId = brandedId("ArtifactId");
export type ArtifactId = z.infer<typeof ArtifactId>;

export const TrackId = brandedId("TrackId");
export type TrackId = z.infer<typeof TrackId>;

export const CoachRuleId = brandedId("CoachRuleId");
export type CoachRuleId = z.infer<typeof CoachRuleId>;

/* -------------------------------------------------------------------------- */
/* Provenance                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Where a record's content actually came from.
 *
 * This is a required field on every derived record, not an optional annotation.
 * ReadRep must never present manually authored content as AI-generated, and
 * must never present an AI proposal as coach-approved instruction.
 */
export const ProvenanceKind = z.enum([
  /** A human wrote this by hand. Phase 0 demonstration data is all of this kind. */
  "manual_authoring",
  /** A model proposed this. It is a proposal until a coach approves it. */
  "ai_proposal",
  /** A coach reviewed and approved (possibly after editing) an underlying record. */
  "coach_approved",
  /** A player supplied this (an answer, a reflection). */
  "player_input",
  /** Deterministic code derived this from other records. */
  "system_derived",
]);
export type ProvenanceKind = z.infer<typeof ProvenanceKind>;

/** True when content of this provenance may be shown to a player as instruction. */
export const isPlayerFacingProvenance = (kind: ProvenanceKind): boolean =>
  kind === "coach_approved" || kind === "manual_authoring";

/* -------------------------------------------------------------------------- */
/* Confidence                                                                  */
/* -------------------------------------------------------------------------- */

export const ConfidenceBand = z.enum(["low", "medium", "high"]);
export type ConfidenceBand = z.infer<typeof ConfidenceBand>;

/** Maps a 0..1 score onto the band the interface displays. */
export const confidenceBandFor = (score: number): ConfidenceBand => {
  if (score < 0.5) return "low";
  if (score < 0.8) return "medium";
  return "high";
};

/**
 * A calibrated confidence value plus the reason it is what it is.
 *
 * `basis` is required. A bare number tells a coach nothing about whether to
 * trust it, and an uninterpretable score is worse than no score.
 */
export const Confidence = z
  .object({
    score: z.number().min(0).max(1),
    band: ConfidenceBand,
    basis: shortText(280),
  })
  .refine((c) => c.band === confidenceBandFor(c.score), {
    message: "confidence band must agree with the score",
    path: ["band"],
  });
export type Confidence = z.infer<typeof Confidence>;

export const makeConfidence = (score: number, basis: string): Confidence =>
  Confidence.parse({ score, band: confidenceBandFor(score), basis });

/* -------------------------------------------------------------------------- */
/* Uncertainty                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The specific ways ReadRep can fail to know something.
 *
 * Naming these makes uncertainty reviewable. "Not sure" is not actionable; "the
 * weak-side wing is off screen" tells a coach exactly what to check.
 */
export const UncertaintyKind = z.enum([
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
]);
export type UncertaintyKind = z.infer<typeof UncertaintyKind>;

export const Uncertainty = z.object({
  kind: UncertaintyKind,
  detail: shortText(280),
  /** What would resolve it: a coach confirmation, a better angle, a wider window. */
  resolvedBy: shortText(160).optional(),
});
export type Uncertainty = z.infer<typeof Uncertainty>;

/* -------------------------------------------------------------------------- */
/* Evidence citation                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The provenance record attached to any derived claim.
 *
 * Required of every AI-derived claim in ReadRep:
 *   - the clip range the claim is about
 *   - the frames or artifacts it was computed from
 *   - the track it refers to, when the claim is about a specific player
 *   - the coach rule it cites, when a coach rule applies
 *   - the model and prompt version that produced it
 *   - a calibrated confidence
 *   - explicit uncertainty
 *
 * `modelVersion` and `promptVersion` are enforced as required for
 * `ai_proposal` provenance and forbidden for manual authoring, so a manually
 * written fixture can never masquerade as model output.
 */
export const EvidenceCitation = z
  .object({
    provenance: ProvenanceKind,

    /** The window of film this claim is about. Always required. */
    clipRange: ClipRange,

    /** Frame identifiers the claim was computed from. */
    frameIds: z.array(FrameId).default([]),

    /** Stored derived artifacts (crops, overlays, embeddings) backing the claim. */
    artifactIds: z.array(ArtifactId).default([]),

    /** Player tracks the claim refers to, when applicable. */
    trackIds: z.array(TrackId).default([]),

    /** Coach rules cited, when applicable. Empty means general basketball reasoning. */
    coachRuleIds: z.array(CoachRuleId).default([]),

    /** Set only for `ai_proposal`. */
    modelVersion: shortText(120).optional(),
    promptVersion: SemanticVersion.optional(),
    schemaVersion: SemanticVersion.optional(),

    confidence: Confidence,

    /** Explicit, enumerated. An empty array asserts "nothing is unclear here". */
    uncertainty: z.array(Uncertainty).default([]),
  })
  .superRefine((c, ctx) => {
    if (c.provenance === "ai_proposal") {
      if (!c.modelVersion) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["modelVersion"],
          message: "AI-derived claims must record the model version that produced them",
        });
      }
      if (!c.promptVersion) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["promptVersion"],
          message:
            "AI-derived claims must record the prompt version that produced them",
        });
      }
    }
    if (c.provenance === "manual_authoring" && (c.modelVersion || c.promptVersion)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["modelVersion"],
        message:
          "manually authored content must not carry a model or prompt version; it was not produced by a model",
      });
    }
  });
export type EvidenceCitation = z.infer<typeof EvidenceCitation>;

/**
 * Whether a citation grounds its claim in the coach's system.
 *
 * When this is false the interface must label the advice as general basketball
 * reasoning rather than presenting it as the team's required decision.
 */
export const isCoachGrounded = (citation: {
  coachRuleIds: readonly CoachRuleId[];
}): boolean => citation.coachRuleIds.length > 0;
