import assert from "node:assert/strict";
import test from "node:test";
import { validateAiClip } from "@/lib/ai/clip";
import { AiError } from "@/lib/ai/errors";

test("a well-formed clip validates to seconds", () => {
  const c = validateAiClip({ clipStartMs: 302_000, decisionPauseMs: 309_500, clipEndMs: 314_000 }, 2400);
  assert.deepEqual(c, { clipStartSeconds: 302, decisionSeconds: 309.5, clipEndSeconds: 314 });
});

test("an out-of-order clip is rejected", () => {
  assert.throws(
    () => validateAiClip({ clipStartMs: 5000, decisionPauseMs: 3000, clipEndMs: 9000 }, null),
    (e: unknown) => e instanceof AiError && e.code === "invalid-clip",
  );
});

test("a clip past the video duration is rejected", () => {
  assert.throws(
    () => validateAiClip({ clipStartMs: 0, decisionPauseMs: 4000, clipEndMs: 12_000 }, 8),
    (e: unknown) => e instanceof AiError && e.code === "invalid-clip",
  );
});

test("a too-short clip is rejected", () => {
  assert.throws(
    () => validateAiClip({ clipStartMs: 0, decisionPauseMs: 2000, clipEndMs: 4000 }, null),
    (e: unknown) => e instanceof AiError && e.code === "clip-too-short",
  );
});

test("a too-long clip is rejected", () => {
  assert.throws(
    () => validateAiClip({ clipStartMs: 0, decisionPauseMs: 10_000, clipEndMs: 25_000 }, null),
    (e: unknown) => e instanceof AiError && e.code === "clip-too-long",
  );
});

test("clip errors never leak internals", () => {
  try {
    validateAiClip({ clipStartMs: 0, decisionPauseMs: 10_000, clipEndMs: 25_000 }, null);
  } catch (e) {
    assert.ok(e instanceof AiError);
    assert.doesNotMatch(e.toUserMessage(), /sk-|api|token|http|mux\.com|openai/i);
  }
});
