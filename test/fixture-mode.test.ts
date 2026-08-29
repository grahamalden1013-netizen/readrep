import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { FixtureVideoProvider, FIXTURE_DURATION_SECONDS } from "@/lib/video/fixture";
import { FileContentBackend } from "@/lib/db/file-backend";
import { getVideoConfig } from "@/lib/video";
import { getPlayableVideo, getVideoDurationMs } from "@/lib/video/playback";
import { parseMuxEvent } from "@/lib/video/mux";
import { applyVideoWebhook } from "@/lib/video/sync";

/**
 * Fixture mode and the development file backend both write to disk. The data
 * directory is read per call, so pointing it at a temporary directory here is
 * enough to keep this suite isolated from a developer's real `.nextrep-data`.
 */
const testDataDir = mkdtempSync(path.join(tmpdir(), "nextrep-test-"));
process.env.NEXTREP_DATA_DIR = testDataDir;

after(() => {
  rmSync(testDataDir, { recursive: true, force: true });
});

const originalEnv = { ...process.env };

/** NODE_ENV is typed readonly, but provider selection genuinely branches on it. */
function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

function restoreEnv() {
  for (const key of ["MUX_TOKEN_ID", "MUX_TOKEN_SECRET", "MUX_WEBHOOK_SECRET", "NEXTREP_VIDEO_PROVIDER", "NODE_ENV"]) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
}

test("without credentials, development falls back to the fixture provider", () => {
  delete process.env.MUX_TOKEN_ID;
  delete process.env.MUX_TOKEN_SECRET;
  setNodeEnv("development");

  const config = getVideoConfig();
  assert.deepEqual(config, { kind: "fixture", reason: "no-credentials" });
  restoreEnv();
});

test("production without credentials is unavailable, never fixture", () => {
  delete process.env.MUX_TOKEN_ID;
  delete process.env.MUX_TOKEN_SECRET;
  delete process.env.NEXTREP_VIDEO_PROVIDER;
  setNodeEnv("production");

  const config = getVideoConfig();
  assert.equal(config.kind, "unavailable");
  assert.match(config.kind === "unavailable" ? config.reason : "", /MUX_TOKEN_ID/);
  restoreEnv();
});

test("credentials select the real provider, and webhook readiness is reported", () => {
  process.env.MUX_TOKEN_ID = "id";
  process.env.MUX_TOKEN_SECRET = "secret";
  delete process.env.MUX_WEBHOOK_SECRET;
  delete process.env.NEXTREP_VIDEO_PROVIDER;

  assert.deepEqual(getVideoConfig(), { kind: "mux", webhooksConfigured: false });

  process.env.MUX_WEBHOOK_SECRET = "whsec";
  assert.deepEqual(getVideoConfig(), { kind: "mux", webhooksConfigured: true });
  restoreEnv();
});

test("partial credentials do not count as configured", () => {
  process.env.MUX_TOKEN_ID = "id";
  delete process.env.MUX_TOKEN_SECRET;
  setNodeEnv("production");

  assert.equal(getVideoConfig().kind, "unavailable");
  restoreEnv();
});

