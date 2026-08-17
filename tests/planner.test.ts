import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import { findFreeWindows, mergeBusy } from "@/lib/planner/free-time";
import { planDay, type PlannableTask } from "@/lib/planner/plan-day";
import { buildPrepSchedule, prepStatus } from "@/lib/planner/test-prep";
import { DEFAULT_PREFERENCES } from "@/lib/preferences";

const ZONE = "America/New_York";

/** Local wall-clock time on 2026-03-02 (a Monday) in the test timezone. */
function at(time: string): Date {
  return DateTime.fromISO(`2026-03-02T${time}`, { zone: ZONE }).toJSDate();
}

const DAY = DateTime.fromISO("2026-03-02T00:00:00", { zone: ZONE });
const PREFS = { ...DEFAULT_PREFERENCES, lightDays: [] as number[] };

describe("mergeBusy", () => {
  it("merges overlapping spans", () => {
    const merged = mergeBusy([
      { startAt: at("16:00"), endAt: at("17:00"), allDay: false },
      { startAt: at("16:30"), endAt: at("18:00"), allDay: false },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].end).toEqual(at("18:00"));
  });

  it("ignores all-day markers so they do not swallow the day", () => {
    expect(
      mergeBusy([{ startAt: at("00:00"), endAt: at("23:59"), allDay: true }]),
    ).toHaveLength(0);
  });
});

describe("findFreeWindows", () => {
  it("returns the whole working day when nothing is booked", () => {
    const windows = findFreeWindows({
      day: DAY,
      busy: [],
      preferences: PREFS,
      timezone: ZONE,
      now: at("06:00"),
    });
    expect(windows).toHaveLength(1);
    expect(windows[0].start).toEqual(at(PREFS.earliestStart));
    expect(windows[0].end).toEqual(at(PREFS.latestEnd));
  });

  it("carves gaps around real calendar events", () => {
    const windows = findFreeWindows({
      day: DAY,
      busy: [
        { startAt: at("16:00"), endAt: at("17:30"), allDay: false },
        { startAt: at("19:00"), endAt: at("19:45"), allDay: false },
      ],
      preferences: PREFS,
      timezone: ZONE,
      now: at("06:00"),
    });
    expect(windows.map((w) => [w.start, w.end])).toEqual([
      [at("15:30"), at("16:00")],
      [at("17:30"), at("19:00")],
      [at("19:45"), at("21:30")],
    ]);
  });

  it("never proposes time that has already passed", () => {
    const windows = findFreeWindows({
      day: DAY,
      busy: [],
      preferences: PREFS,
      timezone: ZONE,
      now: at("18:07"),
    });
    // Starts at the next 5-minute boundary after "now", not at 15:30.
    expect(windows[0].start).toEqual(at("18:10"));
  });

  it("returns nothing once the day is over", () => {
    expect(
      findFreeWindows({
        day: DAY,
        busy: [],
        preferences: PREFS,
        timezone: ZONE,
        now: at("22:30"),
      }),
    ).toEqual([]);
  });

  it("drops fragments too short to use", () => {
    const windows = findFreeWindows({
      day: DAY,
      busy: [{ startAt: at("15:35"), endAt: at("21:30"), allDay: false }],
      preferences: PREFS,
      timezone: ZONE,
      now: at("06:00"),
      minimumMinutes: 15,
    });
    // The 5-minute sliver before 15:35 is not offered.
    expect(windows).toEqual([]);
  });
});

function task(overrides: Partial<PlannableTask> = {}): PlannableTask {
  return {
    assignmentId: "a1",
    title: "Task",
    type: "HOMEWORK",
    priorityScore: 50,
    remainingMinutes: 30,
    dueAt: at("23:00"),
    isPrep: false,
    ...overrides,
  };
}

