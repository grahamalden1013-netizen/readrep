import { describe, expect, it } from "vitest";

import { calculatePriority, priorityBand, urgencyFactor } from "@/lib/priority";

const NOW = new Date("2026-03-02T16:00:00.000Z");

function inDays(days: number): Date {
  return new Date(NOW.getTime() + days * 86_400_000);
}

function score(
  overrides: Partial<Parameters<typeof calculatePriority>[0]>,
): number {
  return calculatePriority({
    type: "HOMEWORK",
    status: "NOT_STARTED",
    dueAt: inDays(1),
    estimatedMinutes: 30,
    testPrepLeadDays: 5,
    now: NOW,
    ...overrides,
  });
}

describe("urgencyFactor", () => {
  it("peaks at the deadline and decays without hitting zero", () => {
    expect(urgencyFactor(0)).toBe(1);
    expect(urgencyFactor(-3)).toBe(1);
    expect(urgencyFactor(1)).toBeGreaterThan(urgencyFactor(7));
    expect(urgencyFactor(7)).toBeGreaterThan(urgencyFactor(14));
    expect(urgencyFactor(14)).toBeGreaterThan(0);
  });
});

describe("calculatePriority", () => {
  it("scores completed and skipped work at zero", () => {
    expect(score({ status: "DONE" })).toBe(0);
    expect(score({ status: "SKIPPED" })).toBe(0);
    // Even when overdue and important.
    expect(
      score({ status: "DONE", type: "MAJOR_ASSESSMENT", dueAt: inDays(-2) }),
    ).toBe(0);
  });

  it("ranks a small assignment due tomorrow above a test two weeks out", () => {
    // This is the behaviour the spec calls out explicitly.
    const homeworkTomorrow = score({
      type: "HOMEWORK",
      dueAt: inDays(1),
      estimatedMinutes: 30,
    });
    const testInTwoWeeks = score({
      type: "MAJOR_ASSESSMENT",
      dueAt: inDays(14),
      estimatedMinutes: 120,
    });
    expect(homeworkTomorrow).toBeGreaterThan(testInTwoWeeks);
  });

  it("lifts a major assessment above that assignment once it is close", () => {
    const homeworkTomorrow = score({
      type: "HOMEWORK",
      dueAt: inDays(1),
      estimatedMinutes: 30,
    });
    const testInThreeDays = score({
      type: "MAJOR_ASSESSMENT",
      dueAt: inDays(3),
      estimatedMinutes: 120,
    });
    expect(testInThreeDays).toBeGreaterThan(homeworkTomorrow);
  });

  it("raises an assessment steadily as the study window opens", () => {
    const at = (days: number) =>
      score({
        type: "MAJOR_ASSESSMENT",
        dueAt: inDays(days),
        estimatedMinutes: 120,
        testPrepLeadDays: 5,
      });

    // Outside the window there is no ramp; inside, it climbs every day.
    expect(at(8)).toBeLessThan(at(5));
    expect(at(5)).toBeLessThan(at(4));
    expect(at(4)).toBeLessThan(at(3));
    expect(at(3)).toBeLessThan(at(2));
    expect(at(2)).toBeLessThan(at(1));
  });

  it("does not ramp ordinary homework", () => {
    // Homework rises only through urgency, never the assessment ramp.
    const near = score({ type: "HOMEWORK", dueAt: inDays(1) });
    const far = score({ type: "HOMEWORK", dueAt: inDays(10) });
    expect(near).toBeGreaterThan(far);
  });

  it("prefers the more important type when timing is equal", () => {
    const common = { dueAt: inDays(2), estimatedMinutes: 60 };
    expect(score({ ...common, type: "MAJOR_ASSESSMENT" })).toBeGreaterThan(
      score({ ...common, type: "QUIZ" }),
    );
    expect(score({ ...common, type: "QUIZ" })).toBeGreaterThan(
      score({ ...common, type: "HOMEWORK" }),
    );
    expect(score({ ...common, type: "HOMEWORK" })).toBeGreaterThan(
      score({ ...common, type: "CLASSWORK" }),
    );
  });

  it("prefers the longer task when everything else matches", () => {
    const common = { type: "HOMEWORK" as const, dueAt: inDays(2) };
    expect(score({ ...common, estimatedMinutes: 120 })).toBeGreaterThan(
      score({ ...common, estimatedMinutes: 15 }),
    );
  });

  it("puts overdue work at the top", () => {
    const overdue = score({ dueAt: inDays(-1) });
    const dueToday = score({ dueAt: inDays(0.2) });
    expect(overdue).toBeGreaterThanOrEqual(dueToday);
  });

  it("nudges in-progress work slightly below untouched work", () => {
    const common = { dueAt: inDays(1), estimatedMinutes: 60 };
    expect(score({ ...common, status: "IN_PROGRESS" })).toBeLessThan(
      score({ ...common, status: "NOT_STARTED" }),
    );
  });

  it("stays within 0-100", () => {
    const extremes = [
      score({ type: "MAJOR_ASSESSMENT", dueAt: inDays(-5), estimatedMinutes: 240 }),
      score({ type: "SCHOOL_EVENT", dueAt: inDays(200), estimatedMinutes: 10 }),
    ];
    for (const value of extremes) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});

describe("priorityBand", () => {
  it("maps scores onto bands in order", () => {
    expect(priorityBand(85)).toBe("critical");
    expect(priorityBand(60)).toBe("high");
    expect(priorityBand(45)).toBe("medium");
    expect(priorityBand(10)).toBe("low");
  });
});
