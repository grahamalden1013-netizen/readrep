/**
 * Live model test — the one that proves the interview works with real
 * intelligence rather than a script. Everything else in tests/ proves plumbing.
 *
 *   ANTHROPIC_API_KEY=… npm run test:live
 *
 * Writes nothing to the database: the engine is pure with respect to storage,
 * so this drives a four-turn conversation entirely in memory.
 */

import { assert, equal, group, report, test } from "./harness";

import { interviewModel, providerMode } from "@/lib/ai/anthropic";
import { PROMPT_VERSION, runInterviewTurn } from "@/lib/ai/coach-interview";
import { calculateFilmReadiness, skippedAreas } from "@/lib/interview/gain";
import { isKnownArea } from "@/lib/interview/areas";
import { RICH_ANSWER } from "./fixtures";
import { applyTurn, emptyRun } from "./sim-state";

delete process.env.READREP_AI_MODE;

async function main() {
  if (providerMode() !== "live") {
    console.log(
      "\nSKIPPED — no ANTHROPIC_API_KEY. This test only means something against a real model.\n",
    );
    process.exit(1);
  }

  console.log(`\nmodel: ${interviewModel()} · prompt: ${PROMPT_VERSION}\n`);

  let snapshot = emptyRun("Riverside 15U");

  group("Live model — one answer must teach ReadRep many things");

  const opening = await runInterviewTurn(snapshot, null);
  await test("opens with a single broad question and invents nothing", () => {
    assert(opening.ok, `opening turn failed: ${opening.ok ? "" : opening.message}`);
    if (!opening.ok) return;
    console.log(`\n    ReadRep: ${opening.turn.assistantMessage}\n`);
    equal(
      (opening.turn.assistantMessage.match(/\?/g) ?? []).length,
      1,
      "exactly one question — not a survey page",
    );
    equal(opening.turn.nodes.length, 0, "nothing is known before the coach speaks");
  });
  if (opening.ok) snapshot = applyTurn(snapshot, null, opening.turn);

  const turn1 = await runInterviewTurn(snapshot, RICH_ANSWER);
  await test("extracts many facts from one natural-language answer", () => {
    assert(turn1.ok, `turn failed: ${turn1.ok ? "" : turn1.message}`);
    if (!turn1.ok) return;
    console.log(`\n    Coach: ${RICH_ANSWER}`);
    console.log(`    ReadRep: ${turn1.turn.assistantMessage}`);
    for (const n of turn1.turn.nodes) {
      console.log(`    ${n.provenance}: [${n.areaId}] ${n.trigger ? `if ${n.trigger} → ` : ""}${n.instruction}`);
    }
    console.log("");

    const confirmed = turn1.turn.nodes.filter((n) => n.provenance === "confirmed");
    assert(confirmed.length >= 5, `at least five facts from one answer (got ${confirmed.length})`);

    const areas = new Set(confirmed.map((n) => n.areaId));
    assert(areas.size >= 3, `spread across the framework (got ${areas.size} areas)`);
    assert(confirmed.every((n) => isKnownArea(n.areaId)), "every area is canonical");
    assert(turn1.turn.rejected.length === 0, `nothing rejected: ${turn1.turn.rejected.join("; ")}`);

    assert(
      confirmed.some((n) => n.coverage === "drop"),
      "the vs-drop read is scoped from free-text conditions, not stored as prose",
    );
  });
  if (turn1.ok) snapshot = applyTurn(snapshot, RICH_ANSWER, turn1.turn);

  await test("does not then ask what the coach already said", () => {
    if (!turn1.ok) return;
    const q = turn1.turn.assistantMessage.toLowerCase();
    for (const redundant of ["alignment", "do you use ball screens", "do you run ball screens", "do you like playing fast", "what shots do you dislike"]) {
      assert(!q.includes(redundant), `must not ask about "${redundant}"`);
    }

    const settled = skippedAreas(snapshot).map((a) => a.area.id);
    console.log(`\n    ReadRep now refuses to ask about: ${settled.join(", ")}\n`);
    assert(settled.includes("offense.identity"), "alignment and pace are settled");
  });

  const answer2 =
    "If the low man tags the roller, I want the ball handler skipping it to the weak-side corner. We call that shake.";
  const turn2 = await runInterviewTurn(snapshot, answer2);
  await test("builds a conditional chain and picks up the coach's own word", () => {
    assert(turn2.ok, `turn failed: ${turn2.ok ? "" : turn2.message}`);
    if (!turn2.ok) return;
    console.log(`\n    Coach: ${answer2}`);
    console.log(`    ReadRep: ${turn2.turn.assistantMessage}\n`);

    assert(
      turn2.turn.nodes.some((n) => n.trigger !== null) ||
        turn2.turn.nodes.some((n) => n.parentRef !== null),
      "the condition is captured as a condition, not flattened into prose",
    );
    assert(
      turn2.turn.terminology.some((t) => t.term.toLowerCase() === "shake"),
      "the team's own word is detected as terminology",
    );
  });
  if (turn2.ok) snapshot = applyTurn(snapshot, answer2, turn2.turn);

  const answer3 = "Actually, against drop we want him rejecting the screen instead of getting downhill.";
  const turn3 = await runInterviewTurn(snapshot, answer3);
  await test("a correction targets stored knowledge and asks before overwriting", () => {
    assert(turn3.ok, `turn failed: ${turn3.ok ? "" : turn3.message}`);
    if (!turn3.ok) return;
    console.log(`\n    Coach: ${answer3}`);
    console.log(`    ReadRep: ${turn3.turn.assistantMessage}`);
    console.log(`    updates: ${JSON.stringify(turn3.turn.updates)}\n`);

    assert(turn3.turn.updates.length > 0, "the correction lands on existing knowledge");
    assert(
      turn3.turn.updates.every((u) => snapshot.knowledge.some((k) => k.id === u.id)),
      "every update names a row that exists",
    );
    assert(
      turn3.turn.updates.every((u) => ["revise", "retire", "confirm"].includes(u.op)),
      "each update carries a real operation",
    );
    assert(
      turn3.turn.updates.some((u) => u.replacesConfirmedRule),
      "and is flagged as replacing something the coach confirmed",
    );
  });
  if (turn3.ok) snapshot = applyTurn(snapshot, answer3, turn3.turn);

  await test("confirmed and inferred are kept apart", () => {
    const inferred = snapshot.knowledge.filter((k) => k.provenance === "inferred");
    const confirmed = snapshot.knowledge.filter((k) => k.provenance === "confirmed");
    console.log(`\n    confirmed: ${confirmed.length}, inferred: ${inferred.length}\n`);
    assert(confirmed.length > 0, "the coach taught ReadRep things");
    assert(inferred.every((k) => k.confidence <= 0.5), "no guess looks like a stated fact");
  });

  await test("four answers is not a whole system", () => {
    const readiness = calculateFilmReadiness(snapshot);
    console.log(`\n    readiness: ${readiness.status} — ${readiness.reason}`);
    console.log(`    still missing: ${readiness.essentialsMissing.map((a) => a.label).join(", ")}\n`);
    assert(readiness.score > 0, "readiness moved off zero");
    assert(readiness.status !== "film_ready", "but ReadRep doesn't claim it can read film yet");
  });

  report();
}

void main();
