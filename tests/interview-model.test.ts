/**
 * Pure-logic tests for the interview's knowledge model: normalization of model
 * output, coverage/film-readiness, next-topic selection, and situation-scoped
 * retrieval. No database, no model provider.
 *
 *   npx tsx tests/interview-model.test.ts
 */

import { assert, equal, group, includes, report, test } from "./harness";

import { normalizeTurn, fingerprintOf, describeNode } from "@/lib/interview/normalize";
import { computeCoverage, openTopics } from "@/lib/interview/coverage";
import { selectReads, readsToPrompt } from "@/lib/interview/retrieval";
import { TOPICS } from "@/lib/interview/coverage-model";
import type { InterviewTurnOutput } from "@/lib/ai/schemas";
import type { KnowledgeNode, TopicState } from "@/lib/interview/types";

// --- fixtures --------------------------------------------------------------

function turnOutput(overrides: Partial<InterviewTurnOutput> = {}): InterviewTurnOutput {
  return {
    assistant_message: "Got it. What changes when the big steps up?",
    extracted_knowledge: [],
    updated_knowledge: [],
    terminology_detected: [],
    ambiguities: [],
    corrections: [],
    confidence_updates: [],
    coverage_updates: [],
    recommended_next_topic: null,
    next_question_reason: null,
    ready_for_film: false,
    ...overrides,
  };
}

function node(overrides: Partial<InterviewTurnOutput["extracted_knowledge"][number]> = {}) {
  return {
    ref: "r1",
    topic_id: "offense.ball_screen.vs_drop",
    phase: "offense" as const,
    action: "ball_screen" as const,
    coverage: "drop" as const,
    role: "ball_handler" as const,
    clock: null,
    trigger: null,
    instruction: "turn the corner",
    priority: 1,
    confidence: 0.9,
    source: "coach" as const,
    parent_ref: null,
    ...overrides,
  };
}

