import assert from "node:assert/strict";
import test from "node:test";
import { buildRepCopilotPrompt, PROMPT_VERSION } from "@/lib/ai/prompts";
import { SKILL_CATEGORIES } from "@/lib/reps/schema";

const TARGET = { jerseyNumber: "15", teamColor: "white", marker: null };
const CLIP = {
  clipStartSeconds: 302,
  decisionSeconds: 309.5,
  clipEndSeconds: 314,
  frameTimestampsSeconds: [302, 304, 306, 308.75, 309.25, 309.5, 309.75, 311, 314],
};

test("the prompt carries a stable version", () => {
  assert.equal(buildRepCopilotPrompt(TARGET, CLIP).version, PROMPT_VERSION);
  assert.equal(PROMPT_VERSION, "rep-copilot-v1");
});

test("the prompt states the trusted target metadata", () => {
  const { userIntro } = buildRepCopilotPrompt(TARGET, CLIP);
  assert.match(userIntro, /target jersey number: 15/);
  assert.match(userIntro, /target team colour: white/);
});

test("the prompt lists every supplied frame timestamp and calls them chronological", () => {
  const { userIntro } = buildRepCopilotPrompt(TARGET, CLIP);
  assert.match(userIntro, /chronological order/i);
  for (const t of CLIP.frameTimestampsSeconds) {
    assert.match(userIntro, new RegExp(`t=${t.toFixed(2)}s`));
  }
});

test("the prompt defines the decision point", () => {
  const { userIntro } = buildRepCopilotPrompt(TARGET, CLIP);
  assert.match(userIntro, /decision point:\s*309\.50s/);
  assert.match(userIntro, /instant just before/i);
});

test("the system prompt separates visible evidence, inference and unknowns", () => {
  const { system } = buildRepCopilotPrompt(TARGET, CLIP);
  assert.match(system, /DIRECTLY VISIBLE/);
  assert.match(system, /REASONABLE BASKETBALL INFERENCE/);
  assert.match(system, /CANNOT BE DETERMINED/);
});

test("the system prompt forbids fabrication and forces the identification gate", () => {
  const { system } = buildRepCopilotPrompt(TARGET, CLIP);
  assert.match(system, /Never invent/);
  assert.match(system, /player names/);
  assert.match(system, /play calls/);
  assert.match(system, /off-screen/);
  assert.match(system, /targetPlayerVisible=false/);
});

test("the system prompt constrains skillCategory to NextRep's closed set", () => {
  const { system } = buildRepCopilotPrompt(TARGET, CLIP);
  for (const slug of SKILL_CATEGORIES) assert.ok(system.includes(slug), `missing ${slug}`);
});

test("the system prompt says it is one possession, not the whole game", () => {
  const { system } = buildRepCopilotPrompt(TARGET, CLIP);
  assert.match(system, /ONE coach-selected possession/);
  assert.match(system, /NOT analysing a whole game/i);
});

test("no key, url or secret appears in the prompt", () => {
  const p = buildRepCopilotPrompt(TARGET, CLIP);
  const blob = `${p.system}\n${p.userIntro}`;
  assert.doesNotMatch(blob, /sk-[a-z0-9]/i);
  assert.doesNotMatch(blob, /api[_-]?key/i);
  assert.doesNotMatch(blob, /image\.mux\.com|stream\.mux\.com|api\.openai\.com/i);
});
