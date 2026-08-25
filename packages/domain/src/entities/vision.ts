import { z } from "zod";
import {
  BoundingBox,
  brandedId,
  ClipRange,
  Instant,
  shortText,
  TimestampMs,
} from "../primitives";
import { Confidence, TrackId, Uncertainty } from "../confidence";
import { GameId, VideoAssetId } from "./game";
import { PlayerId } from "./identity";

export const PossessionId = brandedId("PossessionId");
export type PossessionId = z.infer<typeof PossessionId>;

export const IdentityEvidenceId = brandedId("IdentityEvidenceId");
export type IdentityEvidenceId = z.infer<typeof IdentityEvidenceId>;

/* -------------------------------------------------------------------------- */
/* Track                                                                       */
/* -------------------------------------------------------------------------- */

export const TrackSubject = z.enum(["player", "official", "ball", "unknown"]);
export type TrackSubject = z.infer<typeof TrackSubject>;

export const TeamAffiliation = z.enum([
  "target_team",
  "opponent",
  "official",
  "unknown",
]);
export type TeamAffiliation = z.infer<typeof TeamAffiliation>;

export const TrackObservation = z.object({
  atMs: TimestampMs,
  box: BoundingBox,
  detectionConfidence: z.number().min(0).max(1),
});
export type TrackObservation = z.infer<typeof TrackObservation>;

/**
 * A detected subject followed across frames.
 *
 * A track is evidence, not identity. Promoting a track to "this is our player"
 * requires accumulated `IdentityEvidence` and, in the pilot, a human
 * confirmation. Phase 2 populates these; Phase 0 defines the shape only.
 */
export const Track = z.object({
  id: TrackId,
  gameId: GameId,
  videoAssetId: VideoAssetId,
  subject: TrackSubject,
  affiliation: TeamAffiliation,
  /** The frame span this track covers. */
  range: ClipRange,
  observations: z.array(TrackObservation).default([]),
  /** Set only once identity is confirmed. Null is the honest default. */
  confirmedPlayerId: PlayerId.nullable().default(null),
  confidence: Confidence,
  uncertainty: z.array(Uncertainty).default([]),
  createdAt: Instant,
});
export type Track = z.infer<typeof Track>;

/* -------------------------------------------------------------------------- */
/* Identity evidence                                                           */
/* -------------------------------------------------------------------------- */

/**
 * One signal contributing to "is this track our target player?".
 *
 * Identity is a probabilistic evidence problem (blueprint Stage C). No single
 * signal promotes a track: `jersey_ocr` alone is exactly the weak signal the
 * blueprint warns about.
 */
export const IdentitySignal = z.enum([
  "jersey_number_ocr",
  "uniform_color",
  "appearance_embedding",
  "court_continuity",
  "substitution_timing",
  "human_confirmation",
  "human_correction",
]);
export type IdentitySignal = z.infer<typeof IdentitySignal>;

export const IdentityEvidence = z.object({
  id: IdentityEvidenceId,
  trackId: TrackId,
  candidatePlayerId: PlayerId,
  signal: IdentitySignal,
  /** Signed contribution: positive supports the match, negative contradicts it. */
  weight: z.number().min(-1).max(1),
  atMs: TimestampMs.nullable().default(null),
  detail: shortText(280),
  confidence: Confidence,
  /** Set when the signal came from a person rather than a model. */
  confirmedByUserId: brandedId("UserId").nullable().default(null),
  createdAt: Instant,
});
export type IdentityEvidence = z.infer<typeof IdentityEvidence>;

/**
 * Human confirmation outranks every model signal.
 *
 * When a person has confirmed or corrected a track, that is the answer; the
 * accumulated model evidence does not get to outvote them.
 */
export const hasHumanConfirmation = (
  evidence: readonly Pick<IdentityEvidence, "signal">[],
): boolean =>
  evidence.some(
    (e) => e.signal === "human_confirmation" || e.signal === "human_correction",
  );

/* -------------------------------------------------------------------------- */
/* Possession                                                                  */
/* -------------------------------------------------------------------------- */

export const PossessionControl = z.enum(["target_team", "opponent", "unknown"]);
export type PossessionControl = z.infer<typeof PossessionControl>;

export const Possession = z.object({
  id: PossessionId,
  gameId: GameId,
  videoAssetId: VideoAssetId,
  range: ClipRange,
  control: PossessionControl,
  /** Sequence number within the game, for stable ordering. */
  sequence: z.number().int().nonnegative(),
  /** Coarse events observed within the possession, if any were detected. */
  derivedEvents: z
    .array(
      z.object({
        atMs: TimestampMs,
        kind: shortText(60),
        confidence: Confidence,
      }),
    )
    .default([]),
  confidence: Confidence,
  uncertainty: z.array(Uncertainty).default([]),
  createdAt: Instant,
});
export type Possession = z.infer<typeof Possession>;
