import type { ContentBackend } from "@/lib/db/backend";
import type { Game, VideoAsset } from "@/lib/reps/schema";
import { VideoProviderError, type VideoProvider, type VideoWebhookEvent } from "./provider";

/**
 * One place that decides what a game's video state is.
 *
 * Webhooks are fast but best-effort — they can be delayed, dropped, delivered
 * out of order, or not configured at all. Polling is slow but always available.
 * Both funnel through here so the two can never disagree about what "ready"
 * means, and so a late webhook cannot walk a ready asset backwards.
 */

/** Later states win, so an out-of-order delivery cannot regress the asset. */
const STATUS_RANK: Record<VideoAsset["status"], number> = {
  "awaiting-upload": 0,
  uploading: 1,
  processing: 2,
  ready: 3,
  errored: 3,
  cancelled: 3,
};

export function mergeVideoAsset(current: VideoAsset, incoming: Partial<VideoAsset>): VideoAsset {
  const nextStatus = incoming.status ?? current.status;
  const keepCurrent = STATUS_RANK[nextStatus] < STATUS_RANK[current.status];

  return {
    ...current,
    ...incoming,
    status: keepCurrent ? current.status : nextStatus,
    // Identifiers and measurements only ever get filled in, never cleared.
    uploadId: incoming.uploadId ?? current.uploadId,
    assetId: incoming.assetId ?? current.assetId,
    playbackId: incoming.playbackId ?? current.playbackId,
    durationSeconds: incoming.durationSeconds ?? current.durationSeconds,
    aspectRatio: incoming.aspectRatio ?? current.aspectRatio,
    fileName: incoming.fileName ?? current.fileName,
    readyAt: incoming.readyAt ?? current.readyAt,
    error: nextStatus === "errored" ? (incoming.error ?? current.error) : null,
    updatedAt: new Date().toISOString(),
  };
}

function assetStatusToVideoStatus(status: "preparing" | "ready" | "errored"): VideoAsset["status"] {
  if (status === "ready") return "ready";
  if (status === "errored") return "errored";
  return "processing";
}

/**
 * Asks the provider what it currently knows and writes it through. Used by the
 * processing page so a game still reaches "ready" when webhooks are not set up.
 */
export async function syncGameVideo(
  game: Game,
  provider: VideoProvider,
  backend: ContentBackend,
): Promise<VideoAsset | null> {
  const asset = game.videoAsset;
  if (!asset) return null;
  if (asset.status === "ready" || asset.status === "cancelled") return asset;

  let patch: Partial<VideoAsset> = {};

  try {
    if (asset.assetId === null && asset.uploadId !== null) {
      const upload = await provider.getUpload(asset.uploadId);
      if (upload.status === "asset_created" && upload.assetId) {
        patch = { assetId: upload.assetId, status: "processing" };
      } else if (upload.status === "errored" || upload.status === "timed_out") {
        patch = { status: "errored", error: upload.error ?? "The upload did not complete." };
      } else if (upload.status === "cancelled") {
        patch = { status: "cancelled" };
      }
    }

    const assetId = patch.assetId ?? asset.assetId;
    if (assetId) {
      const remote = await provider.getAsset(assetId);
      const playbackId = remote.playbackId ?? asset.playbackId ?? null;
      // "ready" has to mean *playable*. If the host reports ready but has not
      // handed us a playback id yet, keep the game in processing so the studio
      // never opens onto a player it cannot feed.
      const status =
        remote.status === "ready" && !playbackId
          ? "processing"
          : assetStatusToVideoStatus(remote.status);
      patch = {
        ...patch,
        assetId,
        status,
        playbackId: remote.playbackId ?? undefined,
        durationSeconds: remote.durationSeconds ?? undefined,
        aspectRatio: remote.aspectRatio ?? undefined,
        error: remote.error ?? undefined,
        readyAt: status === "ready" ? new Date().toISOString() : undefined,
      };
    }
  } catch (cause) {
    if (cause instanceof VideoProviderError && cause.code === "not_found") {
      patch = { status: "errored", error: "The video host no longer has this upload." };
    } else {
      // A transient provider failure must not mark a good asset as broken.
      throw cause;
    }
  }

  if (Object.keys(patch).length === 0) return asset;

  const merged = mergeVideoAsset(asset, patch);
  await backend.setVideoAsset(game.id, merged);
  return merged;
}

/** Translates a verified provider event into an asset patch. */
export function patchFromWebhook(event: VideoWebhookEvent): Partial<VideoAsset> | null {
  switch (event.type) {
    case "video.upload.created":
      return { status: "awaiting-upload", uploadId: event.uploadId ?? undefined };

    case "video.upload.asset_created":
      return { status: "processing", assetId: event.assetId ?? undefined };

    case "video.upload.cancelled":
      return { status: "cancelled" };

    case "video.upload.errored":
      return { status: "errored", error: event.error ?? "The upload failed." };

    case "video.asset.created":
      return { status: "processing", assetId: event.assetId ?? undefined };

    case "video.asset.ready":
      return {
        // A ready asset with no playback id is not playable — hold at processing
        // and let a later poll/webhook fill the id in.
        status: event.playbackId ? "ready" : "processing",
        assetId: event.assetId ?? undefined,
        playbackId: event.playbackId ?? undefined,
        durationSeconds: event.durationSeconds ?? undefined,
        aspectRatio: event.aspectRatio ?? undefined,
        readyAt: event.playbackId ? new Date().toISOString() : undefined,
      };

    case "video.asset.errored":
      return { status: "errored", error: event.error ?? "The video host could not process this file." };

    default:
      return null;
  }
}

/** Finds the game an event belongs to: passthrough first, then provider ids. */
export async function resolveGameForEvent(
  event: VideoWebhookEvent,
  backend: ContentBackend,
): Promise<Game | null> {
  if (event.passthrough) {
    const byPassthrough = await backend.getGame(event.passthrough);
    if (byPassthrough) return byPassthrough;
  }
  if (event.uploadId) {
    const byUpload = await backend.findGameByUploadId(event.uploadId);
    if (byUpload) return byUpload;
  }
  if (event.assetId) {
    const byAsset = await backend.findGameByAssetId(event.assetId);
    if (byAsset) return byAsset;
  }
  return null;
}

export type WebhookOutcome =
  | { applied: true; gameId: string; status: VideoAsset["status"] }
  | { applied: false; reason: "duplicate" | "unhandled-type" | "unknown-game" | "no-asset" };

/**
 * Applies one verified event. Idempotent: the event id is claimed first, so a
 * repeated delivery short-circuits before touching the game.
 */
export async function applyVideoWebhook(
  event: VideoWebhookEvent,
  backend: ContentBackend,
): Promise<WebhookOutcome> {
  const isNew = await backend.recordWebhookEvent(event.id, event.type);
  if (!isNew) return { applied: false, reason: "duplicate" };

  try {
    const patch = patchFromWebhook(event);
    if (!patch) return { applied: false, reason: "unhandled-type" };

    const game = await resolveGameForEvent(event, backend);
    if (!game) return { applied: false, reason: "unknown-game" };
    if (!game.videoAsset) return { applied: false, reason: "no-asset" };

    const merged = mergeVideoAsset(game.videoAsset, patch);
    await backend.setVideoAsset(game.id, merged);
    return { applied: true, gameId: game.id, status: merged.status };
  } catch (cause) {
    // The id was claimed up front to serialise concurrent deliveries. If the
    // apply failed, release it so the provider's retry is not seen as a
    // duplicate and dropped.
    await backend.forgetWebhookEvent(event.id).catch(() => undefined);
    throw cause;
  }
}