function stored(overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  return {
    id: "id-1",
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

const emptyContext = { knownNodeIds: new Set<string>(), existingTerms: new Set<string>() };

// --- normalization ---------------------------------------------------------

async function main() {
  group("Normalization — the model cannot write outside the vocabulary");

  await test("discards knowledge tagged with a topic ReadRep doesn't have", () => {
    const result = normalizeTurn(
      turnOutput({ extracted_knowledge: [node({ topic_id: "offense.invented_topic" })] }),
      emptyContext,
    );
    equal(result.nodes.length, 0, "invented topic should be dropped");
    assert(
      result.rejected.some((r) => r.includes("offense.invented_topic")),
      "rejection should be reported, not silent",
    );
  });

  await test("discards an update naming a knowledge id that isn't this team's", () => {
    const result = normalizeTurn(
      turnOutput({
        updated_knowledge: [
          {
            id: "some-other-teams-row",
            instruction: "do something else",
            trigger: null,
            priority: null,
            confidence: null,
            retire: false,
            reason: null,
          },
        ],
      }),
      emptyContext,
    );
    equal(result.updates.length, 0, "unknown row id must not reach the database");
  });

  await test("accepts an update naming a real id from this playbook", () => {
    const result = normalizeTurn(
      turnOutput({
        updated_knowledge: [
          {
            id: "id-1",
            instruction: "reject it and re-screen",
            trigger: null,
            priority: null,
            confidence: 0.95,
            retire: false,
            reason: "Coach corrected the first read",
          },
        ],
      }),
      { knownNodeIds: new Set(["id-1"]), existingTerms: new Set() },
    );
    equal(result.updates.length, 1, "known id should pass");
    equal(result.updates[0].instruction, "reject it and re-screen", "instruction carried through");
  });

  await test("drops a defensive role from an offensive read", () => {
    const result = normalizeTurn(
      turnOutput({ extracted_knowledge: [node({ role: "low_man" })] }),
      emptyContext,
    );
    equal(result.nodes[0].role, null, "incoherent role should be dropped, not stored");
    equal(result.nodes[0].instruction, "turn the corner", "the instruction itself survives");
  });

  await test("a coverage implies a ball screen", () => {
    const result = normalizeTurn(
      turnOutput({ extracted_knowledge: [node({ action: null, coverage: "ice" })] }),
      emptyContext,
    );
    equal(result.nodes[0].action, "ball_screen", "coverage without an action is coerced");
  });

  await test("clamps confidence and caps overlong text", () => {
    const result = normalizeTurn(
      turnOutput({
        extracted_knowledge: [
          node({ confidence: 4.2, instruction: "x".repeat(500), priority: 99 }),
        ],
      }),
      emptyContext,
    );
    equal(result.nodes[0].confidence, 1, "confidence clamped to 1");
    equal(result.nodes[0].instruction.length, 240, "instruction capped");
    equal(result.nodes[0].priority, 20, "priority clamped");
  });

  await test("deduplicates two identical reads inside one turn", () => {
    const result = normalizeTurn(
      turnOutput({ extracted_knowledge: [node({ ref: "a" }), node({ ref: "b" })] }),
      emptyContext,
    );
    equal(result.nodes.length, 1, "same situation + same read order collapses to one row");
  });

  await test("flattens a read whose parent_ref points at nothing", () => {
    const result = normalizeTurn(
      turnOutput({ extracted_knowledge: [node({ ref: "child", parent_ref: "ghost" })] }),
      emptyContext,
    );
    equal(result.nodes[0].parentRef, null, "orphan chain is flattened rather than lost");
    assert(result.rejected.length > 0, "the flattening is reported");
  });

  await test("keeps a valid parent chain", () => {
    const result = normalizeTurn(
      turnOutput({
        extracted_knowledge: [
          node({ ref: "root", instruction: "turn the corner" }),
          node({
            ref: "branch",
            parent_ref: "root",
            trigger: "the big commits to the ball",
            instruction: "hit the roller",
            priority: 2,
          }),
        ],
      }),
      emptyContext,
    );
    equal(result.nodes.length, 2, "both reads kept");
    const branch = result.nodes.find((n) => n.ref === "branch");
    equal(branch?.parentRef, "root", "chain preserved");
    equal(describeNode(branch!), "If the big commits to the ball → hit the roller", "renders as a read");
  });

  await test("ignores a recommended topic outside the coverage model", () => {
    const result = normalizeTurn(
      turnOutput({ recommended_next_topic: "offense.freelance_vibes" }),
      emptyContext,
    );
    equal(result.nextTopicId, null, "unknown next topic is not stored");
  });

  await test("skips terminology the team already has", () => {
    const result = normalizeTurn(
      turnOutput({
        terminology_detected: [
          { term: "Chicago", meaning: "pin-down into handoff", category: "offense" },
          { term: "chicago", meaning: "duplicate casing", category: "offense" },
        ],
      }),
      { knownNodeIds: new Set(), existingTerms: new Set(["chicago"]) },
    );
    equal(result.terminology.length, 0, "already-known term is not re-added");
  });

  await test("fingerprints are stable and situation-sensitive", () => {
    const base = {
      topicId: "offense.ball_screen.vs_drop",
      phase: "offense",
      action: "ball_screen",
      coverage: "drop" as string | null,
      role: "ball_handler",
      clock: null,
      trigger: null,
      priority: 1,
    };
    equal(fingerprintOf(base), fingerprintOf({ ...base }), "same input, same fingerprint");
    assert(
      fingerprintOf(base) !== fingerprintOf({ ...base, coverage: "switch" }),
      "a different coverage is a different slot",
    );
    assert(
      fingerprintOf(base) !== fingerprintOf({ ...base, priority: 2 }),
      "a different read order is a different slot",
    );
  });

  // --- coverage ------------------------------------------------------------

  group("Coverage — film-readiness is computed, not self-reported");

  await test("an empty playbook is not film-ready", () => {
    const coverage = computeCoverage({ knowledge: [], topicStates: [] });
    equal(coverage.filmReady, false, "nothing learned is not ready");
    equal(coverage.overall, 0, "zero coverage");
    assert(coverage.missingCritical.length > 0, "critical topics are listed as missing");
  });

  await test("a topic claimed 'covered' with no stored knowledge does not count", () => {
    const states: TopicState[] = [
      { topicId: "offense.system", status: "covered", confidence: 1, note: null },
    ];
    const coverage = computeCoverage({ knowledge: [], topicStates: states });
    const topic = coverage.topics.find((t) => t.topic.id === "offense.system");
    assert(topic!.confidence <= 0.35, "confidence is capped by the evidence behind it");
    assert(
      coverage.missingCritical.some((t) => t.id === "offense.system"),
      "a claim with no knowledge still counts as missing",
    );
  });

  await test("evidence lifts confidence toward the model's claim", () => {
    const states: TopicState[] = [
      { topicId: "offense.system", status: "covered", confidence: 0.9, note: null },
    ];
    const knowledge = [
      stored({ id: "a", topicId: "offense.system", instruction: "5-out motion" }),
      stored({ id: "b", topicId: "offense.system", instruction: "first look is the paint touch", priority: 2 }),
    ];
    const coverage = computeCoverage({ knowledge, topicStates: states });
    const topic = coverage.topics.find((t) => t.topic.id === "offense.system");
    equal(topic!.confidence, 0.9, "two stored reads lets the claim stand");
  });

  await test("not_applicable topics are excluded from the score", () => {
    const states: TopicState[] = [
      { topicId: "offense.post", status: "not_applicable", confidence: 0, note: "no true post" },
    ];
    const coverage = computeCoverage({ knowledge: [], topicStates: states });
    const topic = coverage.topics.find((t) => t.topic.id === "offense.post");
    equal(topic!.status, "not_applicable", "status preserved");
    assert(
      !coverage.missingCritical.some((t) => t.id === "offense.post"),
      "an inapplicable topic is never 'missing'",
    );
  });

  await test("film-ready requires every critical topic AND real depth", () => {
    const critical = TOPICS.filter((t) => t.filmCritical);
    const states: TopicState[] = critical.map((t) => ({
      topicId: t.id,
      status: "covered",
      confidence: 1,
      note: null,
    }));
    // One node per critical topic: touched, but thin.
    const thin = critical.map((t, i) => stored({ id: `n${i}`, topicId: t.id }));
    const thinCoverage = computeCoverage({ knowledge: thin, topicStates: states });
    equal(thinCoverage.missingCritical.length, 0, "every critical topic is touched");
    assert(!thinCoverage.filmReady, "one line per topic is not enough depth");

    const deep = critical.flatMap((t, i) => [
      stored({ id: `a${i}`, topicId: t.id, priority: 1 }),
      stored({ id: `b${i}`, topicId: t.id, priority: 2 }),
    ]);
    const deepCoverage = computeCoverage({ knowledge: deep, topicStates: states });
    assert(deepCoverage.filmReady, "depth across every critical topic reaches film-ready");
  });

  // --- next-question logic -------------------------------------------------

  group("Next topic — ReadRep decides what is in play, the model decides how to ask");

  await test("gated topics stay out of play until their prerequisite is answered", () => {
    const open = openTopics({ knowledge: [], topicStates: [] }).map((t) => t.id);
    assert(open.includes("team.identity"), "the ungated opener is available");
    assert(
      !open.includes("offense.ball_screen.vs_drop"),
      "ball-screen reads wait for the coach to say they run ball screens",
    );
  });

  await test("answering a prerequisite unlocks what depends on it", () => {
    const states: TopicState[] = [
      { topicId: "team.identity", status: "covered", confidence: 0.9, note: null },
      { topicId: "offense.system", status: "covered", confidence: 0.9, note: null },
      { topicId: "offense.ball_screen.usage", status: "covered", confidence: 0.9, note: null },
    ];
    const open = openTopics({ knowledge: [], topicStates: states }).map((t) => t.id);
    assert(open.includes("offense.ball_screen.vs_drop"), "drop reads are now in play");
  });

  await test("zone stays out of play until zone actually comes up", () => {
    const states: TopicState[] = [
      { topicId: "team.identity", status: "covered", confidence: 0.9, note: null },
      { topicId: "defense.base", status: "covered", confidence: 0.9, note: null },
    ];
    const manOnly = openTopics({
      knowledge: [stored({ topicId: "defense.base", phase: "defense", action: null, coverage: null, role: null, instruction: "we play man every possession" })],
      topicStates: states,
    }).map((t) => t.id);
    assert(!manOnly.includes("defense.zone"), "a man-only team is never asked about zone");

    const zoneTeam = openTopics({
      knowledge: [stored({ topicId: "defense.base", phase: "defense", action: null, coverage: null, role: null, instruction: "we sit in a 2-3 zone" })],
      topicStates: states,
    }).map((t) => t.id);
    assert(zoneTeam.includes("defense.zone"), "mentioning a zone puts zone specifics in play");
  });

  await test("film-critical gaps are ranked ahead of nice-to-haves", () => {
    const open = openTopics({ knowledge: [], topicStates: [] });
    assert(open.length > 0, "there is something to ask");
    assert(open[0].filmCritical, "the first thing ReadRep wants is film-critical");
  });

  await test("a topic marked not_applicable is never asked again", () => {
    const states: TopicState[] = [
      { topicId: "team.identity", status: "covered", confidence: 0.9, note: null },
      { topicId: "team.personnel", status: "not_applicable", confidence: 0, note: null },
    ];
    const open = openTopics({ knowledge: [], topicStates: states }).map((t) => t.id);
    assert(!open.includes("team.personnel"), "ReadRep does not re-ask what doesn't apply");
  });

  // --- retrieval -----------------------------------------------------------

  group("Retrieval — a read only surfaces in the situation it belongs to");

  const graph: KnowledgeNode[] = [
    stored({ id: "drop-1", instruction: "turn the corner", priority: 1 }),
    stored({
      id: "drop-2",
      instruction: "hit the roller",
      trigger: "the big commits to the ball",
      parentId: "drop-1",
      priority: 2,
    }),
    stored({
      id: "switch-1",
      topicId: "offense.ball_screen.vs_switch",
      coverage: "switch",
      instruction: "hunt the mismatch immediately",
    }),
    stored({
      id: "trans-1",
      topicId: "offense.pace",
      action: "transition",
      coverage: null,
      role: null,
      instruction: "push it on every miss",
    }),
    stored({
      id: "priorities-1",
      topicId: "coaching.priorities",
      phase: "coaching",
      action: null,
      coverage: null,
      role: null,
      instruction: "we correct effort before we correct technique",
    }),
  ];

  await test("drop reads do not surface on a switched ball screen", () => {
    const reads = selectReads(graph, {
      phase: "offense",
      action: "ball_screen",
      coverage: "switch",
    });
    const ids = reads.map((r) => r.node.id);
    assert(!ids.includes("drop-1"), "vs-drop rules must not bleed into a switch");
    assert(ids.includes("switch-1"), "the switch rule is retrieved");
  });

  await test("ball-screen coverage rules do not surface in transition", () => {
    const reads = selectReads(graph, { phase: "offense", action: "transition" });
    const ids = reads.map((r) => r.node.id);
    assert(!ids.includes("drop-1"), "a coverage read is meaningless without a ball screen");
    assert(!ids.includes("switch-1"), "same for the switch read");
    assert(ids.includes("trans-1"), "the transition read is retrieved");
  });

  await test("coaching knowledge is always in scope", () => {
    const reads = selectReads(graph, { phase: "offense", action: "post" });
    assert(
      reads.some((r) => r.node.id === "priorities-1"),
      "how the coach coaches applies to every possession",
    );
  });

  await test("defensive situations do not retrieve offensive reads", () => {
    const reads = selectReads(graph, { phase: "defense", action: "ball_screen", coverage: "drop" });
    const ids = reads.map((r) => r.node.id);
    assert(!ids.includes("drop-1"), "an offensive read is not defensive instruction");
  });

  await test("a conditional chain is retrieved intact and in order", () => {
    const reads = selectReads(graph, {
      phase: "offense",
      action: "ball_screen",
      coverage: "drop",
      role: "ball_handler",
    });
    const root = reads.find((r) => r.node.id === "drop-1");
    assert(root, "the first read is retrieved");
    equal(root!.children.length, 1, "its branch comes with it");
    equal(root!.children[0].id, "drop-2", "the branch is the right one");

    const prompt = readsToPrompt(reads);
    includes(prompt, "turn the corner", "prompt carries the first read");
    includes(prompt, "If the big commits to the ball → hit the roller", "prompt carries the branch");
  });

  await test("the most specifically-scoped read is ranked first", () => {
    const reads = selectReads(graph, {
      phase: "offense",
      action: "ball_screen",
      coverage: "drop",
      role: "ball_handler",
    });
    equal(reads[0].node.id, "drop-1", "the exact-match read leads");
  });

  await test("inferred knowledge is flagged in the prompt", () => {
    const reads = selectReads(
      [stored({ id: "guess", source: "inferred", instruction: "probably spaces the corner" })],
      { phase: "offense", action: "ball_screen", coverage: "drop" },
    );
    includes(readsToPrompt(reads), "(inferred, unconfirmed)", "a guess is never presented as fact");
  });

  report();
}

void main();
