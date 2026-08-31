import assert from "node:assert/strict";
import test from "node:test";
import { AI_ERROR_CODES, AiError, toAiError } from "@/lib/ai/errors";
import { estimateCost } from "@/lib/ai/cost";

test("a missing API key yields a safe configuration error, not a crash", async () => {
  const { assertAiConfigured, isAiConfigured } = await import("@/lib/ai/config");
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.equal(isAiConfigured(), false);
    assert.throws(
      () => assertAiConfigured(),
      (e: unknown) => e instanceof AiError && e.code === "not-configured",
    );
  } finally {
    if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
  }
});

test("with a key present the config check passes", async () => {
  const { isAiConfigured } = await import("@/lib/ai/config");
  const saved = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-not-real";
  try {
    assert.equal(isAiConfigured(), true);
  } finally {
    if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
    else delete process.env.OPENAI_API_KEY;
  }
});

test("every AiError code has a user message and none of them leak internals", () => {
  for (const code of AI_ERROR_CODES) {
    const message = new AiError(code, "raw internal detail sk-secret https://api.openai.com").toUserMessage();
    assert.ok(message.length > 0, `no message for ${code}`);
    assert.doesNotMatch(message, /sk-|api\.openai|image\.mux|stream\.mux|authorization|bearer/i);
    assert.doesNotMatch(message, /raw internal detail/);
  }
});

test("toAiError maps provider statuses without carrying the payload", () => {
  assert.equal(toAiError({ status: 401 }).code, "not-configured");
  assert.equal(toAiError({ status: 404 }).code, "model-unavailable");
  assert.equal(toAiError({ status: 429 }).code, "rate-limited");
  assert.equal(toAiError({ status: 429, code: "insufficient_quota" }).code, "quota");
  assert.equal(toAiError({ status: 503 }).code, "provider-unavailable");
  assert.equal(toAiError(new Error("socket timeout")).code, "timeout");
  const wrapped = toAiError(new Error("boom body: { secret: 'sk-xyz' }"));
  assert.doesNotMatch(wrapped.message, /sk-xyz/);
});

test("an AiError passes through toAiError unchanged", () => {
  const original = new AiError("target-not-visible", "n/a");
  assert.equal(toAiError(original), original);
});

test("cost is always labelled an estimate and never claimed free", () => {
  const withUsage = estimateCost("gpt-5.6-terra", {
    inputTokens: 12_000,
    outputTokens: 900,
    totalTokens: 12_900,
  });
  assert.equal(withUsage.isEstimate, true);
  assert.ok(typeof withUsage.usd === "number" && withUsage.usd > 0);
  assert.match(withUsage.note, /estimate/i);

  const noUsage = estimateCost("gpt-5.6-terra", { inputTokens: null, outputTokens: null, totalTokens: null });
  assert.equal(noUsage.usd, null);
  assert.equal(noUsage.isEstimate, true);
});

test("error kinds separate configuration from analysis uncertainty", () => {
  assert.equal(new AiError("not-configured", "x").kind, "configuration");
  assert.equal(new AiError("quota", "x").kind, "configuration");
  assert.equal(new AiError("target-not-visible", "x").kind, "analysis");
  assert.equal(new AiError("low-confidence", "x").kind, "analysis");
  assert.equal(new AiError("rate-limited", "x").kind, "transient");
  assert.equal(new AiError("invalid-clip", "x").kind, "request");
});
