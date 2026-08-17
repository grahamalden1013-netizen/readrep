import "server-only";

import { DateTime } from "luxon";

import { prisma } from "@/lib/db";
import { timeOnDay } from "@/lib/planner/free-time";
import { planDay, type PlannableTask } from "@/lib/planner/plan-day";
import { buildPrepSchedule } from "@/lib/planner/test-prep";
import type { CurrentUser } from "@/lib/session";

/**
 * Persists planner output.
 *
 * Study sessions are ours alone — they are written to our database and shown
 * in the UI. Nothing here touches Google Calendar.
 */

/** How far ahead work is pulled forward into today's plan. */
const PLAN_HORIZON_DAYS = 3;

/**
 * Proposes spaced study for every upcoming major assessment that does not
 * already have a plan. Existing sessions are left alone so a student's
 * completed work is never discarded.
 */
export async function ensureTestPrep(user: CurrentUser): Promise<number> {
  const now = new Date();
  const zone = user.timezone;

  const assessments = await prisma.assignment.findMany({
    where: {
      userId: user.id,
      assignmentType: { in: ["MAJOR_ASSESSMENT", "PROJECT"] },
      status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
      removedFromSourceAt: null,
      dueAt: { gte: now },
    },
  });

  let created = 0;

  for (const assessment of assessments) {
    const existing = await prisma.studySession.count({
      where: {
        userId: user.id,
        assignmentId: assessment.id,
        kind: "TEST_PREP",
        startAt: { gte: now },
      },
    });
    if (existing > 0) continue;

    const sessions = buildPrepSchedule({
      dueAt: assessment.dueAt,
      totalMinutes: assessment.estimatedMinutes,
      leadDays: user.preferences.testPrepLeadDays,
      timezone: zone,
      now,
    });

    for (const session of sessions) {
      // Future prep sessions carry a nominal start time; only today's plan
      // assigns real clock times, so these read as "Thursday — 20 min".
      const day = DateTime.fromJSDate(session.day, { zone });
      const start = timeOnDay(day, user.preferences.earliestStart, zone);

      await prisma.studySession.create({
        data: {
          userId: user.id,
          assignmentId: assessment.id,
          startAt: start.toJSDate(),
          endAt: start.plus({ minutes: session.minutes }).toJSDate(),
          kind: "TEST_PREP",
          status: "PLANNED",
          focus: session.focus,
        },
      });
      created += 1;
    }
  }

  return created;
}

export type PlanDayOutcome = {
  blocks: number;
  scheduledMinutes: number;
  freeMinutes: number;
  deferred: number;
  isLightDay: boolean;
};

/**
 * Builds today's chronological plan.
 *
 * Rebuilds only the *planned* blocks for today, so anything already marked
 * completed survives. Work is drawn from assignments due within the horizon
 * plus any test preparation scheduled for today.
 */
export async function planToday(user: CurrentUser): Promise<PlanDayOutcome> {
  const now = new Date();
  const zone = user.timezone;
  const today = DateTime.fromJSDate(now, { zone }).startOf("day");
  const tomorrow = today.plus({ days: 1 });

  await ensureTestPrep(user);

  const [assignments, prepToday, busy] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        userId: user.id,
        status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
        removedFromSourceAt: null,
        dueAt: { lte: today.plus({ days: PLAN_HORIZON_DAYS }).endOf("day").toJSDate() },
      },
      orderBy: { priorityScore: "desc" },
    }),
    prisma.studySession.findMany({
      where: {
        userId: user.id,
        kind: "TEST_PREP",
        startAt: { gte: today.toJSDate(), lt: tomorrow.toJSDate() },
      },
      include: { assignment: true },
    }),
    prisma.busyBlock.findMany({
      where: {
        userId: user.id,
        startAt: { lt: tomorrow.toJSDate() },
        endAt: { gt: today.toJSDate() },
      },
    }),
  ]);

  // Assessments are prepared through their prep sessions, so they are not
  // also queued as a single large block of work.
  const preparedIds = new Set(prepToday.map((s) => s.assignmentId));

  const tasks: PlannableTask[] = [
    ...prepToday.map((session) => ({
      assignmentId: session.assignmentId,
      title: session.assignment.title,
      type: session.assignment.assignmentType,
      priorityScore: session.assignment.priorityScore,
      remainingMinutes: Math.round((+session.endAt - +session.startAt) / 60_000),
      dueAt: session.assignment.dueAt,
      isPrep: true,
      focus: session.focus ?? undefined,
    })),
    ...assignments
      .filter((a) => !preparedIds.has(a.id))
      .map((a) => ({
        assignmentId: a.id,
        title: a.title,
        type: a.assignmentType,
        priorityScore: a.priorityScore,
        remainingMinutes: a.estimatedMinutes,
        dueAt: a.dueAt,
        isPrep: false,
      })),
  ];

  const plan = planDay({
    tasks,
    busy,
    preferences: user.preferences,
    timezone: zone,
    now,
    day: today,
  });

  await prisma.$transaction(async (tx) => {
    // Replace today's proposals; keep anything finished or skipped.
    await tx.studySession.deleteMany({
      where: {
        userId: user.id,
        startAt: { gte: today.toJSDate(), lt: tomorrow.toJSDate() },
        status: "PLANNED",
      },
    });

    for (const block of plan.blocks) {
      await tx.studySession.create({
        data: {
          userId: user.id,
          assignmentId: block.assignmentId,
          startAt: block.start,
          endAt: block.end,
          kind: block.isPrep ? "TEST_PREP" : "WORK",
          status: "PLANNED",
          focus: block.focus ?? null,
        },
      });
    }
  });

  return {
    blocks: plan.blocks.length,
    scheduledMinutes: plan.scheduledMinutes,
    freeMinutes: plan.freeMinutes,
    deferred: plan.deferred.length,
    isLightDay: plan.isLightDay,
  };
}
