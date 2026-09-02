import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { possessionResultSchema } from "@/lib/ai/game-analysis/schema";
import { evaluatePossessionResult } from "@/lib/ai/game-analysis/gate";

/**
 * Permanent regression: the 21:01 clip (game 4c059938, window 67) was a false
 * positive under prompt v1 — the model saw white #15 near defenders during a
 * dead-ball inbounds and invented hypothetical options. Under the strict v2
 * gate it MUST reject as no-meaningful-decision.
 *
 * The fixture is the real captured model response
 * (scripts/rescore-9.ts writes it).
 */
const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), "test/fixtures/decision-21-01-response.json"), "utf8"),
) as {
  window: { startSeconds: number; endSeconds: number };
  modelResponse: unknown;
};

test("21:01 clip parses as a valid v2 model response", () => {
  const parsed = possessionResultSchema.safeParse(fixture.modelResponse);
  assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues[0]));
});

test("21:01 clip is rejected as no-meaningful-decision by the strict gate", () => {
  const r = possessionResultSchema.parse(fixture.modelResponse);
  const g = evaluatePossessionResult(r, fixture.window);
  assert.equal(g.kind, "rejected");
  assert.equal((g as { reason: string }).reason, "no-meaningful-decision");
});

test("21:01 clip never yields a draft", () => {
  const r = possessionResultSchema.parse(fixture.modelResponse);
  const g = evaluatePossessionResult(r, fixture.window);
  assert.ok(!("draft" in g));
});