test("a fixture upload walks waiting to asset_created to ready", async () => {
  let now = 1_000_000;
  const provider = new FixtureVideoProvider(() => now);

  const upload = await provider.createDirectUpload({
    corsOrigin: "http://localhost:3000",
    passthrough: "game-x",
  });
  assert.match(upload.url, /^\/api\/fixture\/upload\//);

  const waiting = await provider.getUpload(upload.uploadId);
  assert.equal(waiting.status, "waiting");
  assert.equal(waiting.assetId, null);

  await provider.completeUpload(upload.uploadId, 5_000_000);

  const created = await provider.getUpload(upload.uploadId);
  assert.equal(created.status, "asset_created");
  assert.ok(created.assetId);

  const preparing = await provider.getAsset(created.assetId!);
  assert.equal(preparing.status, "preparing");
  assert.equal(preparing.playbackId, null);

  now += 10_000;
  const ready = await provider.getAsset(created.assetId!);
  assert.equal(ready.status, "ready");
  assert.ok(ready.playbackId);
  assert.equal(ready.durationSeconds, FIXTURE_DURATION_SECONDS);
});

test("a cancelled fixture upload stays cancelled", async () => {
  const provider = new FixtureVideoProvider();
  const upload = await provider.createDirectUpload({ corsOrigin: "x", passthrough: "g" });
  await provider.cancelUpload(upload.uploadId);
  assert.equal((await provider.getUpload(upload.uploadId)).status, "cancelled");
});

test("the fixture provider verifies its own signatures and rejects forgeries", () => {
  const provider = new FixtureVideoProvider();
  const body = JSON.stringify({ id: "evt_fx", type: "video.asset.ready", data: { id: "a" } });

  const good = new Headers({ "mux-signature": FixtureVideoProvider.signWebhook(body) });
  assert.equal(provider.verifyWebhook(body, good).id, "evt_fx");

  const bad = new Headers({ "mux-signature": "t=1,v1=deadbeef" });
  assert.throws(() => provider.verifyWebhook(body, bad));
});

test("fixture playback is the committed demo film and says so", () => {
  const game = {
    id: "g",
    title: "T",
    opponent: "O",
    playedOn: "2026-01-01",
    identity: { jerseyNumber: "22", teamColor: "White" },
    video: null,
    videoAsset: {
      provider: "fixture" as const,
      status: "ready" as const,
      uploadId: "u",
      assetId: "a",
      playbackId: "p",
      durationSeconds: 118,
      aspectRatio: "16:9",
      error: null,
      fileName: "game.mp4",
      readyAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    origin: "upload" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  const source = getPlayableVideo(game);
  assert.ok(source);
  assert.equal(source.kind, "progressive");
  // A fixture run must never look like real film.
  assert.match(source.disclaimer ?? "", /Fixture/i);
  assert.equal(getVideoDurationMs(game), 118_000);
});

test("a Mux game resolves to an HLS manifest once ready, and to nothing before", () => {
  const base = {
    id: "g",
    title: "T",
    opponent: "O",
    playedOn: "2026-01-01",
    identity: { jerseyNumber: "22", teamColor: "White" },
    video: null,
    origin: "upload" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const asset = {
    provider: "mux" as const,
    uploadId: "u",
    assetId: "a",
    playbackId: "pb_abc",
    durationSeconds: 300,
    aspectRatio: "16:9",
    error: null,
    fileName: null,
    readyAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const ready = getPlayableVideo({ ...base, videoAsset: { ...asset, status: "ready" } });
  assert.equal(ready?.kind, "hls");
  assert.equal(ready?.kind === "hls" ? ready.src : "", "https://stream.mux.com/pb_abc.m3u8");

  // Still transcoding: there is nothing to play, and nothing to substitute.
  assert.equal(getPlayableVideo({ ...base, videoAsset: { ...asset, status: "processing" } }), null);
  assert.equal(
    getPlayableVideo({ ...base, videoAsset: { ...asset, status: "ready", playbackId: null } }),
    null,
  );
});

test("the file backend stores games, drafts and published reps separately", async () => {
  const backend = new FileContentBackend();

  const game = await backend.createGame({
    title: "Tuesday vs. Ravens",
    opponent: "Ravens",
    playedOn: "2026-03-03",
    identity: { jerseyNumber: "14", teamColor: "Black" },
    fileName: "ravens.mp4",
  });

  assert.equal((await backend.getGame(game.id))?.title, "Tuesday vs. Ravens");
  assert.equal(game.videoAsset, null);

  await backend.setVideoAsset(game.id, {
    provider: "fixture",
    status: "ready",
    uploadId: "up_1",
    assetId: "as_1",
    playbackId: "pb_1",
    durationSeconds: 118,
    aspectRatio: "16:9",
    error: null,
    fileName: "ravens.mp4",
    readyAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.equal((await backend.findGameByUploadId("up_1"))?.id, game.id);
  assert.equal((await backend.findGameByAssetId("as_1"))?.id, game.id);

  const rep = {
    id: "rep_draft",
    gameId: game.id,
    order: 1,
    status: "draft" as const,
    publishedAt: null,
    title: "Draft rep",
    category: "closeout-attack" as const,
    difficulty: "easy" as const,
    clipStartMs: 1000,
    decisionPauseMs: 5000,
    clipEndMs: 9000,
    situation: "s",
    prompt: "p",
    choices: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
    correctChoiceId: "b",
    actualChoiceId: "a",
    actualOutcome: "o",
    explanation: "e",
    coachingCue: "c",
  };

  await backend.saveRep(rep);
  assert.equal((await backend.listReps(game.id)).length, 0, "a draft is not playable");
  assert.equal((await backend.listReps(game.id, { includeDrafts: true })).length, 1);

  await backend.saveRep({ ...rep, status: "published", publishedAt: new Date().toISOString() });
  assert.equal((await backend.listReps(game.id)).length, 1, "publishing makes it playable");

  await backend.deleteGame(game.id);
  assert.equal(await backend.getGame(game.id), null);
  assert.equal((await backend.listReps(game.id, { includeDrafts: true })).length, 0);
});

test("the file backend dedupes webhook events and can release a claim", async () => {
  const backend = new FileContentBackend();
  assert.equal(await backend.recordWebhookEvent("evt_a", "video.asset.ready"), true);
  assert.equal(await backend.recordWebhookEvent("evt_a", "video.asset.ready"), false);

  await backend.forgetWebhookEvent("evt_a");
  assert.equal(await backend.recordWebhookEvent("evt_a", "video.asset.ready"), true);
});

test("a fixture-signed webhook drives a real game to ready end to end", async () => {
  const backend = new FileContentBackend();
  const provider = new FixtureVideoProvider();

  const game = await backend.createGame({
    title: "Webhook game",
    opponent: "X",
    playedOn: "2026-03-04",
    identity: { jerseyNumber: "7", teamColor: "Red" },
    fileName: "x.mp4",
  });
  await backend.setVideoAsset(game.id, {
    provider: "fixture",
    status: "processing",
    uploadId: "up_wh",
    assetId: null,
    playbackId: null,
    durationSeconds: null,
    aspectRatio: null,
    error: null,
    fileName: "x.mp4",
    readyAt: null,
    updatedAt: new Date().toISOString(),
  });

  const body = JSON.stringify({
    id: "evt_wh_1",
    type: "video.asset.ready",
    data: {
      id: "as_wh",
      status: "ready",
      upload_id: "up_wh",
      passthrough: game.id,
      duration: 118,
      aspect_ratio: "16:9",
      playback_ids: [{ id: "pb_wh" }],
    },
  });

  const headers = new Headers({ "mux-signature": FixtureVideoProvider.signWebhook(body) });
  const event = provider.verifyWebhook(body, headers);
  assert.deepEqual(event, parseMuxEvent(body));

  const outcome = await applyVideoWebhook(event, backend);
  assert.deepEqual(outcome, { applied: true, gameId: game.id, status: "ready" });

  const updated = await backend.getGame(game.id);
  assert.equal(updated?.videoAsset?.status, "ready");
  assert.equal(updated?.videoAsset?.playbackId, "pb_wh");

  // And a redelivery changes nothing.
  assert.deepEqual(await applyVideoWebhook(event, backend), {
    applied: false,
    reason: "duplicate",
  });
});
