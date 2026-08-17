/**
 * Deterministic readiness and question-selection tests. No Anthropic calls.
 *
 * These exist because the real simulation is expensive and slow: a detailed
 * coach ran to 21 questions and stalled at "almost ready", and finding out why
 * cost a full A–E evaluation. Everything that went wrong there is a property of
 * this engine, so it is pinned here where it costs nothing to check.
 *
 *   npm run test:readiness
 */

import { assert, equal, group, report, test } from "./harness";

import { AREAS } from "@/lib/interview/areas";
import {
  HIGH_VALUE_GAIN,
  SOFT_STOP_ANSWERS,
  assessAreas,
  calculateFilmReadiness,
  confidenceFrom,
  isCoreArea,
  questionThreshold,
  rankedQuestions,
  shouldEndOnboarding,
  substantiveAnswers,
} from "@/lib/interview/gain";
import {
  countBy,
  detailedCoach,
  detailedCoachEarly,
  gap,
  postCoach,
  scenario,
  terseCoach,
  zoneCoach,
} from "./scenarios";

async function main() {
  // -------------------------------------------------------------------------
  group("The interview can actually end");

  /**
   * Walks the interview the way the engine would: repeatedly take the
   * highest-value question, credit the area with what a real answer of that
   * kind would yield, and stop when the engine says stop. This is the cheap
   * deterministic stand-in for the expensive A–E simulation — it measures the
   * question count that the product target is stated in.
   */
  const walk = (start: ReturnType<typeof scenario>, factsPerAnswer: number, cap = 30) => {
    let snap = start;
    const asked: string[] = [];

    for (let i = 0; i < cap; i += 1) {
      if (shouldEndOnboarding(snap).end) break;
      const next = rankedQuestions(snap)[0];
      if (!next) break;

      asked.push(next.area.id);
      snap = scenario({
        answers: [
          ...snap.turns.filter((t) => t.role === "coach").map((t) => t.content),
          `Here is a real answer about ${next.area.label} with enough words to count`,
        ],
        covered: countBy([
          ...snap.knowledge.map((k) => k.areaId),
          ...Array.from({ length: factsPerAnswer }, () => next.area.id),
        ]),
        unknowns: snap.unknowns,
        notApplicable: snap.areaStates.filter((a) => a.status === "not_applicable").map((a) => a.areaId),
      });
    }

    return { asked, snap, readiness: calculateFilmReadiness(snap) };
  };

  await test("a detailed coach finishes inside the product target", () => {
    const { asked, readiness } = walk(detailedCoachEarly(), 2);
    const total = 1 + asked.length; // the opener already happened
    console.log(`       detailed coach: ${total} questions -> ${readiness.status}`);
    console.log(`       asked: ${asked.join(", ")}`);
    assert(total <= 12, `detailed coach must finish within ~12 questions (took ${total})`);
    equal(readiness.status, "film_ready", "and reach film-ready");
  });

  await test("a terse coach takes longer but still terminates", () => {
    const { asked, readiness } = walk(terseCoach(), 1);
    const total = 10 + asked.length;
    console.log(`       terse coach: ${total} questions -> ${readiness.status}`);
    assert(asked.length > 0, "a terse coach still has ground to cover");
    assert(total <= 22, `and still terminates (took ${total})`);
    assert(
      readiness.status === "film_ready" || shouldEndOnboarding(walk(terseCoach(), 1).snap).end,
      "either by reaching ready or by running out of worthwhile questions",
    );
  });

  await test("the interview always terminates, for every kind of coach", () => {
    for (const [name, start] of [
      ["detailed", detailedCoachEarly()],
      ["terse", terseCoach()],
      ["post", postCoach()],
      ["zone", zoneCoach()],
    ] as const) {
      const { asked } = walk(start, 1, 40);
      assert(asked.length < 40, `${name} coach terminates rather than running to the cap`);
    }
  });

  await test("the bar rises steeply enough to matter within a real interview", () => {
    assert(questionThreshold(10) > questionThreshold(0) * 4, "ten questions in, the bar is far higher");
    assert(questionThreshold(10) >= 0.5, `by question 10 only strong questions qualify (${questionThreshold(10)})`);
  });

  await test("only high-value questions survive past the soft stop", () => {
    const snap = terseCoach();
    assert(
      substantiveAnswers(snap.turns) <= 2,
      `ten terse answers barely register as substantive (${substantiveAnswers(snap.turns)})`,
    );

    const wordy = scenario({
      answers: Array.from({ length: SOFT_STOP_ANSWERS }, () => "We do that a certain way every time"),
      covered: { "offense.identity": 1, "offense.shot_selection": 1, "defense.identity": 1, "program.priorities": 1 },
    });
    equal(substantiveAnswers(wordy.turns), SOFT_STOP_ANSWERS, "real answers are counted");

    const { end, reason } = shouldEndOnboarding(wordy);
    const best = rankedQuestions(wordy)[0];
    if (best && best.gain < HIGH_VALUE_GAIN) {
      assert(end, `should stop rather than ask a ${best.gain} question: ${reason}`);
    } else {
      assert(!end, "a genuinely high-value question is still worth asking");
    }
  });

  // -------------------------------------------------------------------------
  group("One clear answer moves an area most of the way");

  await test("the first confirmed fact is worth most of an area", () => {
    equal(confidenceFrom(0, 2), 0, "nothing known is nothing");
    equal(confidenceFrom(1, 2), 0.6, "one clear statement gets most of the way");
    equal(confidenceFrom(2, 2), 1, "two fills it in");
    assert(confidenceFrom(1, 3) === 0.6, "and the same holds for a three-part area");
  });

  await test("a coach never has to repeat themselves to move the needle", () => {
    const one = confidenceFrom(1, 2);
    assert(one >= 0.6, `a single fact must not leave an area near-empty (${one})`);
  });

  // -------------------------------------------------------------------------
  group("Readiness is the core, not a complete playbook");

  await test("core areas are identity, principles, actions, key reads and priorities", () => {
    const core = assessAreas(detailedCoach())
      .filter((a) => a.core)
      .map((a) => a.area.id);

    for (const id of [
      "offense.identity",
      "offense.principles",
      "offense.actions",
      "offense.shot_selection",
      "defense.identity",
      "defense.principles",
      "program.priorities",
    ]) {
      assert(core.includes(id), `${id} is core`);
    }

    // Genuinely useful, but not a gate.
    for (const id of ["offense.transition", "defense.transition", "program.language"]) {
      assert(!core.includes(id), `${id} must not gate readiness`);
    }
  });

  await test("a detailed coach is film-ready without exhaustive coverage", () => {
    const snap = detailedCoach();
    const readiness = calculateFilmReadiness(snap);
    const covered = new Set(snap.knowledge.map((k) => k.areaId));

    equal(readiness.status, "film_ready", `detailed coach should be ready (score ${readiness.score})`);
    assert(covered.size < AREAS.length, `and with only ${covered.size} of ${AREAS.length} areas touched`);
    assert(
      !covered.has("offense.transition") && !covered.has("program.language"),
      "having never been asked about transition or terminology",
    );
    equal(substantiveAnswers(snap.turns), 3, "off three rich answers");
  });

  await test("the same coach is not declared ready after one answer", () => {
    const readiness = calculateFilmReadiness(detailedCoachEarly());
    assert(readiness.status !== "film_ready", "one answer is not a system");
    assert(readiness.essentialsMissing.length > 0, "and it says what's still missing");
  });

  await test("a terse coach is not ready on the same number of areas", () => {
    const readiness = calculateFilmReadiness(terseCoach());
    assert(readiness.status !== "film_ready", `terse coach needs more (score ${readiness.score})`);
    assert(rankedQuestions(terseCoach()).length > 0, "and there is still something worth asking");
  });

  await test("readiness needs some depth, not just a headline everywhere", () => {
    // One fact in each core area scores exactly 0.60 — deliberately just under
    // the bar, so broad-but-shallow extraction doesn't trip readiness.
    const thin = scenario({
      answers: ["a", "b", "c"].map((x) => `${x} short answer here`),
      covered: {
        "offense.identity": 1,
        "offense.principles": 1,
        "offense.actions": 1,
        "offense.shot_selection": 1,
        "defense.identity": 1,
        "defense.principles": 1,
        "defense.ball_screen_coverage": 1,
        "program.priorities": 1,
      },
    });
    const readiness = calculateFilmReadiness(thin);
    assert(readiness.score < 0.62, `all-thin scores below the bar (${readiness.score})`);
  });

  await test("the soft stop lets a talkative coach finish even without depth", () => {
    const covered = {
      "offense.identity": 1,
      "offense.principles": 1,
      "offense.actions": 1,
      "offense.shot_selection": 1,
      "defense.identity": 1,
      "defense.principles": 1,
      "defense.ball_screen_coverage": 1,
      "program.priorities": 1,
    };
    const answers = Array.from({ length: SOFT_STOP_ANSWERS }, (_, i) => `Answer number ${i} with real words`);

    equal(
      calculateFilmReadiness(scenario({ answers, covered })).status,
      "film_ready",
      "ten real answers with every core area touched is enough",
    );
    assert(
      calculateFilmReadiness(scenario({ answers: answers.slice(0, 4), covered })).status !== "film_ready",
      "but four answers with the same thin coverage is not",
    );
  });

  // -------------------------------------------------------------------------
  group("Unknowns rarely block");

  await test("a gap in an area ReadRep already understands does not block", () => {
    const snap = detailedCoach();
    snap.unknowns = [gap("offense.principles", 1, "Does the weak corner drift or lift?")];

    const readiness = calculateFilmReadiness(snap);
    equal(readiness.status, "film_ready", "we know the area; the gap is something to learn later");
    equal(readiness.blockingUnknowns.length, 0, "so nothing blocks");
  });

  await test("a near-certain gap in a core area ReadRep knows nothing about does block", () => {
    const snap = detailedCoach();
    snap.knowledge = snap.knowledge.filter((k) => k.areaId !== "defense.principles");
    snap.unknowns = [gap("defense.principles", 0.9, "Where does help come from?")];

    const readiness = calculateFilmReadiness(snap);
    assert(readiness.status !== "film_ready", "an empty core area with a real gap holds it back");
  });

  await test("a low-importance gap never blocks", () => {
    const snap = detailedCoach();
    snap.knowledge = snap.knowledge.filter((k) => k.areaId !== "defense.principles");
    snap.unknowns = [gap("defense.principles", 0.5)];
    equal(calculateFilmReadiness(snap).blockingUnknowns.length, 0, "0.5 importance is not a blocker");
  });

  await test("a gap in a non-core area never blocks", () => {
    const snap = detailedCoach();
    snap.unknowns = [gap("program.language", 1, "What does Chicago mean?")];
    equal(calculateFilmReadiness(snap).status, "film_ready", "terminology is not a gate");
  });

  // -------------------------------------------------------------------------
  group("Adapting to the coach — deterministic");

  await test("the post coach is never asked about ball screens and is not held back by them", () => {
    const snap = postCoach();
    const open = rankedQuestions(snap).map((a) => a.area.id);
    assert(!open.includes("offense.ball_screen_reads"), "no P&R interview for a post team");

    const readiness = calculateFilmReadiness(snap);
    equal(readiness.status, "film_ready", `post coach reaches ready (score ${readiness.score})`);
    assert(
      !readiness.essentialsMissing.some((a) => a.id === "offense.ball_screen_reads"),
      "and ball-screen reads are never listed as missing",
    );
  });

  await test("the post coach's post play IS part of their core", () => {
    const post = assessAreas(postCoach()).find((a) => a.area.id === "offense.post_reads");
    assert(post!.relevance >= 0.8, "post play is highly relevant to a post team");
    assert(post!.confirmedCount > 0, "and the scenario has taught it");
  });

  await test("the zone coach is asked about zone and reaches ready without man detail", () => {
    const snap = zoneCoach();
    const assessed = assessAreas(snap);

    const zone = assessed.find((a) => a.area.id === "defense.zone")!;
    assert(zone.relevance >= 0.8, "zone principles are highly relevant");
    assert(zone.confirmedCount > 0, "and the scenario has taught them");

    const bsc = assessed.find((a) => a.area.id === "defense.ball_screen_coverage")!;
    assert(bsc.relevance < 0.8, "ball-screen defense matters less to a zone team");

    equal(calculateFilmReadiness(snap).status, "film_ready", "zone coach reaches ready");
  });

  await test("a man team is never asked about zone, and vice versa", () => {
    assert(
      !rankedQuestions(detailedCoach()).some((a) => a.area.id === "defense.zone"),
      "man team: no zone questions",
    );
    // A zone team still runs an offense, so offensive ball screens remain a
    // fair question for them. What must not happen is the reverse.
    const zoneCore = assessAreas(zoneCoach()).filter((a) => a.core).map((a) => a.area.id);
    assert(zoneCore.includes("defense.zone"), "zone team: zone principles are core");
    assert(
      !assessAreas(detailedCoach()).some((a) => a.core && a.area.id === "defense.zone"),
      "man team: zone is never core",
    );
  });

  // -------------------------------------------------------------------------
  group("Never asking merely to fill a box");

  await test("an empty low-value area is dropped once the interview is long", () => {
    const late = scenario({
      answers: Array.from({ length: 12 }, (_, i) => `Answer ${i} with enough words to count as real`),
      covered: { "offense.identity": 2, "defense.identity": 2, "program.priorities": 2 },
    });
    const language = assessAreas(late).find((a) => a.area.id === "program.language")!;
    equal(language.confirmedCount, 0, "nothing known about their language");
    assert(language.skip, "and twelve questions in it is not worth asking");
    assert(
      (language.skipReason ?? "").includes("Not worth"),
      `dropped on value, not on being full: ${language.skipReason}`,
    );
  });

  await test("every question that survives is justified by film impact, not emptiness", () => {
    for (const snap of [detailedCoachEarly(), terseCoach(), postCoach(), zoneCoach()]) {
      for (const a of rankedQuestions(snap)) {
        assert(
          a.gain >= questionThreshold(snap.turns.filter((t) => t.role === "assistant").length),
          `${a.area.id} clears the bar on value, not on being empty`,
        );
      }
    }
  });

  await test("readiness never counts inferred knowledge", () => {
    const inferredOnly = scenario({
      answers: ["We play a certain way and it works for us"],
      covered: {},
    });
    inferredOnly.knowledge = AREAS.flatMap((a) => [
      {
        id: `i-${a.id}`,
        areaId: a.id,
        concept: "guess",
        phase: a.group === "defense" ? ("defense" as const) : a.group === "program" ? ("coaching" as const) : ("offense" as const),
        action: null,
        coverage: null,
        role: null,
        clock: null,
        trigger: null,
        instruction: "ReadRep's guess",
        priority: 1,
        confidence: 0.5,
        provenance: "inferred" as const,
        confirmedAt: null,
        parentId: null,
        createdAt: "",
      },
    ]);

    const readiness = calculateFilmReadiness(inferredOnly);
    equal(readiness.status, "learning", "guessing an entire system is not knowing it");
    equal(readiness.score, 0, "inferences contribute nothing to readiness");
  });

  await test("an area the coach ruled out is not a hole", () => {
    const snap = postCoach();
    snap.areaStates = [
      { areaId: "offense.ball_screen_reads", status: "not_applicable", confidence: 0, note: null },
    ];
    equal(calculateFilmReadiness(snap).status, "film_ready", "ruled-out areas never block");
  });

  await test("isCoreArea is driven by this team's relevance, not a fixed list", () => {
    const bsr = AREAS.find((a) => a.id === "offense.ball_screen_reads")!;
    assert(isCoreArea(bsr, 1), "core for a team that runs ball screens");
    assert(!isCoreArea(bsr, 0.05), "not core for a team that doesn't");
  });

  report();
}

void main();
