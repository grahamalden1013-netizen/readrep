import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { possessionResultSchema } from "@/lib/ai/game-analysis/schema";
import { evaluatePossessionResult } from "@/lib/ai/game-analysis/gate";
import { verifierAgrees, type VerifierVerdict } from "@/lib/ai/game-analysis/verify-types";

/**
 * Permanent NEGATIVE regression set. The nine baseline clips for game 4c059938
 * were all confirmed by human review to contain no meaningful decision by
 * white #15. game-analysis-v2 must NEVER accept/publish any of them.
 *
 * For each captured run: either the deterministic gate rejects the model
 * response outright, or (when the model + gate let one through) the independent
 * verifier disagrees — so the final result is `flagged` / needs_attention and
 * still never `candidate`.
 */
const dir = resolve(process.cwd(), "test/fixtures/v2-negative");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

type Fixture = {
  window: { startSeconds: number; endSeconds: number };
  finalKind: "rejected" | "flagged" | "candidate";
  verifierVerdict: VerifierVerdict | null;
  modelResponse: unknown;
};

test("the v2 negative fixture set is present (>= 9 clips)", () => {
  assert.ok(files.length >= 9, `expected >= 9 negative fixtures, found ${files.length}`);
});

for (const file of files) {
  const fx = JSON.parse(readFileSync(resolve(dir, file), "utf8")) as Fixture;

  test(`negative fixture ${file}: v2 never accepts it`, () => {
    const parsed = possessionResultSchema.safeParse(fx.modelResponse);
    assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues[0]));

    const g = evaluatePossessionResult(parsed.data, fx.window, []);

    // final verdict of the captured pipeline run is never "candidate"
    assert.notEqual(fx.finalKind, "candidate", `${file} was ACCEPTED — regression`);

    if (g.kind === "rejected") {
      assert.ok(!("draft" in g));
      return; // deterministic gate rejects it — done
    }

    // gate let it through -> the independent verifier must have disagreed
    assert.ok(fx.verifierVerdict, `${file} passed the gate but has no verifier verdict`);
    assert.equal(
      verifierAgrees(fx.verifierVerdict as VerifierVerdict),
      false,
      `${file} passed the gate AND the verifier agreed — would be published`,
    );
    assert.equal(fx.finalKind, "flagged");
  });
}
