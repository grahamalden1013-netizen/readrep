import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  VideoProviderError,
  assetStatusSchema,
  uploadStatusSchema,
  type AssetStatus,
  type CreateDirectUploadInput,
  type DirectUpload,
  type PlaybackInfo,
  type UploadStatus,
  type VideoProvider,
  type VideoWebhookEvent,
} from "./provider";

const MUX_API = "https://api.mux.com";
const MUX_STREAM = "https://stream.mux.com";
const MUX_IMAGE = "https://image.mux.com";

/** Mux rejects signatures older than this to blunt replay attacks. */
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export type MuxCredentials = {
  tokenId: string;
  tokenSecret: string;
  webhookSecret: string | null;
};

const playbackIdSchema = z.object({
  id: z.string(),
  policy: z.string().optional(),
});

const assetPayloadSchema = z.object({
  id: z.string(),
  status: z.string(),
  duration: z.number().optional(),
  aspect_ratio: z.string().optional(),
  playback_ids: z.array(playbackIdSchema).optional(),
  errors: z.object({ type: z.string().optional(), messages: z.array(z.string()).optional() }).optional(),
});

const uploadPayloadSchema = z.object({
  id: z.string(),
  status: z.string(),
  url: z.string().optional(),
  asset_id: z.string().optional(),
  error: z.object({ type: z.string().optional(), message: z.string().optional() }).optional(),
});

