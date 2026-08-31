/**
 * OPT-IN real-provider integration test. NOT part of `npm test` (the glob is
 * `test/*.test.ts`); this file is `*.integration.ts` on purpose so the normal
 * suite never spends OpenAI credits or hits Mux.
 *
 * Run it deliberately, from the repo root, with a populated .env.local:
 *
 *   RUN_AI_INTEGRATION=1 GAME_ID=4c059938-44f6-4377-87b4-76f619d1788f \
 *   CLIP_START=305 DECISION=312 CLIP_END=317 \
 *   node --import tsx --test test/ai-real-provider.integration.ts
 *
 * It retrieves real Mux frames for the clip, calls the OpenAI Responses API
 * with the real model, validates the output through Zod, and prints latency,
 * token usage and the estimated cost. It never prints the API key.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ENABLED = process.env.RUN_AI_INTEGRATION === "1";

function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const i = line.indexOf("=");
      if (i < 0) continue;
      const k = line.slice(0, i).trim();
      if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
    }
  } catch {
    /* .env.local optional */
  }
}

test("real OpenAI + real Mux frames for one possession", { skip: !ENABLED }, async () => {
  loadEnv();
  assert.ok(process.env.OPENAI_API_KEY, "OPENAI_API_KEY must be set");

  const playbackId = process.env.PLAYBACK_ID;
  assert.ok(playbackId, "set PLAYBACK_ID to the game's public Mux playback id");

  const clip = {
    clipStartSeconds: Number(process.env.CLIP_START ?? 305),
    decisionSeconds: Number(process.env.DECISION ?? 312),
    clipEndSeconds: Number(process.env.CLIP_END ?? 317),
  };
  const target = {
    jerseyNumber: process.env.TARGET_JERSEY ?? "15",
    teamColor: process.env.TARGET_COLOR ?? "white",
    marker: null,
  };

  const { MuxFrameSource } = await import("@/lib/video/mux-frame-source");
  const { getRepAiProvider } = await import("@/lib/ai");
  const { validateAiRepResult } = await import("@/lib/ai/schemas");
  const { estimateCost } = await import("@/lib/ai/cost");

  const frames = await new MuxFrameSource().sampleFrames({ playbackId: playbackId!, ...clip });
  console.log(`frames: ${frames.length} at`, frames.map((f) => f.timestampSeconds).join(", "));
  console.log(
    `payload: ${(frames.reduce((n, f) => n + f.byteLength, 0) / 1024).toFixed(0)} KB @ ${frames[0]?.width}px`,
  );
  assert.ok(frames.length >= 8);
  for (const f of frames) {
    assert.ok(f.timestampSeconds >= clip.clipStartSeconds - 0.01);
    assert.ok(f.timestampSeconds <= clip.clipEndSeconds + 0.01);
    assert.match(f.dataUrl, /^data:image\//);
  }

  const outcome = await getRepAiProvider().analyzePossession({ target, clip, frames });
  console.log("model:", outcome.metadata.model, "fallback:", outcome.metadata.modelFallbackUsed);
  console.log("latency:", outcome.metadata.latencyMs, "ms");
  console.log("usage:", JSON.stringify(outcome.metadata.usage));
  console.log("estimated cost:", JSON.stringify(estimateCost(outcome.metadata.model, outcome.metadata.usage)));

  const validated = validateAiRepResult(outcome.raw, clip);
  console.log("targetPlayerVisible:", validated.result.targetPlayerVisible);
  console.log("identification confidence:", validated.result.targetIdentificationConfidence);
  console.log("overall confidence:", validated.result.confidence);
  console.log("usable:", validated.usable, "applyAllowed:", validated.applyAllowed);
  console.log("warnings:", JSON.stringify(validated.warnings, null, 2));
  console.log("result:", JSON.stringify(validated.result, null, 2));

  for (const ev of validated.result.visibleEvidence) {
    assert.ok(
      ev.timestampSeconds >= clip.clipStartSeconds - 0.01 && ev.timestampSeconds <= clip.clipEndSeconds + 0.01,
      `evidence ${ev.timestampSeconds}s outside clip`,
    );
  }
});
