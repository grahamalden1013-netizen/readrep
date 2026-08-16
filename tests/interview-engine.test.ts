/**
 * Interview engine tests — prompt construction, provider contract, and failure
 * handling. These run against the scripted mock provider, NOT a real model:
 * they prove the engine's plumbing, not that a real model gives good answers.
 *
 * `server-only` resolves to an empty module under the react-server condition,
 * which is why this file must be run as:
 *
 *   npx tsx --conditions=react-server tests/interview-engine.test.ts
 */

import { assert, equal, excludes, group, includes, report, test } from "./harness";

import { setMockResponder, providerMode, generateStructured } from "@/lib/ai/provider";
import { buildSystemPrompt, runInterviewTurn } from "@/lib/ai/coach-interview";
import { InterviewTurnSchema, type InterviewTurnOutput } from "@/lib/ai/schemas";
import type { InterviewSnapshot, KnowledgeNode } from "@/lib/interview/types";

process.env.READREP_AI_MODE = "mock";

function snapshot(overrides: Partial<InterviewSnapshot> = {}): InterviewSnapshot {
  return {
    playbookId: "pb-1",
    teamId: "team-1",
    teamName: "Riverside 15U",
    completedAt: null,
    knowledge: [],
    topicStates: [],
    turns: [],
    terms: [],
    scratch: { ambiguities: [], nextTopicId: null },
    ...overrides,
  };
}

