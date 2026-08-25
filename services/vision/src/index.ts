import { z } from "zod";

/**
 * services/vision — detection, tracking, and identity contracts.
 *
 * NOT IMPLEMENTED. Phase 2 supplies GPU processing (Modal or equivalent). The
 * contract exists now so the domain's `Track` and `IdentityEvidence` schemas
 * have a producer to be written against, and so the human-confirmation
 * checkpoint is part of the interface rather than an afterthought.
 */

export const VISION_SERVICE_STATUS = "not_implemented" as const;

export const DetectionRequest = z.object({
  videoAssetId: z.string().min(1),
  /** Sampled frames only. The whole game is never sent to a detector at once. */
  frameIds: z.array(z.string().min(1)).min(1).max(2000),
  /** Detections below this confidence are dropped rather than surfaced as facts. */
  minConfidence: z.number().min(0).max(1).default(0.5),
});
export type DetectionRequest = z.infer<typeof DetectionRequest>;

export const Detection = z.object({
  frameId: z.string().min(1),
  atMs: z.number().int().nonnegative(),
  subject: z.enum(["player", "official", "ball", "unknown"]),
  box: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0).max(1),
    height: z.number().min(0).max(1),
  }),
  confidence: z.number().min(0).max(1),
});
export type Detection = z.infer<typeof Detection>;

export const TrackingRequest = z.object({
  videoAssetId: z.string().min(1),
  detections: z.array(Detection).min(1),
  /** Maximum gap a tracker may bridge. Longer gaps become separate tracks. */
  maxGapMs: z.number().int().positive().default(2000),
});
export type TrackingRequest = z.infer<typeof TrackingRequest>;

/**
 * A proposed identity for a track.
 *
 * `requiresHumanConfirmation` is part of the response, not a caller's
 * judgement. A track is never promoted to a confirmed player on a single weak
 * signal, and the service that produced the evidence is best placed to say when
 * a person needs to look.
 */
export const IdentityProposal = z.object({
  trackId: z.string().min(1),
  candidatePlayerId: z.string().min(1).nullable(),
  score: z.number().min(0).max(1),
  signals: z.array(
    z.object({
      signal: z.enum([
        "jersey_number_ocr",
        "uniform_color",
        "appearance_embedding",
        "court_continuity",
        "substitution_timing",
      ]),
      weight: z.number().min(-1).max(1),
      detail: z.string().max(280),
    }),
  ),
  requiresHumanConfirmation: z.boolean(),
});
export type IdentityProposal = z.infer<typeof IdentityProposal>;

/**
 * Below this score, a human must confirm before the track is treated as the
 * target player. Set conservatively: youth footage has blur, occlusion,
 * substitutions, and repeated jersey numbers across teams.
 */
export const IDENTITY_CONFIRMATION_THRESHOLD = 0.85;

/** A proposal never confirms itself on one signal, whatever its score. */
export const needsHumanConfirmation = (proposal: {
  score: number;
  signals: readonly unknown[];
}): boolean =>
  proposal.score < IDENTITY_CONFIRMATION_THRESHOLD || proposal.signals.length < 2;

export type VisionService = {
  name: string;
  detect(request: DetectionRequest): Promise<Detection[]>;
  track(
    request: TrackingRequest,
  ): Promise<{ trackId: string; detections: Detection[] }[]>;
  proposeIdentities(params: {
    videoAssetId: string;
    trackIds: readonly string[];
  }): Promise<IdentityProposal[]>;
};

export class VisionServiceNotConfiguredError extends Error {
  constructor(operation: string) {
    super(
      `No vision service is configured (tried "${operation}"). Detection and tracking are Phase 2 ` +
        `and require GPU compute this repository is not wired to.`,
    );
    this.name = "VisionServiceNotConfiguredError";
  }
}

export const notConfiguredVisionService: VisionService = {
  name: "not_configured",
  detect: async () => {
    throw new VisionServiceNotConfiguredError("detect");
  },
  track: async () => {
    throw new VisionServiceNotConfiguredError("track");
  },
  proposeIdentities: async () => {
    throw new VisionServiceNotConfiguredError("proposeIdentities");
  },
};