const webhookPayloadSchema = z.object({
  id: z.string(),
  type: z.string(),
  object: z.object({ type: z.string(), id: z.string() }).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

function messagesFrom(errors: { messages?: string[] } | undefined): string | null {
  const message = errors?.messages?.join(" ").trim();
  return message ? message : null;
}

/**
 * Mux's asset and upload states are already the vocabulary the app uses, but an
 * unknown value must not be silently treated as a good one.
 */
function normalizeAssetStatus(raw: string): AssetStatus["status"] {
  const parsed = assetStatusSchema.safeParse(raw);
  return parsed.success ? parsed.data : "errored";
}

function normalizeUploadStatus(raw: string): UploadStatus["status"] {
  const parsed = uploadStatusSchema.safeParse(raw);
  return parsed.success ? parsed.data : "errored";
}

export class MuxVideoProvider implements VideoProvider {
  readonly kind = "mux" as const;
  readonly isConfigured = true;

  private readonly credentials: MuxCredentials;
  private readonly fetchImpl: typeof fetch;

  constructor(credentials: MuxCredentials, fetchImpl: typeof fetch = fetch) {
    this.credentials = credentials;
    this.fetchImpl = fetchImpl;
  }

  private authorization(): string {
    const encoded = Buffer.from(
      `${this.credentials.tokenId}:${this.credentials.tokenSecret}`,
    ).toString("base64");
    return `Basic ${encoded}`;
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${MUX_API}${path}`, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: this.authorization(),
          "Content-Type": "application/json",
        },
      });
    } catch (cause) {
      // Network-level failure. The cause can carry the request URL but never
      // the Authorization header, and we do not attach it to the message.
      throw new VideoProviderError("upstream", `Could not reach the video host: ${String(
        cause instanceof Error ? cause.message : cause,
      )}`);
    }

    if (response.status === 204) return null;

    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    if (!response.ok) {
      throw new VideoProviderError(
        codeForStatus(response.status),
        `Video host responded ${response.status}.`,
        response.status,
      );
    }

    return body;
  }

  private static unwrap<T>(body: unknown, schema: z.ZodType<T>, what: string): T {
    const envelope = z.object({ data: z.unknown() }).safeParse(body);
    const parsed = schema.safeParse(envelope.success ? envelope.data.data : body);
    if (!parsed.success) {
      throw new VideoProviderError("upstream", `Video host returned an unexpected ${what} payload.`);
    }
    return parsed.data;
  }

  async createDirectUpload(input: CreateDirectUploadInput): Promise<DirectUpload> {
    const body = await this.request("/video/v1/uploads", {
      method: "POST",
      body: JSON.stringify({
        cors_origin: input.corsOrigin,
        new_asset_settings: {
          playback_policy: ["public"],
          // "basic" is the cheapest tier and is all a decision rep needs.
          video_quality: "basic",
          passthrough: input.passthrough,
        },
      }),
    });

    const upload = MuxVideoProvider.unwrap(body, uploadPayloadSchema, "upload");
    if (!upload.url) {
      throw new VideoProviderError("upstream", "Video host did not return an upload URL.");
    }
    return { uploadId: upload.id, url: upload.url };
  }

  async getUpload(uploadId: string): Promise<UploadStatus> {
    const body = await this.request(`/video/v1/uploads/${encodeURIComponent(uploadId)}`);
    const upload = MuxVideoProvider.unwrap(body, uploadPayloadSchema, "upload");
    return {
      uploadId: upload.id,
      status: normalizeUploadStatus(upload.status),
      assetId: upload.asset_id ?? null,
      error: upload.error?.message ?? null,
    };
  }

  async cancelUpload(uploadId: string): Promise<void> {
    await this.request(`/video/v1/uploads/${encodeURIComponent(uploadId)}/cancel`, {
      method: "PUT",
    });
  }

  async getAsset(assetId: string): Promise<AssetStatus> {
    const body = await this.request(`/video/v1/assets/${encodeURIComponent(assetId)}`);
    const asset = MuxVideoProvider.unwrap(body, assetPayloadSchema, "asset");
    return {
      assetId: asset.id,
      status: normalizeAssetStatus(asset.status),
      playbackId: asset.playback_ids?.[0]?.id ?? null,
      durationSeconds: asset.duration ?? null,
      aspectRatio: asset.aspect_ratio ?? null,
      error: messagesFrom(asset.errors),
    };
  }

  async getPlayback(playbackId: string): Promise<PlaybackInfo> {
    return {
      kind: "hls",
      src: `${MUX_STREAM}/${playbackId}.m3u8`,
      posterSrc: `${MUX_IMAGE}/${playbackId}/thumbnail.jpg`,
    };
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.request(`/video/v1/assets/${encodeURIComponent(assetId)}`, { method: "DELETE" });
  }

  verifyWebhook(rawBody: string, headers: Headers): VideoWebhookEvent {
    if (!this.credentials.webhookSecret) {
      throw new VideoProviderError(
        "not_configured",
        "MUX_WEBHOOK_SECRET is not set, so webhooks cannot be verified.",
      );
    }
    return verifySignedWebhook(rawBody, headers, this.credentials.webhookSecret);
  }
}

/**
 * Header parse, replay-window check and constant-time HMAC compare.
 *
 * Shared by both providers so that fixture mode exercises exactly the checks a
 * real delivery gets — including the timestamp window, which is the only thing
 * stopping a captured payload from being replayed later.
 */
export function verifySignedWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): VideoWebhookEvent {
  const header = headers.get("mux-signature");
  if (!header) {
    throw new VideoProviderError("invalid_signature", "Missing Mux-Signature header.");
  }

  const { timestamp, signature } = parseSignatureHeader(header);
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    throw new VideoProviderError(
      "invalid_signature",
      "Webhook signature timestamp is outside the tolerance window.",
    );
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  if (!safeEqualHex(expected, signature)) {
    throw new VideoProviderError("invalid_signature", "Webhook signature did not match.");
  }

  return parseMuxEvent(rawBody);
}

function codeForStatus(status: number) {
  if (status === 401 || status === 403) return "unauthorized" as const;
  if (status === 404) return "not_found" as const;
  if (status === 429) return "rate_limited" as const;
  if (status >= 400 && status < 500) return "invalid_request" as const;
  return "upstream" as const;
}

export function parseSignatureHeader(header: string): { timestamp: number; signature: string } {
  const parts = header.split(",").map((part) => part.trim());
  let timestamp: number | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    if (key === "t") timestamp = Number(value);
    if (key === "v1") signature = value;
  }

  if (timestamp === null || !Number.isFinite(timestamp) || !signature) {
    throw new VideoProviderError("invalid_signature", "Malformed Mux-Signature header.");
  }

  return { timestamp, signature };
}

/** Constant-time compare that tolerates length mismatch without leaking it. */
export function safeEqualHex(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

/** Shared by the Mux and fixture providers — both speak the same event shape. */
export function parseMuxEvent(rawBody: string): VideoWebhookEvent {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new VideoProviderError("invalid_request", "Webhook body was not valid JSON.");
  }

  const parsed = webhookPayloadSchema.safeParse(json);
  if (!parsed.success) {
    throw new VideoProviderError("invalid_request", "Webhook body was not a recognised event.");
  }

  const event = parsed.data;
  const data = event.data ?? {};

  const asString = (value: unknown): string | null =>
    typeof value === "string" && value.length > 0 ? value : null;
  const asNumber = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  const objectType = event.object?.type;
  const objectId = event.object?.id ?? null;

  // Upload events carry the upload in `data`; asset events carry the asset and
  // reference the upload through `upload_id`.
  const isUploadEvent = event.type.startsWith("video.upload.");
  const uploadId = isUploadEvent
    ? (asString(data.id) ?? (objectType === "upload" ? objectId : null))
    : asString(data.upload_id);

  const assetId = isUploadEvent
    ? asString(data.asset_id)
    : (asString(data.id) ?? (objectType === "asset" ? objectId : null));

  const playbackIds = Array.isArray(data.playback_ids) ? data.playback_ids : [];
  const firstPlayback = playbackIds[0];
  const playbackId =
    firstPlayback && typeof firstPlayback === "object" && firstPlayback !== null
      ? asString((firstPlayback as { id?: unknown }).id)
      : null;

  const errors = data.errors as { messages?: unknown } | undefined;
  const errorMessages = Array.isArray(errors?.messages)
    ? errors.messages.filter((m): m is string => typeof m === "string").join(" ")
    : null;
  const uploadError = data.error as { message?: unknown } | undefined;

  const rawStatus = asString(data.status);
  const assetStatus = isUploadEvent ? null : rawStatus ? normalizeAssetStatus(rawStatus) : null;

  return {
    id: event.id,
    type: event.type,
    uploadId,
    assetId,
    passthrough: asString(data.passthrough),
    assetStatus,
    playbackId,
    durationSeconds: asNumber(data.duration),
    aspectRatio: asString(data.aspect_ratio),
    error: errorMessages || asString(uploadError?.message) || null,
  };
}
