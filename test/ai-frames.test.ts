import assert from "node:assert/strict";
import test from "node:test";
import { planFrameTimestamps } from "@/lib/video/frame-source";
import { MAX_FRAMES, MIN_FRAMES } from "@/lib/ai/limits";

const CLIP = { clipStartSeconds: 300, decisionSeconds: 308, clipEndSeconds: 312 };

test("frame timestamps come back sorted ascending", () => {
  const t = planFrameTimestamps(CLIP);
  for (let i = 1; i < t.length; i += 1) assert.ok(t[i] >= t[i - 1], `not sorted at ${i}: ${t}`);
});

test("every frame timestamp is inside the clip window", () => {
  const t = planFrameTimestamps(CLIP);
  for (const v of t) {
    assert.ok(v >= CLIP.clipStartSeconds - 1e-9, `${v} < start`);
    assert.ok(v <= CLIP.clipEndSeconds + 1e-9, `${v} > end`);
  }
});

test("frame timestamps deduplicate on a 100ms grid", () => {
  const t = planFrameTimestamps({ clipStartSeconds: 10, decisionSeconds: 15.02, clipEndSeconds: 20 });
  const keys = t.map((v) => Math.round(v * 10));
  assert.equal(new Set(keys).size, keys.length, `duplicates present: ${t}`);
});

test("sampling is denser around the decision than at the edges", () => {
  const t = planFrameTimestamps(CLIP);
  const near = t.filter((v) => Math.abs(v - CLIP.decisionSeconds) <= 1.6).length;
  const far = t.filter((v) => Math.abs(v - CLIP.decisionSeconds) > 1.6).length;
  assert.ok(near >= 5, `expected >=5 frames within 1.6s of the decision, got ${near}`);
  assert.ok(near > far, `decision window (${near}) should be denser than the rest (${far})`);
});

test("the frame count never exceeds the ceiling", () => {
  const long = planFrameTimestamps({ clipStartSeconds: 0, decisionSeconds: 12, clipEndSeconds: 20 }, MAX_FRAMES);
  assert.ok(long.length <= MAX_FRAMES, `got ${long.length}`);
  assert.ok(long.length >= MIN_FRAMES, `got only ${long.length}`);
});

test("a tight clip is still filled to the minimum frame count", () => {
  const tight = planFrameTimestamps({ clipStartSeconds: 100, decisionSeconds: 102.5, clipEndSeconds: 105.5 });
  assert.ok(tight.length >= MIN_FRAMES, `only ${tight.length} frames for a 5.5s clip`);
  assert.ok(tight.every((v) => v >= 100 && v <= 105.5));
});

test("an out-of-order clip yields no timestamps", () => {
  assert.deepEqual(planFrameTimestamps({ clipStartSeconds: 10, decisionSeconds: 8, clipEndSeconds: 12 }), []);
  assert.deepEqual(planFrameTimestamps({ clipStartSeconds: 10, decisionSeconds: 12, clipEndSeconds: 11 }), []);
});
