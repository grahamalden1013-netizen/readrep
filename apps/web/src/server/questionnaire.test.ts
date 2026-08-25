import { describe, expect, it } from "vitest";
import { CoachRuleTopic } from "@readrep/domain";
import { QUESTIONS, questionById, resolveAnswer, TOPIC_COUNT } from "./questionnaire";

describe("the coach-system survey", () => {
  it("stays in the 10-20 question range the blueprint asks for", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(10);
    expect(QUESTIONS.length).toBeLessThanOrEqual(20);
  });

  it("covers every topic the blueprint names", () => {
    const covered = new Set(QUESTIONS.map((q) => q.topic));
    for (const topic of CoachRuleTopic.options) {
      expect(covered, `missing topic: ${topic}`).toContain(topic);
    }
    expect(TOPIC_COUNT).toBe(CoachRuleTopic.options.length);
  });

  it("gives every question a unique id", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every question at least two answers", () => {
    for (const q of QUESTIONS) {
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("makes every answer produce a rule a coach would recognise", () => {
    for (const q of QUESTIONS) {
      for (const option of q.options) {
        expect(option.statement.length, `${q.id}/${option.value}`).toBeGreaterThan(15);
        // Rules are written in the coach's voice, addressed to the team.
        expect(option.statement, `${q.id}/${option.value}`).toMatch(/[.?"']$/);
      }
    }
  });

  it("gives every option a distinct value within its question", () => {
    for (const q of QUESTIONS) {
      const values = q.options.map((o) => o.value);
      expect(new Set(values).size, q.id).toBe(values.length);
    }
  });

  it("offers optional follow-up detail on every question", () => {
    for (const q of QUESTIONS) {
      expect(q.followUpPrompt.length, q.id).toBeGreaterThan(5);
    }
  });

  it("ties every question to at least one decision category", () => {
    for (const q of QUESTIONS) {
      expect(q.appliesTo.length, q.id).toBeGreaterThan(0);
    }
  });
});

describe("resolving an answer", () => {
  it("resolves a real answer to its question and rule", () => {
    const resolved = resolveAnswer({
      questionId: "pnr-base-coverage-offense",
      value: "skip_weak_side",
    });
    expect(resolved?.question.topic).toBe("pick_and_roll_rules");
    // This is the rule the blueprint's Appendix A example cites.
    expect(resolved?.option.statement).toBe(
      "Against a low tag, look weak-side before forcing the finish.",
    );
  });

  it("refuses a question that does not exist", () => {
    expect(resolveAnswer({ questionId: "made-up", value: "whatever" })).toBeNull();
  });

  it("refuses an option that does not belong to the question", () => {
    expect(
      resolveAnswer({
        questionId: "pnr-base-coverage-offense",
        value: "not-an-option",
      }),
    ).toBeNull();
  });

  it("does not let one question's answer satisfy another", () => {
    expect(
      resolveAnswer({ questionId: "rebounding", value: "skip_weak_side" }),
    ).toBeNull();
  });

  it("looks a question up by id", () => {
    expect(questionById("terminology")?.topic).toBe("terminology");
    expect(questionById("nope")).toBeUndefined();
  });
});
