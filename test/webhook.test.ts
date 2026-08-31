import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { MuxVideoProvider } from "@/lib/video/mux";
import { VideoProviderError } from "@/lib/video/provider";
import { applyVideoWebhook, mergeVideoAsset, patchFromWebhook } from "@/lib/video/sync";
import type { ContentBackend } from "@/lib/db/backend";
import type { Game, Rep, VideoAsset } from "@/lib/reps/schema";

const WEBHOOK_SECRET = "test-webhook-secret";
const CREDENTIALS = { tokenId: "id", tokenSecret: "secret", webhookSecret: WEBHOOK_SECRET };

function sign(body: string, secret = WEBHOOK_SECRET, atSeconds = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret).update(`${atSeconds}.${body}`).digest("hex");
  return new Headers({ "mux-signature": `t=${atSeconds},v1=${signature}` });
}

function assetReadyBody(eventId = "evt_ready_1") {
  return JSON.stringify({
    id: eventId,
    type: "video.asset.ready",
    object: { type: "asset", id: "asset_1" },
    data: {
      id: "asset_1",
      status: "ready",
      duration: 118,
      aspect_ratio: "16:9",
      upload_id: "upload_1",
      passthrough: "game-1",
      playback_ids: [{ id: "pb_1", policy: "public" }],
    },
  });
}

const BASE_ASSET: VideoAsset = {
  provider: "mux",
  status: "processing",
  uploadId: "upload_1",
  assetId: null,
  playbackId: null,
  durationSeconds: null,
  aspectRatio: null,
  error: null,
  fileName: "game.mp4",
  readyAt: null,
  updatedAt: "2026-03-01T00:00:00.000Z",
};

/** In-memory backend so the webhook path can be driven without a database. */
class MemoryBackend implements ContentBackend {
  readonly kind = "file" as const;
  readonly label = "memory";
  games = new Map<string, Game>();
  reps = new Map<string, Rep>();
  events = new Set<string>();
  setVideoAssetCalls = 0;
  failNextSetVideoAsset = false;

  constructor(game: Game) {
    this.games.set(game.id, game);
  }

  async createGame(): Promise<Game> {
    throw new Error("this backend is read/update only in these tests");
  }
  async getGame(gameId: string) {
    return this.games.get(gameId) ?? null;
  }
  async listGames() {
    return [...this.games.values()];
  }
  async deleteGame(gameId: string) {
    this.games.delete(gameId);
  }
  async setVideoAsset(gameId: string, asset: VideoAsset) {
    this.setVideoAssetCalls += 1;
    if (this.failNextSetVideoAsset) {
      this.failNextSetVideoAsset = false;
      throw new Error("write failed");
    }
    const game = this.games.get(gameId);
    if (game) this.games.set(gameId, { ...game, videoAsset: asset });
  }
  async findGameByUploadId(uploadId: string) {
    return [...this.games.values()].find((g) => g.videoAsset?.uploadId === uploadId) ?? null;
  }
  async findGameByAssetId(assetId: string) {
    return [...this.games.values()].find((g) => g.videoAsset?.assetId === assetId) ?? null;
  }
  async listReps() {
    return [...this.reps.values()];
  }
  async getRep(repId: string) {
    return this.reps.get(repId) ?? null;
  }
  async saveRep(rep: Rep) {
    this.reps.set(rep.id, rep);
  }
  async deleteRep(repId: string) {
    this.reps.delete(repId);
  }
  async recordWebhookEvent(eventId: string) {
    if (this.events.has(eventId)) return false;
    this.events.add(eventId);
    return true;
  }
  async forgetWebhookEvent(eventId: string) {
    this.events.delete(eventId);
  }
}

function gameWithAsset(asset: VideoAsset = BASE_ASSET): Game {
  return {
    id: "game-1",
    title: "Saturday vs. Dragons",
    opponent: "Dragons",
    playedOn: "2026-02-14",
    identity: { jerseyNumber: "22", teamColor: "White" },
    video: null,
    videoAsset: asset,
    origin: "upload",
    createdAt: "2026-02-14T21:30:00.000Z",
  };
}

test("a correctly signed webhook verifies", () => {
  const provider = new MuxVideoProvider(CREDENTIALS);
  const body = assetReadyBody();
  const event = provider.verifyWebhook(body, sign(body));

  assert.equal(event.id, "evt_ready_1");
  assert.equal(event.type, "video.asset.ready");
  assert.equal(event.assetId, "asset_1");
  assert.equal(event.playbackId, "pb_1");
});

