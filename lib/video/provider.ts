import { z } from "zod";

/**
 * Provider-agnostic video pipeline. Everything the app knows about hosted video
 * goes through this interface so that Mux, a local fixture, or a future
 * provider are interchangeable and independently testable.
 */

export const VIDEO_PROVIDER_ERROR_CODES = [
  "not_configured",
  "unauthorized",
  "not_found",
  "invalid_request",
  "invalid_signature",
  "rate_limited",
  "upstream",
] as const;

export type VideoProviderErrorCode = (typeof VIDEO_PROVIDER_ERROR_CODES)[number];

/** Normalized failure. Never carries credentials or raw provider payloads. */
export class VideoProviderError extends Error {
  readonly code: VideoProviderErrorCode;
  readonly status: number | null;

  constructor(code: VideoProviderErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "VideoProviderError";
    this.code = code;
    this.status = status;
  }

  /** Safe to show a user: the message never includes provider internals. */
  toUserMessage(): string {
    switch (this.code) {
      case "not_configured":
        return "Video hosting is not configured on this server.";
      case "unauthorized":
        return "The video host rejected this server's credentials.";
      case "not_found":
        return "That video could not be found on the video host.";
      case "invalid_signature":
        return "The webhook signature did not verify.";
      case "rate_limited":
        return "The video host is rate limiting us. Try again in a moment.";
      case "invalid_request":
        return this.message;
      default:
        return "The video host could not be reached. Try again in a moment.";
    }
  }
}

export const UPLOAD_STATUSES = [
  "waiting",
  "asset_created",
  "errored",
  "cancelled",
  "timed_out",
] as const;
export const uploadStatusSchema = z.enum(UPLOAD_STATUSES);
export type UploadStatusValue = z.infer<typeof uploadStatusSchema>;

export const ASSET_STATUSES = ["preparing", "ready", "errored"] as const;
export const assetStatusSchema = z.enum(ASSET_STATUSES);
export type AssetStatusValue = z.infer<typeof assetStatusSchema>;

export type DirectUpload = {
  uploadId: string;
  /** The browser PUTs the file straight here. Never proxied through the server. */
  url: string;
};

export type UploadStatus = {
  uploadId: string;
  status: UploadStatusValue;
  assetId: string | null;
  error: string | null;
};

export type AssetStatus = {
  assetId: string;
  status: AssetStatusValue;
  playbackId: string | null;
  durationSeconds: number | null;
  aspectRatio: string | null;
  error: string | null;
};

export type PlaybackInfo =
  | { kind: "hls"; src: string; posterSrc: string | null }
  | { kind: "progressive"; encodings: { src: string; type: string }[]; posterSrc: string | null };

/** Only the fields the app acts on. The rest of the provider payload is dropped. */
export type VideoWebhookEvent = {
  /** Provider event id, used for idempotency. */
  id: string;
  type: string;
  uploadId: string | null;
  assetId: string | null;
  /** Round-trips the game id we attached at upload time. */
  passthrough: string | null;
  assetStatus: AssetStatusValue | null;
  playbackId: string | null;
  durationSeconds: number | null;
  aspectRatio: string | null;
  error: string | null;
};

export type CreateDirectUploadInput = {
  /** Origin allowed to PUT the file. Mux enforces this as CORS. */
  corsOrigin: string;
  /** Opaque value returned on webhooks; we store the game id here. */
  passthrough: string;
};

export interface VideoProvider {
  readonly kind: "mux" | "fixture";
  /** False when required credentials are absent. */
  readonly isConfigured: boolean;

  createDirectUpload(input: CreateDirectUploadInput): Promise<DirectUpload>;
  getUpload(uploadId: string): Promise<UploadStatus>;
  cancelUpload(uploadId: string): Promise<void>;
  getAsset(assetId: string): Promise<AssetStatus>;
  getPlayback(playbackId: string): Promise<PlaybackInfo>;
  deleteAsset(assetId: string): Promise<void>;

  /**
   * Verifies the raw request body against the provider signature header.
   * Throws VideoProviderError("invalid_signature") on any mismatch.
   */
  verifyWebhook(rawBody: string, headers: Headers): VideoWebhookEvent;
}

/** Files the pipeline accepts. Enforced in the browser and again on the server. */
export const ACCEPTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm"] as const;
export const ACCEPTED_VIDEO_MIME_PREFIX = "video/";
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024 * 1024;

export function isAcceptedVideoName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_VIDEO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}
