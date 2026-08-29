import assert from "node:assert/strict";
import test from "node:test";
import { MuxVideoProvider, parseMuxEvent, parseSignatureHeader, safeEqualHex } from "@/lib/video/mux";
import { VideoProviderError } from "@/lib/video/provider";

const CREDENTIALS = { tokenId: "token-id", tokenSecret: "token-secret", webhookSecret: "whsec" };

/** Records the calls a provider makes so the HTTP contract can be asserted. */
function stubFetch(handler: (url: string, init: RequestInit) => { status: number; body?: unknown }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const { status, body } = handler(url, init);
    // 204/205/304 must not carry a body, or the Response constructor throws.
    const hasBody = body !== undefined && ![204, 205, 304].includes(status);
    return new Response(hasBody ? JSON.stringify(body) : null, { status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

test("creating a direct upload asks the provider for a URL and returns it", async () => {
  const { impl, calls } = stubFetch(() => ({
    status: 201,
    body: { data: { id: "upload_123", status: "waiting", url: "https://storage.example/put" } },
  }));

  const provider = new MuxVideoProvider(CREDENTIALS, impl);
  const upload = await provider.createDirectUpload({
    corsOrigin: "https://nextrep.test",
    passthrough: "game-1",
  });

  assert.deepEqual(upload, { uploadId: "upload_123", url: "https://storage.example/put" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.mux.com/video/v1/uploads");
  assert.equal(calls[0].init.method, "POST");

  const sent = JSON.parse(String(calls[0].init.body));
  assert.equal(sent.cors_origin, "https://nextrep.test");
  // The game id must round-trip so a webhook can find its game.
  assert.equal(sent.new_asset_settings.passthrough, "game-1");
});

test("credentials go in the Authorization header and never in the URL or body", async () => {
  const { impl, calls } = stubFetch(() => ({
    status: 201,
    body: { data: { id: "u", status: "waiting", url: "https://storage.example/put" } },
  }));

  await new MuxVideoProvider(CREDENTIALS, impl).createDirectUpload({
    corsOrigin: "https://nextrep.test",
    passthrough: "game-1",
  });

  const headers = calls[0].init.headers as Record<string, string>;
  const expected = `Basic ${Buffer.from("token-id:token-secret").toString("base64")}`;
  assert.equal(headers.Authorization, expected);
  assert.ok(!calls[0].url.includes("token-secret"));
  assert.ok(!String(calls[0].init.body).includes("token-secret"));
});

test("a ready asset reports playback, duration and aspect ratio", async () => {
  const { impl } = stubFetch(() => ({
    status: 200,
    body: {
      data: {
        id: "asset_1",
        status: "ready",
        duration: 372.5,
        aspect_ratio: "16:9",
        playback_ids: [{ id: "pb_1", policy: "public" }],
      },
    },
  }));

  const asset = await new MuxVideoProvider(CREDENTIALS, impl).getAsset("asset_1");
  assert.deepEqual(asset, {
    assetId: "asset_1",
    status: "ready",
    playbackId: "pb_1",
    durationSeconds: 372.5,
    aspectRatio: "16:9",
    error: null,
  });
});

test("an unrecognised asset status is treated as an error, not as ready", async () => {
  const { impl } = stubFetch(() => ({
    status: 200,
    body: { data: { id: "asset_1", status: "something_new" } },
  }));

  const asset = await new MuxVideoProvider(CREDENTIALS, impl).getAsset("asset_1");
  assert.equal(asset.status, "errored");
});

test("provider HTTP failures map to normalized codes", async () => {
  const cases: [number, string][] = [
    [401, "unauthorized"],
    [403, "unauthorized"],
    [404, "not_found"],
    [429, "rate_limited"],
    [422, "invalid_request"],
    [500, "upstream"],
  ];

  for (const [status, code] of cases) {
    const { impl } = stubFetch(() => ({ status, body: { error: "nope" } }));
    const provider = new MuxVideoProvider(CREDENTIALS, impl);
    const error = await provider.getAsset("a").then(
      () => null,
      (cause: unknown) => cause,
    );
    assert.ok(error instanceof VideoProviderError, `status ${status} should normalize`);
    assert.equal(error.code, code, `status ${status}`);
    // The user-facing message must not leak provider internals.
    assert.ok(!error.toUserMessage().includes("nope"));
  }
});

test("a network failure surfaces as an upstream error rather than throwing raw", async () => {
  const impl = (async () => {
    throw new Error("ECONNREFUSED");
  }) as unknown as typeof fetch;

  const error = await new MuxVideoProvider(CREDENTIALS, impl).getUpload("u").then(
    () => null,
    (cause: unknown) => cause,
  );
  assert.ok(error instanceof VideoProviderError);
  assert.equal(error.code, "upstream");
});

test("deleting an asset issues a DELETE and tolerates an empty response", async () => {
  const { impl, calls } = stubFetch(() => ({ status: 204 }));
  await new MuxVideoProvider(CREDENTIALS, impl).deleteAsset("asset_1");
  assert.equal(calls[0].init.method, "DELETE");
  assert.equal(calls[0].url, "https://api.mux.com/video/v1/assets/asset_1");
});

test("playback resolves to the provider's HLS manifest", async () => {
  const { impl } = stubFetch(() => ({ status: 200 }));
  const playback = await new MuxVideoProvider(CREDENTIALS, impl).getPlayback("pb_1");
  assert.equal(playback.kind, "hls");
  assert.equal(playback.kind === "hls" ? playback.src : "", "https://stream.mux.com/pb_1.m3u8");
});

test("signature headers parse and reject malformed input", () => {
  assert.deepEqual(parseSignatureHeader("t=1700000000,v1=abc"), {
    timestamp: 1700000000,
    signature: "abc",
  });
  assert.throws(() => parseSignatureHeader("garbage"), VideoProviderError);
  assert.throws(() => parseSignatureHeader("v1=abc"), VideoProviderError);
  assert.throws(() => parseSignatureHeader("t=notanumber,v1=abc"), VideoProviderError);
});

test("hex comparison rejects mismatched lengths without throwing", () => {
  assert.equal(safeEqualHex("abcd", "abcd"), true);
  assert.equal(safeEqualHex("abcd", "abce"), false);
  assert.equal(safeEqualHex("abcd", "abcdef"), false);
  assert.equal(safeEqualHex("", ""), true);
});

test("asset events carry the asset, upload events carry the upload", () => {
  const assetReady = parseMuxEvent(
    JSON.stringify({
      id: "evt_1",
      type: "video.asset.ready",
      object: { type: "asset", id: "asset_9" },
      data: {
        id: "asset_9",
        status: "ready",
        duration: 120.5,
        aspect_ratio: "16:9",
        upload_id: "upload_9",
        passthrough: "game-9",
        playback_ids: [{ id: "pb_9", policy: "public" }],
      },
    }),
  );

  assert.equal(assetReady.assetId, "asset_9");
  assert.equal(assetReady.uploadId, "upload_9");
  assert.equal(assetReady.playbackId, "pb_9");
  assert.equal(assetReady.passthrough, "game-9");
  assert.equal(assetReady.durationSeconds, 120.5);
  assert.equal(assetReady.assetStatus, "ready");

  const uploadCreated = parseMuxEvent(
    JSON.stringify({
      id: "evt_2",
      type: "video.upload.created",
      object: { type: "upload", id: "upload_9" },
      data: { id: "upload_9", status: "waiting", passthrough: "game-9" },
    }),
  );

  assert.equal(uploadCreated.uploadId, "upload_9");
  assert.equal(uploadCreated.assetId, null);
});

test("asset error events keep the provider's message", () => {
  const event = parseMuxEvent(
    JSON.stringify({
      id: "evt_3",
      type: "video.asset.errored",
      data: {
        id: "asset_x",
        status: "errored",
        errors: { type: "invalid_input", messages: ["Unsupported codec"] },
      },
    }),
  );

  assert.equal(event.assetStatus, "errored");
  assert.equal(event.error, "Unsupported codec");
});

test("a non-JSON or unrecognised webhook body is rejected", () => {
  assert.throws(() => parseMuxEvent("not json"), VideoProviderError);
  assert.throws(() => parseMuxEvent(JSON.stringify({ nope: true })), VideoProviderError);
});