test("a webhook signed with the wrong secret is rejected", () => {
  const provider = new MuxVideoProvider(CREDENTIALS);
  const body = assetReadyBody();
  const error = (() => {
    try {
      provider.verifyWebhook(body, sign(body, "not-the-secret"));
      return null;
    } catch (cause) {
      return cause;
    }
  })();

  assert.ok(error instanceof VideoProviderError);
  assert.equal(error.code, "invalid_signature");
});

test("a tampered body is rejected even with a valid-looking header", () => {
  const provider = new MuxVideoProvider(CREDENTIALS);
  const body = assetReadyBody();
  const headers = sign(body);
  const tampered = body.replace('"asset_1"', '"asset_evil"');

  assert.throws(() => provider.verifyWebhook(tampered, headers), VideoProviderError);
});

test("a missing signature header is rejected", () => {
  const provider = new MuxVideoProvider(CREDENTIALS);
  assert.throws(() => provider.verifyWebhook(assetReadyBody(), new Headers()), VideoProviderError);
});

test("a replayed signature outside the tolerance window is rejected", () => {
  const provider = new MuxVideoProvider(CREDENTIALS);
  const body = assetReadyBody();
  const longAgo = Math.floor(Date.now() / 1000) - 60 * 60;

  const error = (() => {
    try {
      provider.verifyWebhook(body, sign(body, WEBHOOK_SECRET, longAgo));
      return null;
    } catch (cause) {
      return cause;
    }
  })();

  assert.ok(error instanceof VideoProviderError);
  assert.equal(error.code, "invalid_signature");
});

test("verification refuses to run when no webhook secret is configured", () => {
  const provider = new MuxVideoProvider({ ...CREDENTIALS, webhookSecret: null });
  const body = assetReadyBody();
  const error = (() => {
    try {
      provider.verifyWebhook(body, sign(body));
      return null;
    } catch (cause) {
      return cause;
    }
  })();

  assert.ok(error instanceof VideoProviderError);
  assert.equal(error.code, "not_configured");
});

test("an asset.ready event moves the game to ready with playback details", async () => {
  const backend = new MemoryBackend(gameWithAsset());
  const provider = new MuxVideoProvider(CREDENTIALS);
  const body = assetReadyBody();

  const outcome = await applyVideoWebhook(provider.verifyWebhook(body, sign(body)), backend);
  assert.deepEqual(outcome, { applied: true, gameId: "game-1", status: "ready" });

  const asset = (await backend.getGame("game-1"))?.videoAsset;
  assert.equal(asset?.status, "ready");
  assert.equal(asset?.playbackId, "pb_1");
  assert.equal(asset?.durationSeconds, 118);
  assert.equal(asset?.aspectRatio, "16:9");
  assert.ok(asset?.readyAt);
});

test("an asset.ready event with no playback id is held at processing", () => {
  // "ready" has to mean playable. Mux always sends playback_ids for a policy'd
  // asset, but a delivery that somehow arrives without one must not open the
  // studio onto a player it cannot feed.
  const patch = patchFromWebhook({
    id: "evt_no_pb",
    type: "video.asset.ready",
    uploadId: "upload_1",
    assetId: "asset_1",
    passthrough: "game-1",
    assetStatus: "ready",
    playbackId: null,
    durationSeconds: 118,
    aspectRatio: "16:9",
    error: null,
  });

  assert.equal(patch?.status, "processing");
  assert.equal(patch?.readyAt, undefined);
});

test("a duplicate delivery is skipped rather than applied twice", async () => {
  const backend = new MemoryBackend(gameWithAsset());
  const provider = new MuxVideoProvider(CREDENTIALS);
  const body = assetReadyBody();

  const first = await applyVideoWebhook(provider.verifyWebhook(body, sign(body)), backend);
  const second = await applyVideoWebhook(provider.verifyWebhook(body, sign(body)), backend);
  const third = await applyVideoWebhook(provider.verifyWebhook(body, sign(body)), backend);

  assert.equal(first.applied, true);
  assert.deepEqual(second, { applied: false, reason: "duplicate" });
  assert.deepEqual(third, { applied: false, reason: "duplicate" });
  assert.equal(backend.setVideoAssetCalls, 1);
});

