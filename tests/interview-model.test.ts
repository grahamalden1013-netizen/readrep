/**
 * Pure-logic tests: normalization of model output, redundancy detection,
 * information gain, adaptive film readiness, and situation-scoped retrieval.
 * No database, no model provider.
 *
 *   npm run test:model
 */

import { assert, equal, group, includes, report, test } from "./harness";

import { normalizeTurn, fingerprintOf, describeNode } from "@/lib/interview/normalize";
import {
  assessAreas,
  calculateFilmReadiness,
  questionThreshold,
  rankedQuestions,
  redundancyFor,
  shouldEndOnboarding,
  skippedAreas,
  SKIP_REDUNDANCY,
} from "@/lib/interview/gain";
import { AREA_BY_ID, deriveSignals } from "@/lib/interview/areas";
import { selectReads, readsToPrompt } from "@/lib/interview/retrieval";
import type { KnowledgeNode } from "@/lib/interview/types";
import { node, outputNode, turnOutput, unknown, RICH_ANSWER, RICH_ANSWER_FACTS } from "./fixtures";

const emptyContext = {
  knownNodeIds: new Set<string>(),
  existingTerms: new Set<string>(),
  openUnknowns: new Set<string>(),
};

async function main() {
  // -------------------------------------------------------------------------
  group("Normalization — the model cannot write outside ReadRep's vocabulary");

  await test("discards knowledge tagged with an area ReadRep doesn't have", () => {
    const result = normalizeTurn(
      turnOutput({ confirmed_knowledge_updates: [outputNode({ area_id: "offense.vibes" })] }),
      emptyContext,
    );
    equal(result.nodes.length, 0, "invented area dropped");
    assert(result.rejected.some((r) => r.includes("offense.vibes")), "and reported");
  });

  await test("confirmed and inferred stay separate all the way through", () => {
    const result = normalizeTurn(
      turnOutput({
        confirmed_knowledge_updates: [outputNode({ ref: "c", instruction: "5-out alignment" })],
        inferred_knowledge_updates: [
          outputNode({
            ref: "i",
            area_id: "offense.principles",
            instruction: "spacing around penetration matters",
            confidence: 0.9,
          }),
        ],
      }),
      emptyContext,
    );
    equal(result.nodes.length, 2, "both stored");
    equal(result.nodes.find((n) => n.ref === "c")?.provenance, "confirmed", "coach's words");
    equal(result.nodes.find((n) => n.ref === "i")?.provenance, "inferred", "ReadRep's guess");
  });

  await test("an inference can never look as certain as something the coach said", () => {
    const result = normalizeTurn(
      turnOutput({
        inferred_knowledge_updates: [outputNode({ ref: "i", confidence: 1 })],
      }),
      emptyContext,
    );
    assert(result.nodes[0].confidence <= 0.5, "a guess is capped below a stated fact");
  });

  await test("a confirmed rule and an inference about the same slot are different rows", () => {
    const base = {
      areaId: "offense.ball_screen_reads",
      phase: "offense",
      action: "ball_screen",
      coverage: "drop",
      role: "ball_handler",
      clock: null,
      trigger: null,
      priority: 1,
    };
    assert(
      fingerprintOf({ ...base, provenance: "confirmed" }) !==
        fingerprintOf({ ...base, provenance: "inferred" }),
      "so confirming a guess promotes it rather than colliding with it",
    );
  });

  await test("refuses an update naming a row that isn't this playbook's", () => {
    const result = normalizeTurn(
      turnOutput({
        updated_knowledge: [
          { id: "someone-elses-row", instruction: "leak", trigger: null, priority: null, confidence: null, retire: false, replaces_confirmed_rule: false, reason: null },
        ],
      }),
      emptyContext,
    );
    equal(result.updates.length, 0, "cross-row write refused");
  });

  await test("flags a replacement of a confirmed rule instead of applying it", () => {
    const result = normalizeTurn(
      turnOutput({
        updated_knowledge: [
          { id: "k-1", instruction: "we ICE all side ball screens", trigger: null, priority: null, confidence: null, retire: false, replaces_confirmed_rule: true, reason: "Coach changed coverage" },
        ],
      }),
      { ...emptyContext, knownNodeIds: new Set(["k-1"]) },
    );
    equal(result.updates[0].replacesConfirmedRule, true, "marked for the coach to confirm");
  });

  await test("keeps an exception separate from a contradiction", () => {
    const result = normalizeTurn(
      turnOutput({
        knowledge_conflicts: [
          { id: null, description: "Switches everything, but not with the 5", likely_exception: true },
        ],
      }),
      emptyContext,
    );
    equal(result.conflicts[0].likelyException, true, "read as an exception, not an error");
  });

  await test("only resolves unknowns that are actually open", () => {
    const result = normalizeTurn(
      turnOutput({ resolved_unknowns: ["A question nobody asked", "Where does help come from?"] }),
      { ...emptyContext, openUnknowns: new Set(["where does help come from?"]) },
    );
    equal(result.resolvedUnknowns.length, 1, "invented resolutions ignored");
  });

  await test("drops a defensive role from an offensive read", () => {
    const result = normalizeTurn(
      turnOutput({ confirmed_knowledge_updates: [outputNode({ role: "low_man" })] }),
      emptyContext,
    );
    equal(result.nodes[0].role, null, "incoherent role dropped, instruction kept");
  });

  await test("keeps a conditional chain intact", () => {
    const result = normalizeTurn(
      turnOutput({
        confirmed_knowledge_updates: [
          outputNode({ ref: "root", area_id: "offense.ball_screen_reads", instruction: "turn the corner" }),
          outputNode({
            ref: "branch",
            area_id: "offense.ball_screen_reads",
            parent_ref: "root",
            trigger: "the big commits to the ball",
            instruction: "hit the roller",
            priority: 2,
          }),
        ],
      }),
      emptyContext,
    );
    equal(result.nodes.find((n) => n.ref === "branch")?.parentRef, "root", "chain preserved");
    equal(
      describeNode(result.nodes[1]),
      "If the big commits to the ball → hit the roller",
      "renders as a read",
    );
  });

  // -------------------------------------------------------------------------
  group("One answer, many facts");

  await test("the brief's example answer produces seven confirmed facts across five areas", () => {
    const result = normalizeTurn(
      turnOutput({ confirmed_knowledge_updates: RICH_ANSWER_FACTS }),
      emptyContext,
    );
    equal(result.nodes.length, 7, "every fact in the answer is kept");
    const areas = new Set(result.nodes.map((n) => n.areaId));
    equal(areas.size, 5, "spread across five areas of the framework");
    assert(
      result.nodes.some((n) => n.coverage === "drop" && n.role === "ball_handler"),
      "the vs-drop read is scoped, not stored as prose",
    );
  });

  await test("everything that answer covers is then refused as a follow-up", () => {
    const stored = RICH_ANSWER_FACTS.map((f) =>
      node({ areaId: f.area_id, instruction: f.instruction, coverage: f.coverage, action: f.action, role: f.role }),
    );
    const snap = {
      knowledge: stored,
      areaStates: [],
      unknowns: [],
      turns: [{ role: "coach", content: RICH_ANSWER }],
    };

    const skipped = skippedAreas(snap).map((a) => a.area.id);
    for (const id of ["offense.identity", "offense.actions", "offense.ball_screen_reads", "offense.shot_selection"]) {
      assert(skipped.includes(id), `${id} is not asked about again`);
    }

    const open = rankedQuestions(snap).map((a) => a.area.id);
    assert(
      open.includes("defense.identity") || open.includes("program.priorities"),
      "and the next question moves to something genuinely unknown",
    );
  });

  // -------------------------------------------------------------------------
  group("Redundancy — asking is refused, not merely discouraged");

  await test("an area the coach fully answered is above the skip line", () => {
    const area = AREA_BY_ID.get("offense.identity")!;
    const r = redundancyFor(area, {
      confirmedCount: 3,
      inferredCount: 0,
      text: "",
      openUnknowns: [],
    });
    assert(r.score >= SKIP_REDUNDANCY, "fully answered means never asked again");
  });

  await test("words in the coach's own answer count even with nothing extracted", () => {
    const area = AREA_BY_ID.get("offense.identity")!;
    const r = redundancyFor(area, {
      confirmedCount: 0,
      inferredCount: 0,
      text: "we're 5-out and we play fast",
      openUnknowns: [],
    });
    assert(r.score > 0.3, "indirect answers reduce the need to ask");
    includes(r.reason ?? "", "already touch", "and the reason says why");
  });

  await test("an inference excuses a low-impact area but never a high-impact one", () => {
    const low = AREA_BY_ID.get("program.language")!;
    const high = AREA_BY_ID.get("offense.shot_selection")!;
    const facts = { confirmedCount: 0, inferredCount: 2, text: "", openUnknowns: [] };

    assert(redundancyFor(low, facts).score >= SKIP_REDUNDANCY, "a guess is fine for language");
    assert(
      redundancyFor(high, facts).score < SKIP_REDUNDANCY,
      "but shot selection still needs the coach",
    );
  });

  await test("a specific open gap pulls redundancy back down", () => {
    const area = AREA_BY_ID.get("offense.principles")!;
    const without = redundancyFor(area, { confirmedCount: 2, inferredCount: 0, text: "", openUnknowns: [] });
    const withGap = redundancyFor(area, {
      confirmedCount: 2,
      inferredCount: 0,
      text: "",
      openUnknowns: [unknown({ importance: 0.9 })],
    });
    assert(withGap.score < without.score, "a known missing piece reopens the area");
  });

  // -------------------------------------------------------------------------
  group("Information gain — the bar rises as the interview goes on");

  await test("a later question must be worth more than an early one", () => {
    assert(questionThreshold(12) > questionThreshold(0), "interview fatigue is priced in");
  });

  await test("low-value areas drop off once the conversation is long", () => {
    const base = { knowledge: [node({ areaId: "offense.identity" })], areaStates: [], unknowns: [] };
    const early = rankedQuestions({ ...base, turns: [] }).length;
    const late = rankedQuestions({
      ...base,
      turns: Array.from({ length: 14 }, () => ({ role: "assistant", content: "?" })),
    }).length;
    assert(late < early, `fewer areas clear the bar late (${late} vs ${early})`);
  });

  await test("the highest-value question leads, not the first empty field", () => {
    const open = rankedQuestions({ knowledge: [], areaStates: [], unknowns: [], turns: [] });
    assert(open.length > 0, "something to ask");
    assert(open[0].area.filmImpact >= 0.85, "and it's something that moves a film read");
  });

  // -------------------------------------------------------------------------
  group("Adapting to the coach");

  await test("a team that barely uses ball screens is not interviewed about them", () => {
    const snap = {
      knowledge: [],
      areaStates: [],
      unknowns: [],
      turns: [{ role: "coach", content: "We're 4-out-1-in and everything runs through our post. We barely use ball screens." }],
    };
    const open = rankedQuestions(snap).map((a) => a.area.id);
    assert(!open.includes("offense.ball_screen_reads"), "no pick-and-roll interview");
    assert(open.includes("offense.post_reads"), "post play is asked about instead");
  });

  await test("a zone team gets zone questions; a man team never does", () => {
    const zone = rankedQuestions({
      knowledge: [],
      areaStates: [],
      unknowns: [],
      turns: [{ role: "coach", content: "We sit in a 2-3 zone almost every possession." }],
    }).map((a) => a.area.id);
    assert(zone.includes("defense.zone"), "zone principles are in play");

    const man = rankedQuestions({
      knowledge: [],
      areaStates: [],
      unknowns: [],
      turns: [{ role: "coach", content: "We play man to man every possession and switch 1 through 4." }],
    }).map((a) => a.area.id);
    assert(!man.includes("defense.zone"), "a man team is never asked about zone");
  });

  await test("negations are read correctly", () => {
    equal(deriveSignals("we barely use ball screens").ballScreens, "no", "denial beats mention");
    equal(deriveSignals("we run a lot of side ball screens").ballScreens, "yes", "mention counts");
    equal(deriveSignals("we play fast").ballScreens, "unknown", "silence is silence");
  });

  // -------------------------------------------------------------------------
  group("Film readiness — weighted by what this team actually does");

  await test("an empty playbook is not ready and says what's missing", () => {
    const r = calculateFilmReadiness({ knowledge: [], areaStates: [], unknowns: [], turns: [] });
    equal(r.status, "learning", "nothing learned is not ready");
    assert(r.essentialsMissing.length > 0, "essentials are named");
    assert(!r.headline.includes("%"), "no fake precision shown to the coach");
  });

  await test("a claim with nothing stored behind it does not count", () => {
    const r = calculateFilmReadiness({
      knowledge: [],
      areaStates: [
        { areaId: "offense.identity", status: "covered", confidence: 1, note: null },
        { areaId: "offense.shot_selection", status: "covered", confidence: 1, note: null },
        { areaId: "defense.identity", status: "covered", confidence: 1, note: null },
        { areaId: "program.priorities", status: "covered", confidence: 1, note: null },
      ],
      unknowns: [],
      turns: [],
    });
    equal(r.status, "learning", "self-reported coverage is not evidence");
  });

  await test("a team with no ball screens is not held back by ball-screen reads", () => {
    const essentials = ["offense.identity", "offense.shot_selection", "defense.identity", "program.priorities"];
    const supporting = ["offense.principles", "offense.actions", "defense.principles", "program.decision_vs_outcome", "defense.ball_screen_coverage", "offense.transition", "defense.transition", "offense.post_reads", "program.language"];

    const knowledge = [...essentials, ...supporting].flatMap((areaId) => [
      node({ areaId, instruction: `${areaId} first` }),
      node({ areaId, instruction: `${areaId} second`, priority: 2 }),
    ]);
    const areaStates = [...essentials, ...supporting].map((areaId) => ({
      areaId,
      status: "covered" as const,
      confidence: 0.9,
      note: null,
    }));

    const noBallScreens = calculateFilmReadiness({
      knowledge,
      areaStates,
      unknowns: [],
      turns: [{ role: "coach", content: "We're 4-out-1-in, post heavy. We barely use ball screens." }],
    });
    equal(noBallScreens.status, "film_ready", "ready without any ball-screen knowledge");
  });

  await test("a ball-screen team IS held back by the same gap", () => {
    const covered = ["offense.identity", "offense.shot_selection", "defense.identity", "program.priorities", "offense.principles", "offense.actions", "defense.principles"];
    const knowledge = covered.flatMap((areaId) => [
      node({ areaId, instruction: `${areaId} a` }),
      node({ areaId, instruction: `${areaId} b`, priority: 2 }),
    ]);
    const areaStates = covered.map((areaId) => ({
      areaId,
      status: "covered" as const,
      confidence: 0.9,
      note: null,
    }));

    const r = calculateFilmReadiness({
      knowledge,
      areaStates,
      unknowns: [],
      turns: [{ role: "coach", content: "Our whole offense is side ball screens and pick and roll." }],
    });
    assert(r.status !== "film_ready", "the thing they actually run has to be known");
  });

  await test("an important unresolved gap blocks readiness", () => {
    const covered = ["offense.identity", "offense.shot_selection", "defense.identity", "program.priorities", "offense.principles", "defense.principles", "offense.actions", "defense.ball_screen_coverage"];
    const knowledge = covered.flatMap((areaId) => [
      node({ areaId, instruction: `${areaId} a` }),
      node({ areaId, instruction: `${areaId} b`, priority: 2 }),
    ]);
    const areaStates = covered.map((areaId) => ({ areaId, status: "covered" as const, confidence: 0.9, note: null }));
    const turns = [{ role: "coach", content: "man to man, 5-out, play fast" }];

    const clean = calculateFilmReadiness({ knowledge, areaStates, unknowns: [], turns });
    const blocked = calculateFilmReadiness({
      knowledge,
      areaStates,
      unknowns: [unknown({ areaId: "offense.principles", importance: 0.85 })],
      turns,
    });

    equal(clean.status, "film_ready", "ready without the gap");
    assert(blocked.status !== "film_ready", "a gap that matters holds it back");
  });

  await test("the interview stops when nothing left is worth asking", () => {
    const covered = ["offense.identity", "offense.shot_selection", "defense.identity", "program.priorities", "offense.principles", "defense.principles", "offense.actions"];
    const knowledge = covered.flatMap((areaId) => [
      node({ areaId, instruction: `${areaId} a` }),
      node({ areaId, instruction: `${areaId} b`, priority: 2 }),
      node({ areaId, instruction: `${areaId} c`, priority: 3 }),
    ]);
    const areaStates = covered.map((areaId) => ({ areaId, status: "covered" as const, confidence: 0.95, note: null }));

    const { end } = shouldEndOnboarding({
      knowledge,
      areaStates,
      unknowns: [],
      turns: [{ role: "coach", content: "man to man, 5-out, fast, no post, barely use ball screens" }],
    });
    assert(end, "ReadRep stops rather than filling in obscure categories");
  });

  await test("essential areas are the ones a film read cannot do without", () => {
    const essential = assessAreas({ knowledge: [], areaStates: [], unknowns: [], turns: [] })
      .filter((a) => a.area.essential)
      .map((a) => a.area.id);
    for (const id of ["offense.identity", "offense.shot_selection", "defense.identity", "program.priorities"]) {
      assert(essential.includes(id), `${id} is essential`);
    }
  });

  // -------------------------------------------------------------------------
  group("Retrieval — a read only surfaces in the situation it belongs to");

  const graph: KnowledgeNode[] = [
    node({ id: "drop-1", areaId: "offense.ball_screen_reads", action: "ball_screen", coverage: "drop", role: "ball_handler", instruction: "turn the corner" }),
    node({ id: "drop-2", areaId: "offense.ball_screen_reads", action: "ball_screen", coverage: "drop", role: "ball_handler", instruction: "hit the roller", trigger: "the big commits to the ball", parentId: "drop-1", priority: 2 }),
    node({ id: "switch-1", areaId: "offense.ball_screen_reads", action: "ball_screen", coverage: "switch", instruction: "hunt the mismatch" }),
    node({ id: "trans-1", areaId: "offense.transition", action: "transition", instruction: "push it on every miss" }),
    node({ id: "prio-1", areaId: "program.priorities", phase: "coaching", instruction: "effort before technique" }),
    node({ id: "guess-1", areaId: "offense.principles", provenance: "inferred", instruction: "corners hold their spacing", confidence: 0.4 }),
  ];

  await test("drop reads do not surface on a switched ball screen", () => {
    const ids = selectReads(graph, { phase: "offense", action: "ball_screen", coverage: "switch" }).map((r) => r.node.id);
    assert(!ids.includes("drop-1"), "vs-drop rules never bleed into a switch");
    assert(ids.includes("switch-1"), "the switch rule is retrieved");
  });

  await test("coverage rules do not surface in transition", () => {
    const ids = selectReads(graph, { phase: "offense", action: "transition" }).map((r) => r.node.id);
    assert(!ids.includes("drop-1") && !ids.includes("switch-1"), "no ball screen, no coverage rules");
    assert(ids.includes("trans-1"), "the transition read is retrieved");
  });

  await test("how the coach coaches applies to every possession", () => {
    const ids = selectReads(graph, { phase: "defense", action: "half_court" }).map((r) => r.node.id);
    assert(ids.includes("prio-1"), "priorities are always in scope");
  });

  await test("a conditional chain is retrieved intact and flagged inferences stay flagged", () => {
    const reads = selectReads(graph, { phase: "offense", action: "ball_screen", coverage: "drop", role: "ball_handler" });
    const root = reads.find((r) => r.node.id === "drop-1");
    equal(root?.children[0]?.id, "drop-2", "the branch comes with the read");

    const prompt = readsToPrompt(selectReads(graph, { phase: "offense" }));
    includes(prompt, "If the big commits to the ball → hit the roller", "chain rendered");
    includes(prompt, "(inferred, unconfirmed)", "a guess is never presented as fact");
  });

  report();
}

void main();