function storedNode(overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  return {
    id: "know-1",
    topicId: "offense.ball_screen.vs_drop",
    phase: "offense",
    action: "ball_screen",
    coverage: "drop",
    role: "ball_handler",
    clock: null,
    trigger: null,
    instruction: "turn the corner",
    priority: 1,
    confidence: 0.9,
    source: "coach",
    parentId: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function reply(overrides: Partial<InterviewTurnOutput> = {}): InterviewTurnOutput {
  return {
    assistant_message: "Understood. What does the screener do after he sets it?",
    extracted_knowledge: [],
    updated_knowledge: [],
    terminology_detected: [],
    ambiguities: [],
    corrections: [],
    confidence_updates: [],
    coverage_updates: [],
    recommended_next_topic: "offense.system",
    next_question_reason: "The system is the frame everything else hangs on.",
    ready_for_film: false,
    ...overrides,
  };
}

async function main() {
  // --- prompt construction -------------------------------------------------

  group("System prompt — what ReadRep tells the model it may do");

  await test("carries the closed situation vocabulary", () => {
    const prompt = buildSystemPrompt(snapshot());
    includes(prompt, "coverage: drop, switch, hedge, blitz, ice, under, over", "coverages listed");
    includes(prompt, "role: ball_handler, screener, off_ball", "roles listed");
    includes(prompt, "closed enums", "the model is told these are closed");
  });

  await test("lists only topics that are actually in play", () => {
    const prompt = buildSystemPrompt(snapshot());
    includes(prompt, "OPEN TOPICS", "open topics are ranked for the model");
    const openSection = prompt.slice(prompt.indexOf("OPEN TOPICS"));
    includes(openSection, "team.identity", "the opener is offered");
    excludes(
      openSection,
      "offense.ball_screen.vs_drop:",
      "a gated topic is not offered before its prerequisite",
    );
  });

  await test("hands the model the exact ids it must use to correct stored knowledge", () => {
    const prompt = buildSystemPrompt(snapshot({ knowledge: [storedNode()] }));
    includes(prompt, "[know-1]", "the row id is exposed for updates");
    includes(prompt, "turn the corner", "the stored read is shown");
    includes(prompt, "use these exact ids", "and the model is told to use it");
  });

  await test("shows already-known terminology so it isn't re-detected", () => {
    const prompt = buildSystemPrompt(
      snapshot({ terms: [{ id: "t1", term: "Chicago", meaning: "pin-down into handoff", category: "offense" }] }),
    );
    includes(prompt, "Chicago", "the term is shown");
    includes(prompt, "do not repeat these", "with an instruction not to duplicate");
  });

  await test("carries open ambiguities forward between turns", () => {
    const prompt = buildSystemPrompt(
      snapshot({ scratch: { ambiguities: ["Unclear whether the corner lifts or stays"], nextTopicId: null } }),
    );
    includes(prompt, "STILL UNCLEAR", "ambiguities are a section");
    includes(prompt, "Unclear whether the corner lifts", "and are carried verbatim");
  });

  await test("never contains a credential", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-should-never-appear";
    const prompt = buildSystemPrompt(snapshot({ knowledge: [storedNode()] }));
    excludes(prompt, "sk-ant", "no key material in the prompt");
    delete process.env.ANTHROPIC_API_KEY;
    process.env.READREP_AI_MODE = "mock";
  });

  // --- conversation shape --------------------------------------------------

  group("Conversation — the model always receives a valid message sequence");

  await test("an opening turn synthesizes the first user message", async () => {
    let seen: { role: string; content: string }[] = [];
    setMockResponder(({ messages }) => {
      seen = messages;
      return reply();
    });

    const result = await runInterviewTurn(snapshot(), null);
    assert(result.ok, "opening turn succeeds");
    equal(seen.length, 1, "one synthesized message");
    equal(seen[0].role, "user", "the API requires a user turn first");
  });

  await test("consecutive coach turns are collapsed rather than sent as-is", async () => {
    let seen: { role: string; content: string }[] = [];
    setMockResponder(({ messages }) => {
      seen = messages;
      return reply();
    });

    // A previous turn failed after saving the coach's words, so history ends
    // on a coach message and a new one arrives.
    const withOrphan = snapshot({
      turns: [
        { id: "1", seq: 1, role: "assistant", content: "What do you run?", topicId: null, reason: null, createdAt: "" },
        { id: "2", seq: 2, role: "coach", content: "5-out motion", topicId: null, reason: null, createdAt: "" },
      ],
    });

    await runInterviewTurn(withOrphan, "Sorry, 5-out with a trail big");
    for (let i = 1; i < seen.length; i++) {
      assert(seen[i].role !== seen[i - 1].role, "no two consecutive turns share a role");
    }
    includes(seen[seen.length - 1].content, "trail big", "both coach messages survive the collapse");
  });

  // --- the three coach personas -------------------------------------------

  group("Coach personas — different teams produce different structured models");

  await test("Coach A: a detailed motion coach yields a chained read", async () => {
    setMockResponder(() =>
      reply({
        assistant_message: "So the corner lifts. What happens if the low man tags the roller?",
        extracted_knowledge: [
          {
            ref: "root",
            topic_id: "offense.ball_screen.vs_drop",
            phase: "offense",
            action: "ball_screen",
            coverage: "drop",
            role: "ball_handler",
            clock: null,
            trigger: null,
            instruction: "turn the corner and get two feet in the paint",
            priority: 1,
            confidence: 0.95,
            source: "coach",
            parent_ref: null,
          },
          {
            ref: "branch",
            topic_id: "offense.ball_screen.vs_drop",
            phase: "offense",
            action: "ball_screen",
            coverage: "drop",
            role: "ball_handler",
            clock: null,
            trigger: "the big commits to the ball",
            instruction: "hit the roller on the pocket pass",
            priority: 2,
            confidence: 0.9,
            source: "coach",
            parent_ref: "root",
          },
        ],
        coverage_updates: [
          { topic_id: "offense.ball_screen.vs_drop", status: "partial", note: "Ball handler covered" },
        ],
        confidence_updates: [{ topic_id: "offense.ball_screen.vs_drop", confidence: 0.7 }],
      }),
    );

    const result = await runInterviewTurn(snapshot(), "Against a drop we want him to turn the corner...");
    assert(result.ok, "turn succeeds");
    equal(result.turn.nodes.length, 2, "two reads extracted");
    equal(result.turn.nodes[1].parentRef, "root", "the second read chains off the first");
    equal(result.turn.coverageUpdates[0].status, "partial", "coverage moves, but not to covered");
  });

  await test("Coach B: a terse answer still yields something usable", async () => {
    setMockResponder(() =>
      reply({
        assistant_message: "Man. What are you trying to take away first?",
        extracted_knowledge: [
          {
            ref: "d1",
            topic_id: "defense.base",
            phase: "defense",
            action: null,
            coverage: null,
            role: null,
            clock: null,
            trigger: null,
            instruction: "man to man every possession",
            priority: 1,
            confidence: 0.8,
            source: "coach",
            parent_ref: null,
          },
        ],
        coverage_updates: [{ topic_id: "defense.base", status: "partial", note: null }],
      }),
    );

    const result = await runInterviewTurn(snapshot(), "Man.");
    assert(result.ok, "a two-word answer still produces a turn");
    equal(result.turn.nodes.length, 1, "one read");
    equal(result.turn.nodes[0].instruction, "man to man every possession", "captured");
  });

  await test("Coach C: 'it depends' becomes an ambiguity, not a fabricated rule", async () => {
    setMockResponder(() =>
      reply({
        assistant_message: "Fair. What does it depend on — the matchup, or where the screen is?",
        extracted_knowledge: [],
        ambiguities: ["Ball-screen coverage varies; the deciding factor isn't known yet"],
        coverage_updates: [
          { topic_id: "defense.ball_screen", status: "partial", note: "Varies by situation" },
        ],
      }),
    );

    const result = await runInterviewTurn(snapshot(), "It depends.");
    assert(result.ok, "turn succeeds");
    equal(result.turn.nodes.length, 0, "nothing is invented from a non-answer");
    equal(result.turn.ambiguities.length, 1, "the gap is recorded instead");
  });

  await test("'I don't know' is recorded as not applicable, not as knowledge", async () => {
    setMockResponder(() =>
      reply({
        assistant_message: "No problem. Do you post up at all?",
        coverage_updates: [
          { topic_id: "offense.post", status: "not_applicable", note: "No true post player" },
        ],
      }),
    );

    const result = await runInterviewTurn(snapshot(), "I don't know, we don't really post.");
    assert(result.ok, "turn succeeds");
    equal(result.turn.coverageUpdates[0].status, "not_applicable", "the topic is closed out");
    equal(result.turn.nodes.length, 0, "no knowledge fabricated");
  });

  // --- corrections and contradictions --------------------------------------

  group("Corrections — a coach can change their mind");

  await test("a correction targets the stored row by id and is described", async () => {
    setMockResponder(() =>
      reply({
        assistant_message: "Got it — reject it instead. Does that change what the screener does?",
        updated_knowledge: [
          {
            id: "know-1",
            instruction: "reject the screen and drive the open side",
            trigger: null,
            priority: null,
            confidence: 0.95,
            retire: false,
            reason: "Coach corrected the first read vs drop",
          },
        ],
        corrections: ["First read vs drop changed from turning the corner to rejecting the screen"],
      }),
    );

    const result = await runInterviewTurn(snapshot({ knowledge: [storedNode()] }), "Actually no — we reject it.");
    assert(result.ok, "turn succeeds");
    equal(result.turn.updates.length, 1, "the stored row is updated");
    equal(result.turn.updates[0].id, "know-1", "by its real id");
    equal(result.turn.corrections.length, 1, "and the change is explained to the coach");
  });

  await test("a retraction retires the row rather than editing it", async () => {
    setMockResponder(() =>
      reply({
        assistant_message: "Understood, I'll drop that. What do you want instead?",
        updated_knowledge: [
          { id: "know-1", instruction: null, trigger: null, priority: null, confidence: null, retire: true, reason: "No longer how they play" },
        ],
      }),
    );

    const result = await runInterviewTurn(snapshot({ knowledge: [storedNode()] }), "Scratch that entirely.");
    assert(result.ok, "turn succeeds");
    equal(result.turn.updates[0].retire, true, "the row is retired");
  });

  await test("a correction aimed at a row that isn't this team's is refused", async () => {
    setMockResponder(() =>
      reply({
        updated_knowledge: [
          { id: "00000000-0000-0000-0000-000000000000", instruction: "leak something", trigger: null, priority: null, confidence: null, retire: true, reason: null },
        ],
      }),
    );

    const result = await runInterviewTurn(snapshot({ knowledge: [storedNode()] }), "change that");
    assert(result.ok, "the turn still completes");
    equal(result.turn.updates.length, 0, "but the cross-row write is dropped");
    assert(result.turn.rejected.length > 0, "and reported");
  });

  // --- failure handling ----------------------------------------------------

  group("Failures — the app degrades honestly");

  await test("output missing a required field is rejected, not partially applied", async () => {
    setMockResponder(() => ({ assistant_message: "Hi", extracted_knowledge: [] }));
    const result = await runInterviewTurn(snapshot(), "hello");
    assert(!result.ok, "malformed output fails the turn");
    equal(result.kind, "invalid_output", "and is classified as invalid output");
  });

  await test("an out-of-vocabulary enum is rejected at the schema boundary", async () => {
    setMockResponder(() =>
      reply({
        extracted_knowledge: [
          {
            ref: "x",
            topic_id: "defense.ball_screen",
            // `veer` is a real coverage in basketball but not in ReadRep's
            // vocabulary; the schema must refuse it rather than store it.
            phase: "defense",
            action: "ball_screen",
            coverage: "veer" as never,
            role: "on_ball",
            clock: null,
            trigger: null,
            instruction: "run them off the line",
            priority: 1,
            confidence: 0.8,
            source: "coach",
            parent_ref: null,
          },
        ],
      }),
    );

    const result = await runInterviewTurn(snapshot(), "we veer it");
    assert(!result.ok, "the turn fails rather than silently dropping the coverage");
    equal(result.kind, "invalid_output", "classified as invalid output");
  });

  await test("garbage instead of JSON fails the turn", async () => {
    setMockResponder(() => "Sure! Here's what I think about your ball screens.");
    const result = await runInterviewTurn(snapshot(), "hello");
    assert(!result.ok, "prose where an object was required fails");
  });

  await test("an empty assistant message is treated as a failed turn", async () => {
    setMockResponder(() => ({ ...reply(), assistant_message: "   " }));
    const result = await runInterviewTurn(snapshot(), "hello");
    assert(!result.ok, "a blank question is not a turn");
  });

  await test("a provider outage is classified, not thrown", async () => {
    setMockResponder(() => {
      throw new Error("socket hang up");
    });
    const result = await runInterviewTurn(snapshot(), "hello");
    assert(!result.ok, "the turn fails");
    equal(result.kind, "provider_error", "classified rather than crashing the request");
  });

  await test("mock mode with no responder registered refuses to invent intelligence", async () => {
    setMockResponder(null);
    const result = await generateStructured({
      system: "x",
      messages: [{ role: "user", content: "y" }],
      schema: InterviewTurnSchema,
    });
    assert(!result.ok, "no fallback answer is produced");
    equal(result.kind, "unconfigured", "it reports as unconfigured");
  });

  await test("without a key and without mock mode, the provider is unconfigured", async () => {
    const prior = process.env.READREP_AI_MODE;
    delete process.env.READREP_AI_MODE;
    delete process.env.ANTHROPIC_API_KEY;

    equal(providerMode(), "unconfigured", "mode reflects the missing key");
    const result = await generateStructured({
      system: "x",
      messages: [{ role: "user", content: "y" }],
      schema: InterviewTurnSchema,
    });
    assert(!result.ok, "no call is attempted");
    equal(result.kind, "unconfigured", "and the caller can show an honest state");
    includes(result.message, "ANTHROPIC_API_KEY", "naming the variable the operator must set");

    process.env.READREP_AI_MODE = prior ?? "mock";
  });

  report();
}

void main();
