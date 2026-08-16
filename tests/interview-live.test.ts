/**
 * Live model test. This is the one that proves the interview actually works
 * with real intelligence rather than a script — everything else in tests/ only
 * proves plumbing.
 *
 * Requires a real key and network access to the provider:
 *
 *   ANTHROPIC_API_KEY=sk-ant-… npx tsx --conditions=react-server tests/interview-live.test.ts
 *
 * It writes nothing to the database: `runInterviewTurn` is pure with respect to
 * storage, so this drives a three-turn conversation entirely in memory.
 */

import { assert, equal, group, report, test } from "./harness";

import { providerMode } from "@/lib/ai/provider";
import { runInterviewTurn } from "@/lib/ai/coach-interview";
import { computeCoverage } from "@/lib/interview/coverage";
import { isKnownTopic } from "@/lib/interview/coverage-model";
import { fingerprintOf } from "@/lib/interview/normalize";
import type { InterviewSnapshot, KnowledgeNode } from "@/lib/interview/types";

delete process.env.READREP_AI_MODE;

const base: InterviewSnapshot = {
  playbookId: "live-pb",
  teamId: "live-team",
  teamName: "Riverside 15U",
  completedAt: null,
  knowledge: [],
  topicStates: [],
  turns: [],
  terms: [],
  scratch: { ambiguities: [], nextTopicId: null },
};

/** Folds a turn's output into the snapshot the way the server action does. */
function apply(snapshot: InterviewSnapshot, coachMessage: string | null, turn: Awaited<ReturnType<typeof runInterviewTurn>>): InterviewSnapshot {
  if (!turn.ok) return snapshot;

  const idByRef = new Map<string, string>();
  const added: KnowledgeNode[] = [];

  for (const n of turn.turn.nodes) {
    const id = `live-${added.length}-${fingerprintOf(n).slice(0, 8)}`;
    idByRef.set(n.ref, id);
    added.push({
      id,
      topicId: n.topicId,
      phase: n.phase,
      action: n.action,
      coverage: n.coverage,
      role: n.role,
      clock: n.clock,
      trigger: n.trigger,
      instruction: n.instruction,
      priority: n.priority,
      confidence: n.confidence,
      source: n.source,
      parentId: n.parentRef ? (idByRef.get(n.parentRef) ?? null) : null,
      createdAt: new Date().toISOString(),
    });
  }

  const states = new Map(snapshot.topicStates.map((s) => [s.topicId, { ...s }]));
  for (const c of turn.turn.coverageUpdates) {
    states.set(c.topicId, {
      topicId: c.topicId,
      status: c.status,
      confidence: states.get(c.topicId)?.confidence ?? 0.5,
      note: c.note,
    });
  }
  for (const c of turn.turn.confidenceUpdates) {
    const prior = states.get(c.topicId);
    states.set(c.topicId, {
      topicId: c.topicId,
      status: prior?.status ?? "partial",
      confidence: c.confidence,
      note: prior?.note ?? null,
    });
  }

  const seq = snapshot.turns.length;
  return {
    ...snapshot,
    knowledge: [...snapshot.knowledge, ...added],
    topicStates: [...states.values()],
    terms: [
      ...snapshot.terms,
      ...turn.turn.terminology.map((t, i) => ({ id: `term-${seq}-${i}`, ...t })),
    ],
    turns: [
      ...snapshot.turns,
      ...(coachMessage
        ? [{ id: `c${seq}`, seq: seq + 1, role: "coach" as const, content: coachMessage, topicId: null, reason: null, createdAt: "" }]
        : []),
      {
        id: `a${seq}`,
        seq: seq + 2,
        role: "assistant" as const,
        content: turn.turn.assistantMessage,
        topicId: turn.turn.nextTopicId,
        reason: turn.turn.nextQuestionReason,
        createdAt: "",
      },
    ],
    scratch: { ambiguities: turn.turn.ambiguities, nextTopicId: turn.turn.nextTopicId },
  };
}

