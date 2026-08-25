import { z } from "zod";

/**
 * services/video — the seam between ReadRep and a video provider.
 *
 * NOT IMPLEMENTED. Phase 1 supplies a real provider (Mux or equivalent). What
 * exists here is the contract that keeps the rest of the product from depending
 * on a vendor, plus the two rules the implementation must not break:
 *
 *   1. The application never proxies the file. Uploads go directly from the
 *      browser to the provider against a short-lived ticket.
 *   2. A raw provider URL never reaches a client. Playback is authorized
 *      server-side, per request, and expires.
 */

export const VIDEO_SERVICE_STATUS = "not_implemented" as const;

/* -------------------------------------------------------------------------- */
/* Direct upload                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A short-lived permission to upload one file.
 *
 * The ticket is the only thing the browser receives. It carries no account
 * credential, is scoped to a single game, and expires.
 */
export const DirectUploadTicket = z.object({
  gameId: z.string().min(1),
  /** Provider-issued endpoint. Single-use and short-lived. */
  uploadUrl: z.string().url(),
  providerUploadId: z.string().min(1),
  expiresAt: z.string().datetime({ offset: true }),
  maxBytes: z.number().int().positive(),
  allowedMimeTypes: z.array(z.string().min(1)).min(1),
});
export type DirectUploadTicket = z.infer<typeof DirectUploadTicket>;

/* -------------------------------------------------------------------------- */
/* Playback                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Time-limited permission to play one asset, issued after authorization.
 *
 * Returned per request and never stored on a record. Storing a playback URL is
 * how a private clip becomes a shareable link, which is why `VideoAsset` holds
 * only opaque provider identifiers.
 */
export const PlaybackGrant = z.object({
  videoAssetId: z.string().min(1),
  /** Signed, expiring token. Exchanged by the player for a stream. */
  token: z.string().min(1),
  expiresAt: z.string().datetime({ offset: true }),
  /** Window the viewer is permitted to watch, for clip-scoped grants. */
  startMs: z.number().int().nonnegative().nullable(),
  endMs: z.number().int().positive().nullable(),
});
export type PlaybackGrant = z.infer<typeof PlaybackGrant>;

/* -------------------------------------------------------------------------- */
/* Webhooks                                                                    */
/* -------------------------------------------------------------------------- */

export const VideoWebhookType = z.enum([
  "upload.asset_created",
  "asset.ready",
  "asset.errored",
  "asset.deleted",
]);
export type VideoWebhookType = z.infer<typeof VideoWebhookType>;

/**
 * A provider webhook, after signature verification.
 *
 * `idempotencyKey` is required. Providers deliver at least once, and a
 * re-delivered `asset.ready` must not advance a processing run twice; the run's
 * dedupe log is keyed on this value.
 */
export const VideoWebhookEvent = z.object({
  type: VideoWebhookType,
  providerAssetId: z.string().min(1),
  providerUploadId: z.string().min(1).nullable(),
  idempotencyKey: z.string().min(1),
  durationMs: z.number().int().nonnegative().nullable(),
  occurredAt: z.string().datetime({ offset: true }),
});
export type VideoWebhookEvent = z.infer<typeof VideoWebhookEvent>;

export type WebhookVerification =
  | { valid: true; event: VideoWebhookEvent }
  | { valid: false; reason: "bad_signature" | "stale_timestamp" | "malformed_body" };

/**
 * Verifies and parses a webhook.
 *
 * Signature verification and replay rejection happen here, before parsing, and
 * an unverified body is never parsed into an event. Phase 1 must test both
 * failure modes; blueprint §13 calls for signature and replay tests explicitly.
 */
export type WebhookVerifier = {
  verify(params: {
    rawBody: string;
    signatureHeader: string;
    receivedAt: Date;
    toleranceSeconds: number;
  }): WebhookVerification;
};

/* -------------------------------------------------------------------------- */
/* Provider                                                                    */
/* -------------------------------------------------------------------------- */

export type VideoProvider = {
  name: string;
  createDirectUpload(params: {
    gameId: string;
    maxBytes: number;
  }): Promise<DirectUploadTicket>;
  /** Issued only after the data-access layer has authorized the caller. */
  authorizePlayback(params: {
    providerPlaybackId: string;
    ttlSeconds: number;
    startMs?: number;
    endMs?: number;
  }): Promise<PlaybackGrant>;
  /** Must delete originals and every derived rendition the provider holds. */
  deleteAsset(providerAssetId: string): Promise<void>;
  webhooks: WebhookVerifier;
};

export class VideoProviderNotConfiguredError extends Error {
  constructor(operation: string) {
    super(
      `No video provider is configured (tried "${operation}"). ReadRep Phase 0 stores no footage ` +
        `and issues no playback. Provider integration is Phase 1 and requires credentials this ` +
        `repository does not hold.`,
    );
    this.name = "VideoProviderNotConfiguredError";
  }
}

/**
 * The Phase 0 provider.
 *
 * Every method throws. It does not return a placeholder ticket or a fake
 * playback token, because an interface that appears to play film it does not
 * have is precisely the fake success state the blueprint prohibits.
 */
export const notConfiguredVideoProvider: VideoProvider = {
  name: "not_configured",
  createDirectUpload: async () => {
    throw new VideoProviderNotConfiguredError("createDirectUpload");
  },
  authorizePlayback: async () => {
    throw new VideoProviderNotConfiguredError("authorizePlayback");
  },
  deleteAsset: async () => {
    throw new VideoProviderNotConfiguredError("deleteAsset");
  },
  webhooks: {
    verify: () => ({ valid: false, reason: "bad_signature" }),
  },
};

/** Upload limits for the pilot. A full game at 1080p sits well inside this. */
export const UPLOAD_LIMITS = {
  maxBytes: 8 * 1024 * 1024 * 1024,
  allowedMimeTypes: ["video/mp4", "video/quicktime", "video/x-matroska"],
  maxDurationMs: 4 * 60 * 60 * 1000,
} as const;

/** How long a playback grant lives. Short, because a leaked token is a leaked clip. */
export const PLAYBACK_TTL_SECONDS = 300;
