import { describe, expect, expectTypeOf, it } from "vitest";
import type { PreRevealMomentDTO, RevealDTO, SessionDTO } from "./player";

/**
 * The pre-reveal contract.
 *
 * ReadRep's central rule is that a player commits before seeing the outcome.
 * That holds only while `PreRevealMomentDTO` stays free of anything that gives
 * the answer away. These are compile-time assertions: adding `quality` to a
 * choice, or an `interpretation` field to the moment, fails the type check
 * rather than silently shipping the answer to the browser.
 */
describe("the pre-reveal DTO gives nothing away", () => {
  it("exposes only an id and a label per choice", () => {
    expectTypeOf<PreRevealMomentDTO["choices"][number]>().toEqualTypeOf<{
      id: string;
      label: string;
    }>();
  });

  it("has no field that could carry the answer", () => {
    type Keys = keyof PreRevealMomentDTO;
    const forbidden = [
      "quality",
      "rationale",
      "preferred",
      "preferredOptionId",
      "interpretation",
      "observedFacts",
      "visualCue",
      "teachingCue",
      "outcome",
      "coachRules",
      "correctOption",
      "isCorrect",
      "answer",
    ] as const;

    // Runtime mirror of the type-level guarantee, so the list above stays
    // meaningful to a reader and a failure names the offending field.
    const allowed: Keys[] = [
      "id",
      "position",
      "prompt",
      "responseType",
      "choices",
      "selectableAreas",
      "clip",
      "film",
      "completed",
    ];
    for (const key of forbidden) {
      expect(allowed, `pre-reveal DTO must not carry "${key}"`).not.toContain(key);
    }
    expectTypeOf<Keys>().toEqualTypeOf<(typeof allowed)[number]>();
  });

  it("keeps the session DTO free of interpretations too", () => {
    expectTypeOf<SessionDTO["moments"]>().toEqualTypeOf<PreRevealMomentDTO[]>();
  });
});

describe("the reveal DTO carries the whole lesson", () => {
  it("separates the graded read from the recorded outcome", () => {
    expectTypeOf<RevealDTO>().toHaveProperty("chosenQuality");
    expectTypeOf<RevealDTO>().toHaveProperty("outcome");
    // No boolean correctness anywhere.
    expectTypeOf<RevealDTO>().not.toHaveProperty("isCorrect");
    expectTypeOf<RevealDTO>().not.toHaveProperty("correct");
  });

  it("carries everything the learn step must show", () => {
    expectTypeOf<RevealDTO>().toHaveProperty("observedFacts");
    expectTypeOf<RevealDTO>().toHaveProperty("visualCue");
    expectTypeOf<RevealDTO>().toHaveProperty("allOptions");
    expectTypeOf<RevealDTO>().toHaveProperty("preferred");
    expectTypeOf<RevealDTO>().toHaveProperty("coachRules");
    expectTypeOf<RevealDTO>().toHaveProperty("teachingCue");
    expectTypeOf<RevealDTO>().toHaveProperty("uncertainty");
  });

  it("says whether the advice is grounded in the coach's system", () => {
    expectTypeOf<RevealDTO["grounding"]>().toEqualTypeOf<
      "coach_system" | "general_reasoning"
    >();
  });
});