describe("planDay", () => {
  it("schedules in priority order, not due-date order", () => {
    const plan = planDay({
      tasks: [
        task({ assignmentId: "low", title: "Low", priorityScore: 20, dueAt: at("18:00") }),
        task({ assignmentId: "high", title: "High", priorityScore: 90, dueAt: at("23:00") }),
      ],
      busy: [],
      preferences: PREFS,
      timezone: ZONE,
      now: at("06:00"),
      day: DAY,
    });
    expect(plan.blocks[0].assignmentId).toBe("high");
  });

  it("never schedules over an existing calendar event", () => {
    const busy = [{ startAt: at("16:00"), endAt: at("17:30"), allDay: false }];
    const plan = planDay({
      tasks: [task({ remainingMinutes: 180 })],
      busy,
      preferences: PREFS,
      timezone: ZONE,
      now: at("06:00"),
      day: DAY,
    });

    expect(plan.blocks.length).toBeGreaterThan(0);
    for (const block of plan.blocks) {
      const overlaps =
        block.start < busy[0].endAt && block.end > busy[0].startAt;
      expect(overlaps).toBe(false);
    }
  });

  it("splits long work into sittings and inserts breaks", () => {
    const plan = planDay({
      tasks: [task({ remainingMinutes: 90 })],
      busy: [],
      preferences: { ...PREFS, sessionMinutes: 30, breakMinutes: 10 },
      timezone: ZONE,
      now: at("06:00"),
      day: DAY,
    });

    expect(plan.blocks).toHaveLength(3);
    expect(plan.blocks.every((b) => b.minutes === 30)).toBe(true);
    // A 10-minute gap sits between consecutive blocks.
    const gap =
      (plan.blocks[1].start.getTime() - plan.blocks[0].end.getTime()) / 60_000;
    expect(gap).toBe(10);
  });

  it("defers work that does not fit", () => {
    const plan = planDay({
      tasks: [
        task({ assignmentId: "big", remainingMinutes: 400, priorityScore: 90 }),
        task({ assignmentId: "spill", remainingMinutes: 60, priorityScore: 10 }),
      ],
      busy: [],
      preferences: PREFS,
      timezone: ZONE,
      now: at("06:00"),
      day: DAY,
    });
    expect(plan.deferred.some((t) => t.assignmentId === "spill")).toBe(true);
  });

  it("reduces the workload on a light day", () => {
    // 2026-03-02 is a Monday (weekday 1).
    const light = planDay({
      tasks: [task({ remainingMinutes: 600 })],
      busy: [],
      preferences: { ...PREFS, lightDays: [1], lightDayFactor: 0.5 },
      timezone: ZONE,
      now: at("06:00"),
      day: DAY,
    });
    const normal = planDay({
      tasks: [task({ remainingMinutes: 600 })],
      busy: [],
      preferences: PREFS,
      timezone: ZONE,
      now: at("06:00"),
      day: DAY,
    });

    expect(light.isLightDay).toBe(true);
    expect(light.scheduledMinutes).toBeLessThan(normal.scheduledMinutes);
  });

  it("produces a chronological plan", () => {
    const plan = planDay({
      tasks: [
        task({ assignmentId: "a", remainingMinutes: 60, priorityScore: 90 }),
        task({ assignmentId: "b", remainingMinutes: 60, priorityScore: 80 }),
      ],
      busy: [],
      preferences: PREFS,
      timezone: ZONE,
      now: at("06:00"),
      day: DAY,
    });
    for (let i = 1; i < plan.blocks.length; i += 1) {
      expect(plan.blocks[i].start.getTime()).toBeGreaterThanOrEqual(
        plan.blocks[i - 1].end.getTime(),
      );
    }
  });

  it("plans nothing when the day is already over", () => {
    const plan = planDay({
      tasks: [task()],
      busy: [],
      preferences: PREFS,
      timezone: ZONE,
      now: at("23:00"),
      day: DAY,
    });
    expect(plan.blocks).toEqual([]);
    expect(plan.deferred).toHaveLength(1);
  });
});

describe("buildPrepSchedule", () => {
  const NOW = at("09:00");

  it("spreads study across the days before the test", () => {
    // Test next Monday, 4-day lead.
    const dueAt = DateTime.fromISO("2026-03-09T09:00:00", { zone: ZONE }).toJSDate();
    const sessions = buildPrepSchedule({
      dueAt,
      totalMinutes: 125,
      leadDays: 4,
      timezone: ZONE,
      now: NOW,
    });

    expect(sessions).toHaveLength(4);
    // Every session lands strictly before the test day.
    for (const session of sessions) {
      expect(session.day.getTime()).toBeLessThan(dueAt.getTime());
      expect(session.minutes).toBeGreaterThan(0);
      expect(session.minutes % 5).toBe(0);
    }
    // Ramps up, then tapers into review.
    expect(sessions[1].minutes).toBeGreaterThan(sessions[0].minutes);
    expect(sessions[2].minutes).toBeGreaterThan(sessions[1].minutes);
    expect(sessions[3].minutes).toBeLessThan(sessions[2].minutes);
    expect(sessions[3].focus).toMatch(/review/i);
  });

  it("adapts when the test is close", () => {
    const dueAt = DateTime.fromISO("2026-03-04T09:00:00", { zone: ZONE }).toJSDate();
    const sessions = buildPrepSchedule({
      dueAt,
      totalMinutes: 120,
      leadDays: 5,
      timezone: ZONE,
      now: NOW,
    });
    // Only two days remain, so only two sessions are proposed.
    expect(sessions).toHaveLength(2);
  });

  it("proposes nothing for a test today or in the past", () => {
    expect(
      buildPrepSchedule({
        dueAt: at("15:00"),
        totalMinutes: 120,
        leadDays: 5,
        timezone: ZONE,
        now: NOW,
      }),
    ).toEqual([]);

    expect(
      buildPrepSchedule({
        dueAt: DateTime.fromISO("2026-02-25T09:00:00", { zone: ZONE }).toJSDate(),
        totalMinutes: 120,
        leadDays: 5,
        timezone: ZONE,
        now: NOW,
      }),
    ).toEqual([]);
  });

  it("roughly preserves the total study budget", () => {
    const dueAt = DateTime.fromISO("2026-03-07T09:00:00", { zone: ZONE }).toJSDate();
    const sessions = buildPrepSchedule({
      dueAt,
      totalMinutes: 120,
      leadDays: 5,
      timezone: ZONE,
      now: NOW,
    });
    const total = sessions.reduce((sum, s) => sum + s.minutes, 0);
    expect(total).toBeGreaterThan(90);
    expect(total).toBeLessThan(150);
  });
});

describe("prepStatus", () => {
  it("flags an imminent test with no plan", () => {
    expect(
      prepStatus({ daysLeft: 2, plannedSessions: 0, completedSessions: 0 }).status,
    ).toBe("overdue");
  });

  it("is relaxed about a distant test with no plan", () => {
    expect(
      prepStatus({ daysLeft: 12, plannedSessions: 0, completedSessions: 0 }).status,
    ).toBe("not-started");
  });

  it("reports progress once sessions are done", () => {
    expect(
      prepStatus({ daysLeft: 3, plannedSessions: 4, completedSessions: 2 }),
    ).toMatchObject({ status: "in-progress", label: "2 of 4 sessions done" });
    expect(
      prepStatus({ daysLeft: 1, plannedSessions: 4, completedSessions: 4 }).status,
    ).toBe("on-track");
  });
});