async function main() {
  if (providerMode() !== "live") {
    console.log(
      "\nSKIPPED: no ANTHROPIC_API_KEY. This test only means something against a real model.",
    );
    process.exit(1);
  }

  group("Live model — a real three-turn interview");

  let snapshot = base;

  const opening = await runInterviewTurn(snapshot, null);
  await test("opens with a single question and no invented knowledge", () => {
    assert(opening.ok, `opening turn failed: ${opening.ok ? "" : opening.message}`);
    if (!opening.ok) return;
    console.log(`\n    ReadRep: ${opening.turn.assistantMessage}\n`);
    assert(opening.turn.assistantMessage.length > 0, "it says something");
    equal(
      (opening.turn.assistantMessage.match(/\?/g) ?? []).length,
      1,
      "exactly one question — it is not a survey page",
    );
    assert(
      opening.turn.nodes.every((n) => isKnownTopic(n.topicId)),
      "every extracted topic exists in the coverage model",
    );
  });
  snapshot = apply(snapshot, null, opening);

  const answer1 =
    "We're a 15U AAU team. Five-out motion, we want a paint touch every possession, and we play fast off misses.";
  const turn1 = await runInterviewTurn(snapshot, answer1);
  await test("extracts structured knowledge from a natural-language answer", () => {
    assert(turn1.ok, `turn failed: ${turn1.ok ? "" : turn1.message}`);
    if (!turn1.ok) return;
    console.log(`\n    Coach: ${answer1}`);
    console.log(`    ReadRep: ${turn1.turn.assistantMessage}`);
    console.log(`    learned: ${turn1.turn.nodes.map((n) => n.instruction).join(" | ")}\n`);
    assert(turn1.turn.nodes.length > 0, "something was learned");
    assert(
      turn1.turn.nodes.every((n) => isKnownTopic(n.topicId)),
      "all topics are canonical",
    );
    assert(turn1.turn.rejected.length === 0, `nothing was rejected: ${turn1.turn.rejected.join("; ")}`);
    assert(turn1.turn.coverageUpdates.length > 0, "coverage moved");
  });
  snapshot = apply(snapshot, answer1, turn1);

  const answer2 =
    "Against a drop we want the ball handler to turn the corner and get two feet in the paint. If the big commits to the ball, hit the roller. We call that action Chicago.";
  const turn2 = await runInterviewTurn(snapshot, answer2);
  await test("builds a conditional read chain and picks up the coach's own word", () => {
    assert(turn2.ok, `turn failed: ${turn2.ok ? "" : turn2.message}`);
    if (!turn2.ok) return;
    console.log(`\n    Coach: ${answer2}`);
    console.log(`    ReadRep: ${turn2.turn.assistantMessage}`);
    for (const n of turn2.turn.nodes) {
      console.log(
        `    learned: [${n.topicId}] ${n.coverage ?? "-"}/${n.role ?? "-"} ${n.trigger ? `if ${n.trigger} → ` : ""}${n.instruction}`,
      );
    }
    console.log("");

    assert(
      turn2.turn.nodes.some((n) => n.coverage === "drop"),
      "the drop coverage is recognised and scoped",
    );
    assert(
      turn2.turn.nodes.some((n) => n.trigger !== null) ||
        turn2.turn.nodes.some((n) => n.parentRef !== null),
      "the conditional read is captured as a condition, not flattened into prose",
    );
    assert(
      turn2.turn.terminology.some((t) => t.term.toLowerCase() === "chicago"),
      "the team's own word is detected as terminology",
    );
  });
  snapshot = apply(snapshot, answer2, turn2);

  const answer3 = "Actually scratch that — against a drop we want him to reject the screen instead.";
  const turn3 = await runInterviewTurn(snapshot, answer3);
  await test("a correction updates stored knowledge instead of appending a contradiction", () => {
    assert(turn3.ok, `turn failed: ${turn3.ok ? "" : turn3.message}`);
    if (!turn3.ok) return;
    console.log(`\n    Coach: ${answer3}`);
    console.log(`    ReadRep: ${turn3.turn.assistantMessage}`);
    console.log(`    updates: ${JSON.stringify(turn3.turn.updates)}`);
    console.log(`    corrections: ${turn3.turn.corrections.join(" | ")}\n`);

    assert(
      turn3.turn.updates.length > 0 || turn3.turn.corrections.length > 0,
      "the correction is registered against existing knowledge",
    );
    assert(
      turn3.turn.updates.every((u) => snapshot.knowledge.some((k) => k.id === u.id)),
      "every update names a row that actually exists",
    );
  });
  snapshot = apply(snapshot, answer3, turn3);

  await test("coverage grows but does not jump to film-ready after three turns", () => {
    const coverage = computeCoverage(snapshot);
    console.log(`\n    coverage: ${Math.round(coverage.overall * 100)}%, film-ready: ${coverage.filmReady}`);
    console.log(`    still missing: ${coverage.missingCritical.map((t) => t.label).join(", ")}\n`);
    assert(coverage.overall > 0, "coverage moved off zero");
    assert(!coverage.filmReady, "three answers is not a whole system");
  });

  report();
}

void main();
