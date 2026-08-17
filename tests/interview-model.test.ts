/**
 * Pure-logic tests: normalization of model output, the free-text condition
 * parser that replaced the schema's enums, redundancy detection, information
 * gain, adaptive film readiness, and situation-scoped retrieval.
 *
 *   npm run test:model
 */

import { assert, equal, group, includes, report, test } from "./harness";

import * as z from "zod/v4";
import { InterviewTurnSchema } from "@/lib/ai/schemas";
import { normalizeTurn, fingerprintOf, describeNode } from "@/lib/interview/normalize";
import { parseConditions, categoriseTerm } from "@/lib/interview/conditions";
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
import { fact, node, turnOutput, unknown, RICH_ANSWER, RICH_ANSWER_FACTS } from "./fixtures";

const emptyContext = {
  knownNodeIds: new Set<string>(),
  existingTerms: new Set<string>(),
  openUnknowns: new Set<string>(),
};

async function main() {
  // -------------------------------------------------------------------------
  group("The output contract stays small enough to compile");

  await test("no bounded repetition reaches the grammar", () => {
    const js = z.toJSONSchema(InterviewTurnSchema, { io: "output" }) as Record<string, unknown>;
    let maxItems = 0;
    let lengths = 0;
    let enumMembers = 0;

    const walk = (n: unknown) => {
      if (!n || typeof n !== "object") return;
      const o = n as Record<string, unknown>;
      if (typeof o.maxItems === "number" || typeof o.minItems === "number") maxItems++;
      if (typeof o.maxLength === "number" || typeof o.minLength === "number") lengths++;
      if (Array.isArray(o.enum)) enumMembers += o.enum.length;
      for (const v of Object.values(o)) walk(v);
    };
    walk(js);

    // Each of these forces a grammar compiler to unroll. Anthropic rejected an
    // earlier version of this schema with "The compiled grammar is too large";
    // these three assertions are what stop that regressing.
    equal(maxItems, 0, "no array item bounds — caps are applied in normalize.ts");
    equal(lengths, 0, "no string length bounds — lengths are trimmed in normalize.ts");
    assert(enumMembers <= 20, `enum members kept small (found ${enumMembers})`);
    assert(JSON.stringify(js).length < 3000, "schema stays compact");
  });

  // -------------------------------------------------------------------------
  group("Conditions — basketball vocabulary lives in code, not the grammar");

  await test("maps a natural ball-screen situation", () => {
    const s = parseConditions(["side ball screen", "vs drop", "ball handler"], "offense");
    equal(s.action, "ball_screen", "action");
    equal(s.coverage, "drop", "coverage");
    equal(s.role, "ball_handler", "role");
    equal(s.trigger, null, "nothing conditional");
  });

  await test("conditional language becomes a trigger, not a scope", () => {
    const s = parseConditions(["side ball screen", "vs drop", "if the big commits to the ball"], "offense");
    equal(s.coverage, "drop", "scope still parsed");
    equal(s.trigger, "the big commits to the ball", "the condition is the trigger");
  });

  await test("the same phrase means different things by phase", () => {
    equal(parseConditions(["weak side"], "offense").role, "off_ball", "offense: a spacer");
    equal(parseConditions(["weak side"], "defense").role, "weak_side", "defense: helpside");
  });

  await test("coach synonyms land on the right coverage", () => {
    equal(parseConditions(["blue"], "defense").coverage, "ice", "a team's word for ice");
    equal(parseConditions(["we trap it"], "defense").coverage, "blitz", "trap is a blitz");
    equal(parseConditions(["hard hedge"], "defense").coverage, "hedge", "hedge");
  });

  await test("a coverage implies a ball screen", () => {
    equal(parseConditions(["vs drop"], "offense").action, "ball_screen", "coverage needs a screen");
  });

  await test("nothing the coach said is silently discarded", () => {
    const s = parseConditions(["after a defensive rebound"], "offense");
    includes(s.trigger ?? "", "after a defensive rebound", "unmatched phrasing is kept as a trigger");
  });

  await test("bare vocabulary values pass straight through", () => {
    const s = parseConditions(["ball_screen", "ice", "low_man", "late"], "defense");
    equal(s.action, "ball_screen", "action");
    equal(s.coverage, "ice", "coverage");
    equal(s.role, "low_man", "role");
    equal(s.clock, "late", "clock");
  });

  await test("terminology categories are derived rather than asked for", () => {
    equal(categoriseTerm("Zoom", "pin-down into a handoff"), "screening", "screening term");
    equal(categoriseTerm("Shake", "weak-side player lifts out of the corner"), "spacing", "spacing term");
    equal(categoriseTerm("Blue", "our ice coverage on the sideline"), "defense", "defensive term");
  });

  // -------------------------------------------------------------------------
  group("Normalization — the model cannot write outside ReadRep's vocabulary");

  await test("discards knowledge tagged with an area ReadRep doesn't have", () => {
    const result = normalizeTurn(
      turnOutput({ knowledge_updates: [fact({ area: "offense.vibes" })] }),
      emptyContext,
    );
    equal(result.nodes.length, 0, "invented area dropped");
    assert(result.rejected.some((r) => r.includes("offense.vibes")), "and reported");
  });

  await test("caps that the grammar no longer enforces are applied here", () => {
    const result = normalizeTurn(
      turnOutput({
        assistant_message: "x".repeat(5000),
        knowledge_updates: Array.from({ length: 40 }, (_, i) =>
          fact({ concept: `c${i}`, value: `${"y".repeat(400)} ${i}` }),
        ),
        unknowns: Array.from({ length: 30 }, (_, i) => ({
          area: "offense.principles",
          question: `gap ${i}`,
          importance: 0.5,
          resolved: false,
        })),
        suggested_answers: Array.from({ length: 20 }, (_, i) => `answer ${i}`),
      }),
      emptyContext,
    );
    assert(result.assistantMessage.length <= 900, "message trimmed");
    assert(result.nodes.length <= 20, `knowledge capped (got ${result.nodes.length})`);
    assert(result.nodes.every((n) => n.instruction.length <= 240), "values trimmed");
    assert(result.unknowns.length <= 8, `gaps capped (got ${result.unknowns.length})`);
    assert(result.suggestions.length <= 4, "suggestions capped");
  });

  await test("confirmed and inferred stay separate", () => {
    const result = normalizeTurn(
      turnOutput({
        knowledge_updates: [
          fact({ value: "5-out" }),
          fact({
            area: "offense.principles",
            value: "spacing around penetration matters",
            provenance: "inferred",
            confidence: 0.9,
          }),
        ],
      }),
      emptyContext,
    );
    equal(result.nodes.length, 2, "both stored");
    equal(result.nodes[0].provenance, "confirmed", "the coach's words");
    equal(result.nodes[1].provenance, "inferred", "ReadRep's guess");
    assert(result.nodes[1].confidence <= 0.5, "a guess never looks like a stated fact");
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
      "so confirming a guess promotes it rather than colliding",
    );
  });

  await test("revise / retire / confirm all require an id from this playbook", () => {
    for (const op of ["revise", "retire", "confirm"] as const) {
      const result = normalizeTurn(
        turnOutput({ knowledge_updates: [fact({ op, target_id: "someone-elses-row" })] }),
        emptyContext,
      );
      equal(result.updates.length, 0, `${op} against an unknown id is refused`);
    }
  });

  await test("a known id is accepted and carries its op", () => {
    const result = normalizeTurn(
      turnOutput({
        knowledge_updates: [
          fact({ op: "revise", target_id: "k-1", value: "reject the screen", replaces_confirmed_rule: true }),
        ],
      }),
      { ...emptyContext, knownNodeIds: new Set(["k-1"]) },
    );
    equal(result.updates.length, 1, "accepted");
    equal(result.updates[0].op, "revise", "op preserved");
    equal(result.updates[0].replacesConfirmedRule, true, "flagged for the coach to confirm");
  });

  await test("drops a defensive role from an offensive read", () => {
    const result = normalizeTurn(
      turnOutput({
        knowledge_updates: [fact({ area: "offense.ball_screen_reads", conditions: ["low man"] })],
      }),
      emptyContext,
    );
    // "low man" is defensive; on an offensive area it must not be stored as a role.
    equal(result.nodes[0].role, null, "incoherent role dropped, instruction kept");
  });

  await test("only a gap that is open can be closed", () => {
    const result = normalizeTurn(
      turnOutput({
        unknowns: [
          { area: "offense.principles", question: "A question nobody asked", importance: 0.5, resolved: true },
          { area: "offense.principles", question: "Where does help come from?", importance: 0.5, resolved: true },
        ],
      }),
      { ...emptyContext, openUnknowns: new Set(["where does help come from?"]) },
    );
    equal(result.resolvedUnknowns.length, 1, "invented resolutions ignored");
  });

  await test("areas the coach ruled out are kept, invented ones are not", () => {
    const result = normalizeTurn(
      turnOutput({ areas_not_applicable: ["offense.post_reads", "offense.nonsense"] }),
      emptyContext,
    );
    equal(result.notApplicable.length, 1, "only real areas");
    equal(result.notApplicable[0], "offense.post_reads", "the real one survives");
  });

  await test("an exception is not treated as a contradiction", () => {
    const result = normalizeTurn(
      turnOutput({
        conflicts: [{ description: "Switches everything, but not with the 5", likely_exception: true }],
      }),
      emptyContext,
    );
    equal(result.conflicts[0].likelyException, true, "read as an exception");
  });

  // -------------------------------------------------------------------------
  group("One answer, many facts — with the chain rebuilt in code");

  await test("the brief's example answer produces seven facts across five areas", () => {
    const result = normalizeTurn(
      turnOutput({ knowledge_updates: RICH_ANSWER_FACTS }),
      emptyContext,
    );
    equal(result.nodes.length, 7, "every fact in the answer is kept");
    equal(new Set(result.nodes.map((n) => n.areaId)).size, 5, "across five areas");

    const drop = result.nodes.find((n) => n.areaId === "offense.ball_screen_reads");
    equal(drop?.coverage, "drop", "vs-drop is scoped from free text, not prose");
    equal(drop?.role, "ball_handler", "and so is the role");
    equal(drop?.action, "ball_screen", "and the action");
  });

  await test("a conditional read is linked to the read it branches from", () => {
    const result = normalizeTurn(
      turnOutput({
        knowledge_updates: [
          fact({
            area: "offense.ball_screen_reads",
            value: "turn the corner",
            conditions: ["side ball screen", "vs drop", "ball handler"],
          }),
          fact({
            area: "offense.ball_screen_reads",
            value: "hit the roller",
            conditions: ["side ball screen", "vs drop", "ball handler", "if the big commits to the ball"],
          }),
        ],
      }),
      emptyContext,
    );
    equal(result.nodes.length, 2, "both reads");
    const root = result.nodes.find((n) => n.trigger === null);
    const branch = result.nodes.find((n) => n.trigger !== null);
    equal(branch?.parentRef, root?.ref, "the chain is rebuilt without schema support");
    equal(root?.priority, 1, "the unconditional read is the first look");
    equal(
      describeNode(branch!),
      "If the big commits to the ball → hit the roller",
      "and it renders as a read",
    );
  });

  await test("everything that answer covers is then refused as a follow-up", () => {
    const stored = RICH_ANSWER_FACTS.map((f) =>
      node({ areaId: f.area, instruction: f.value, coverage: f.conditions.includes("vs drop") ? "drop" : null }),
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
    const r = redundancyFor(AREA_BY_ID.get("offense.identity")!, {
      confirmedCount: 3,
      inferredCount: 0,
      text: "",
      openUnknowns: [],
    });
    assert(r.score >= SKIP_REDUNDANCY, "fully answered means never asked again");
  });

  await test("words in the coach's own answer count even with nothing extracted", () => {
    const r = redundancyFor(AREA_BY_ID.get("offense.identity")!, {
      confirmedCount: 0,
      inferredCount: 0,
      text: "we're 5-out and we play fast",
      openUnknowns: [],
    });
    assert(r.score > 0.3, "indirect answers reduce the need to ask");
  });

  await test("an inference excuses a low-impact area but never a high-impact one", () => {
    const facts = { confirmedCount: 0, inferredCount: 2, text: "", openUnknowns: [] };
    assert(
      redundancyFor(AREA_BY_ID.get("program.language")!, facts).score >= SKIP_REDUNDANCY,
      "a guess is fine for language",
    );
    assert(
      redundancyFor(AREA_BY_ID.get("offense.shot_selection")!, facts).score < SKIP_REDUNDANCY,
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
    const base = { knowledge: [node()], areaStates: [], unknowns: [] };
    const early = rankedQuestions({ ...base, turns: [] }).length;
    const late = rankedQuestions({
      ...base,
      turns: Array.from({ length: 14 }, () => ({ role: "assistant", content: "?" })),
    }).length;
    assert(late < early, `fewer areas clear the bar late (${late} vs ${early})`);
  });

  await test("the highest-value question leads, not the first empty field", () => {
    const open = rankedQuestions({ knowledge: [], areaStates: [], unknowns: [], turns: [] });
    assert(open[0].area.filmImpact >= 0.85, "it's something that moves a film read");
  });

  // -------------------------------------------------------------------------
  group("Adapting to the coach");

  await test("a team that barely uses ball screens is not interviewed about them", () => {
    const open = rankedQuestions({
      knowledge: [],
      areaStates: [],
      unknowns: [],
      turns: [{ role: "coach", content: "We're 4-out-1-in and everything runs through our post. We barely use ball screens." }],
    }).map((a) => a.area.id);
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
  group("Film readiness — evidence only, weighted by what this team does");

  await test("an empty playbook is not ready and says what's missing", () => {
    const r = calculateFilmReadiness({ knowledge: [], areaStates: [], unknowns: [], turns: [] });
    equal(r.status, "learning", "nothing learned is not ready");
    assert(r.essentialsMissing.length > 0, "essentials are named");
    assert(!r.headline.includes("%"), "no fake precision shown to the coach");
  });

  await test("the model can no longer report coverage it doesn't have", () => {
    // Area state carries no confidence the model supplied any more — the only
    // thing that moves an area is confirmed facts landing in it.
    const r = calculateFilmReadiness({
      knowledge: [],
      areaStates: [
        { areaId: "offense.identity", status: "covered", confidence: 1, note: null },
        { areaId: "defense.identity", status: "covered", confidence: 1, note: null },
      ],
      unknowns: [],
      turns: [],
    });
    equal(r.status, "learning", "self-reported coverage counts for nothing");
  });

  const coverAreas = (ids: string[]) =>
    ids.flatMap((areaId) => [
      node({ areaId, instruction: `${areaId} a` }),
      node({ areaId, instruction: `${areaId} b`, priority: 2 }),
      node({ areaId, instruction: `${areaId} c`, priority: 3 }),
    ]);

  await test("a team with no ball screens is not held back by ball-screen reads", () => {
    const r = calculateFilmReadiness({
      knowledge: coverAreas([
        "offense.identity", "offense.shot_selection", "defense.identity", "program.priorities",
        "offense.principles", "offense.actions", "defense.principles", "program.decision_vs_outcome",
        "defense.ball_screen_coverage", "offense.transition", "defense.transition",
        "offense.post_reads", "program.language",
      ]),
      areaStates: [],
      unknowns: [],
      turns: [{ role: "coach", content: "We're 4-out-1-in, post heavy. We barely use ball screens." }],
    });
    equal(r.status, "film_ready", "ready without any ball-screen knowledge");
  });

  await test("a ball-screen team IS held back by the same gap", () => {
    const r = calculateFilmReadiness({
      knowledge: coverAreas([
        "offense.identity", "offense.shot_selection", "defense.identity", "program.priorities",
        "offense.principles", "offense.actions", "defense.principles",
      ]),
      areaStates: [],
      unknowns: [],
      turns: [{ role: "coach", content: "Our whole offense is side ball screens and pick and roll." }],
    });
    assert(r.status !== "film_ready", "the thing they actually run has to be known");
  });

  await test("an important unresolved gap blocks readiness", () => {
    const knowledge = coverAreas([
      "offense.identity", "offense.shot_selection", "defense.identity", "program.priorities",
      "offense.principles", "defense.principles", "offense.actions", "defense.ball_screen_coverage",
    ]);
    const turns = [{ role: "coach", content: "man to man, 5-out, play fast" }];

    equal(
      calculateFilmReadiness({ knowledge, areaStates: [], unknowns: [], turns }).status,
      "film_ready",
      "ready without the gap",
    );
    assert(
      calculateFilmReadiness({
        knowledge,
        areaStates: [],
        unknowns: [unknown({ areaId: "offense.principles", importance: 0.85 })],
        turns,
      }).status !== "film_ready",
      "a gap that matters holds it back",
    );
  });

  await test("an area the coach ruled out stops counting against readiness", () => {
    const snap = {
      knowledge: coverAreas(["offense.identity", "offense.shot_selection", "defense.identity", "program.priorities", "offense.principles", "defense.principles", "offense.actions", "defense.ball_screen_coverage"]),
      areaStates: [{ areaId: "offense.post_reads", status: "not_applicable" as const, confidence: 0, note: null }],
      unknowns: [],
      turns: [{ role: "coach", content: "man, 5-out, fast" }],
    };
    const post = assessAreas(snap).find((a) => a.area.id === "offense.post_reads");
    equal(post?.confidence, 0, "an inapplicable area holds no confidence");
    assert(
      !calculateFilmReadiness(snap).essentialsMissing.some((a) => a.id === "offense.post_reads"),
      "and is never listed as missing",
    );
  });

  await test("the interview stops when nothing left is worth asking", () => {
    const { end } = shouldEndOnboarding({
      knowledge: coverAreas([
        "offense.identity", "offense.shot_selection", "defense.identity", "program.priorities",
        "offense.principles", "defense.principles", "offense.actions",
        "defense.ball_screen_coverage", "offense.transition", "defense.transition",
        "program.decision_vs_outcome", "program.language",
      ]),
      areaStates: [],
      unknowns: [],
      turns: [{ role: "coach", content: "man to man, 5-out, fast, no post, barely use ball screens" }],
    });
    assert(end, "ReadRep stops rather than filling in obscure categories");
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

  await test("a chain is retrieved intact and guesses stay flagged", () => {
    const reads = selectReads(graph, { phase: "offense", action: "ball_screen", coverage: "drop", role: "ball_handler" });
    equal(reads.find((r) => r.node.id === "drop-1")?.children[0]?.id, "drop-2", "the branch comes with it");

    const prompt = readsToPrompt(selectReads(graph, { phase: "offense" }));
    includes(prompt, "If the big commits to the ball → hit the roller", "chain rendered");
    includes(prompt, "(inferred, unconfirmed)", "a guess is never presented as fact");
  });

  report();
}

void main();
