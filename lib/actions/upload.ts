"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getBackend, getBackendAvailability } from "@/lib/db";
import { playerIdentitySchema, type VideoAsset } from "@/lib/reps/schema";
import { getVideoConfig, getVideoProvider } from "@/lib/video";
import { VideoProviderError, isAcceptedVideoName } from "@/lib/video/provider";
import { syncGameVideo } from "@/lib/video/sync";
import { requireOwnerWhenSupabase, withAuthedAction } from "./guard";
import type { ActionResult } from "./result";

const createGameSchema = z.object({
  title: z.string().trim().min(1, "Give the game a title.").max(120),
  opponent: z.string().trim().min(1, "Who did you play?").max(80),
  playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  identity: playerIdentitySchema,
  fileName: z.string().trim().min(1).max(200),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;

export type StartUploadResult = {
  gameId: string;
  uploadId: string;
  /** The browser PUTs the file here. It never passes through this server. */
  uploadUrl: string;
  provider: "mux" | "fixture";
};

function nowIso() {
  return new Date().toISOString();
}

async function originFromRequest(): Promise<string> {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin;

  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Creates the game row, then a direct-upload target for it.
 *
 * The order matters: the game id becomes the upload's passthrough, so a webhook
 * can find its game even if the browser never comes back.
 */
export async function startGameUpload(
  input: CreateGameInput,
): Promise<ActionResult<StartUploadResult>> {
  return withAuthedAction(() => startGameUploadInner(input));
}

async function startGameUploadInner(
  input: CreateGameInput,
): Promise<ActionResult<StartUploadResult>> {
  const parsed = createGameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  if (!isAcceptedVideoName(parsed.data.fileName)) {
    return { ok: false, error: "That file type is not supported. Use .mp4, .mov, .m4v or .webm." };
  }

  const availability = await getBackendAvailability();
  if (availability.kind === "unavailable") {
    return { ok: false, error: availability.reason };
  }
  // Under Supabase the owner is the authenticated user and nothing else. This
  // throws AuthRequiredError (→ typed { code: "auth-required" }) when the
  // session is missing or expired, so the browser can prompt a re-login and
  // retry rather than hang at 0%. The file backend has no accounts, so it is a
  // no-op there.
  await requireOwnerWhenSupabase();

  const videoConfig = getVideoConfig();
  if (videoConfig.kind === "unavailable") {
    return { ok: false, error: videoConfig.reason };
  }

  let provider;
  try {
    provider = getVideoProvider();
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof VideoProviderError ? cause.toUserMessage() : "Video hosting is unavailable.",
    };
  }

  const backend = await getBackend();
  const game = await backend.createGame({
    title: parsed.data.title,
    opponent: parsed.data.opponent,
    playedOn: parsed.data.playedOn,
    identity: parsed.data.identity,
    fileName: parsed.data.fileName,
  });

  try {
    const upload = await provider.createDirectUpload({
      corsOrigin: await originFromRequest(),
      passthrough: game.id,
    });

    const asset: VideoAsset = {
      provider: provider.kind,
      status: "awaiting-upload",
      uploadId: upload.uploadId,
      assetId: null,
      playbackId: null,
      durationSeconds: null,
      aspectRatio: null,
      error: null,
      fileName: parsed.data.fileName,
      readyAt: null,
      updatedAt: nowIso(),
    };
    await backend.setVideoAsset(game.id, asset);

    return {
      ok: true,
      data: {
        gameId: game.id,
        uploadId: upload.uploadId,
        uploadUrl: upload.url,
        provider: provider.kind,
      },
    };
  } catch (cause) {
    // No upload target means the game row is useless. Remove it rather than
    // leaving an unusable game in the player's list.
    await backend.deleteGame(game.id).catch(() => undefined);
    return {
      ok: false,
      error:
        cause instanceof VideoProviderError
          ? cause.toUserMessage()
          : "Could not start the upload. Try again.",
    };
  }
}

/** Marks the upload as started so the processing page can report honestly. */
export async function markUploadStarted(gameId: string): Promise<ActionResult<null>> {
  return withAuthedAction(async () => {
    await requireOwnerWhenSupabase();
    const backend = await getBackend();
    const game = await backend.getGame(gameId);
    if (!game?.videoAsset) return { ok: false, error: "That game has no upload in progress." };

    await backend.setVideoAsset(gameId, {
      ...game.videoAsset,
      status: "uploading",
      updatedAt: nowIso(),
    });
    return { ok: true, data: null };
  });
}

/** Called when the browser's PUT finishes, before webhooks have caught up. */
export async function markUploadFinished(gameId: string): Promise<ActionResult<null>> {
  return withAuthedAction(async () => {
    await requireOwnerWhenSupabase();
    const backend = await getBackend();
    const game = await backend.getGame(gameId);
    if (!game?.videoAsset) return { ok: false, error: "That game has no upload in progress." };

    if (game.videoAsset.status === "uploading" || game.videoAsset.status === "awaiting-upload") {
      await backend.setVideoAsset(gameId, {
        ...game.videoAsset,
        status: "processing",
        updatedAt: nowIso(),
      });
    }
    return { ok: true, data: null };
  });
}

export async function cancelGameUpload(gameId: string): Promise<ActionResult<null>> {
  return withAuthedAction(async () => {
    await requireOwnerWhenSupabase();
    const backend = await getBackend();
    const game = await backend.getGame(gameId);
    if (!game?.videoAsset) return { ok: false, error: "That game has no upload in progress." };

    if (game.videoAsset.uploadId) {
      try {
        getVideoProvider().cancelUpload(game.videoAsset.uploadId);
      } catch {
        // Best effort: the provider expires abandoned uploads on its own.
      }
    }

    await backend.deleteGame(gameId);
    return { ok: true, data: null };
  });
}

export type VideoStatusView = {
  status: VideoAsset["status"];
  provider: "mux" | "fixture";
  error: string | null;
  durationSeconds: number | null;
  playbackId: string | null;
};

/**
 * Poll target for the processing page. Webhooks may be delayed or unconfigured,
 * so this asks the provider directly and writes the answer through.
 */
export async function pollGameVideo(gameId: string): Promise<ActionResult<VideoStatusView>> {
  const backend = await getBackend();
  const game = await backend.getGame(gameId);
  if (!game) return { ok: false, error: "That game no longer exists." };
  if (!game.videoAsset) return { ok: false, error: "That game has no video." };

  let asset = game.videoAsset;
  try {
    asset = (await syncGameVideo(game, getVideoProvider(), backend)) ?? asset;
  } catch (cause) {
    // Report the last known state rather than failing the page: the next poll
    // may well succeed, and the player should not be dumped out of the flow.
    if (!(cause instanceof VideoProviderError)) throw cause;
  }

  return {
    ok: true,
    data: {
      status: asset.status,
      provider: asset.provider,
      error: asset.error,
      durationSeconds: asset.durationSeconds,
      playbackId: asset.playbackId,
    },
  };
}