test("a failed apply releases the event id so a retry is not seen as a duplicate", async () => {
  const backend = new MemoryBackend(gameWithAsset());
  const provider = new MuxVideoProvider(CREDENTIALS);
  const body = assetReadyBody();
  backend.failNextSetVideoAsset = true;

  await assert.rejects(() => applyVideoWebhook(provider.verifyWebhook(body, sign(body)), backend));

  const retry = await applyVideoWebhook(provider.verifyWebhook(body, sign(body)), backend);
  assert.equal(retry.applied, true);
});

test("an event for an unknown game is acknowledged, not retried forever", async () => {
  const backend = new MemoryBackend(gameWithAsset());
  const provider = new MuxVideoProvider(CREDENTIALS);
  const body = JSON.stringify({
    id: "evt_orphan",
    type: "video.asset.ready",
    data: { id: "asset_other", status: "ready", passthrough: "game-does-not-exist" },
  });

  const outcome = await applyVideoWebhook(provider.verifyWebhook(body, sign(body)), backend);
  assert.deepEqual(outcome, { applied: false, reason: "unknown-game" });
});

test("an event type we do not act on is ignored", async () => {
  const backend = new MemoryBackend(gameWithAsset());
  const provider = new MuxVideoProvider(CREDENTIALS);
  const body = JSON.stringify({
    id: "evt_other",
    type: "video.asset.static_renditions.ready",
    data: { id: "asset_1", passthrough: "game-1" },
  });

  const outcome = await applyVideoWebhook(provider.verifyWebhook(body, sign(body)), backend);
  assert.deepEqual(outcome, { applied: false, reason: "unhandled-type" });
});

test("an error event records the provider's message", async () => {
  const backend = new MemoryBackend(gameWithAsset());
  const provider = new MuxVideoProvider(CREDENTIALS);
  const body = JSON.stringify({
    id: "evt_err",
    type: "video.asset.errored",
    data: {
      id: "asset_1",
      status: "errored",
      passthrough: "game-1",
      errors: { messages: ["Input file is not a supported video format"] },
    },
  });

  const outcome = await applyVideoWebhook(provider.verifyWebhook(body, sign(body)), backend);
  assert.equal(outcome.applied, true);

  const asset = (await backend.getGame("game-1"))?.videoAsset;
  assert.equal(asset?.status, "errored");
  assert.equal(asset?.error, "Input file is not a supported video format");
});

test("a late out-of-order event cannot walk a ready asset backwards", () => {
  const ready = mergeVideoAsset(BASE_ASSET, {
    status: "ready",
    playbackId: "pb_1",
    durationSeconds: 118,
  });

  // upload.asset_created can legitimately arrive after asset.ready.
  const late = mergeVideoAsset(ready, patchFromWebhook({
    id: "evt_late",
    type: "video.upload.asset_created",
    uploadId: "upload_1",
    assetId: "asset_1",
    passthrough: "game-1",
    assetStatus: null,
    playbackId: null,
    durationSeconds: null,
    aspectRatio: null,
    error: null,
  })!);

  assert.equal(late.status, "ready");
  assert.equal(late.playbackId, "pb_1");
  assert.equal(late.durationSeconds, 118);
  assert.equal(late.assetId, "asset_1");
});

test("recovering from an error clears the stale message", () => {
  const errored = mergeVideoAsset(BASE_ASSET, { status: "errored", error: "transcode failed" });
  assert.equal(errored.error, "transcode failed");

  const recovered = mergeVideoAsset(errored, { status: "ready", playbackId: "pb_2" });
  assert.equal(recovered.error, null);
});

test("the fixture provider enforces the same replay window as the real one", async () => {
  const { FixtureVideoProvider } = await import("@/lib/video/fixture");
  const provider = new FixtureVideoProvider();
  const body = assetReadyBody("evt_replay");

  const fresh = new Headers({ "mux-signature": FixtureVideoProvider.signWebhook(body) });
  assert.equal(provider.verifyWebhook(body, fresh).id, "evt_replay");

  const stale = new Headers({
    "mux-signature": FixtureVideoProvider.signWebhook(body, Math.floor(Date.now() / 1000) - 7200),
  });
  const error = (() => {
    try {
      provider.verifyWebhook(body, stale);
      return null;
    } catch (cause) {
      return cause;
    }
  })();

  assert.ok(error instanceof VideoProviderError);
  assert.equal(error.code, "invalid_signature");
});
