import "server-only";

import { DateTime } from "luxon";

import { prisma } from "@/lib/db";
import type {
  AssignmentStatus,
  AssignmentType,
} from "@/lib/generated/prisma/enums";
import { daysRemaining, prepStatus, type PrepStatus } from "@/lib/planner/test-prep";
import type { CurrentUser } from "@/lib/session";

/**
 * Everything the dashboard renders, assembled in one place so the page itself
 * stays presentational.
 */

export type AssignmentView = {
  id: string;
  title: string;
  course: string | null;
  description: string | null;
  sourceUrl: string | null;
  type: AssignmentType;
  status: AssignmentStatus;
  dueAt: Date;
  allDay: boolean;
  estimatedMinutes: number;
  priorityScore: number;
  isOverdue: boolean;
  removedFromSource: boolean;
};

export type ScheduleEntry = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
};

export type PlanBlock = {
  id: string;
  assignmentId: string;
  title: string;
  type: AssignmentType;
  startAt: Date;
  endAt: Date;
  minutes: number;
  isPrep: boolean;
  focus: string | null;
  status: "PLANNED" | "COMPLETED" | "SKIPPED";
};

export type AssessmentView = AssignmentView & {
  daysLeft: number;
  prep: {
    planned: number;
    completed: number;
    totalMinutes: number;
    status: PrepStatus;
    label: string;
    /** Proposed sessions, ordered by day. */
    sessions: { day: Date; minutes: number; focus: string | null }[];
  };
};

export type DashboardData = {
  now: Date;
  timezone: string;
  hasSchoolCalendar: boolean;
  lastSyncedAt: Date | null;
  today: {
    schedule: ScheduleEntry[];
    plan: PlanBlock[];
    topTask: AssignmentView | null;
    dueTodayMinutes: number;
    openCount: number;
    nextAssessment: AssessmentView | null;
  };
  groups: {
    today: AssignmentView[];
    tomorrow: AssignmentView[];
    thisWeek: AssignmentView[];
    later: AssignmentView[];
  };
  assessments: AssessmentView[];
};

const OPEN_STATUSES: AssignmentStatus[] = ["NOT_STARTED", "IN_PROGRESS"];

function toView(
  row: {
    id: string;
    title: string;
    course: string | null;
    description: string | null;
    sourceUrl: string | null;
    assignmentType: AssignmentType;
    status: AssignmentStatus;
    dueAt: Date;
    allDay: boolean;
    estimatedMinutes: number;
    priorityScore: number;
    removedFromSourceAt: Date | null;
  },
  now: Date,
): AssignmentView {
  return {
    id: row.id,
    title: row.title,
    course: row.course,
    description: row.description,
    sourceUrl: row.sourceUrl,
    type: row.assignmentType,
    status: row.status,
    dueAt: row.dueAt,
    allDay: row.allDay,
    estimatedMinutes: row.estimatedMinutes,
    priorityScore: row.priorityScore,
    isOverdue:
      row.dueAt.getTime() < now.getTime() && OPEN_STATUSES.includes(row.status),
    removedFromSource: row.removedFromSourceAt !== null,
  };
}

export async function getDashboardData(
  user: CurrentUser,
): Promise<DashboardData> {
  const now = new Date();
  const zone = user.timezone;

  const today = DateTime.fromJSDate(now, { zone }).startOf("day");
  const tomorrow = today.plus({ days: 1 });
  const dayAfterTomorrow = today.plus({ days: 2 });
  // "This week" runs to the end of the coming seven days.
  const weekEnd = today.plus({ days: 7 }).endOf("day");

  const [sources, assignments, busyToday, planToday, prepSessions] =
    await Promise.all([
      prisma.calendarSource.findMany({
        where: { userId: user.id },
        select: { type: true, lastSyncedAt: true },
      }),
      prisma.assignment.findMany({
        where: { userId: user.id, removedFromSourceAt: null },
        orderBy: [{ priorityScore: "desc" }, { dueAt: "asc" }],
      }),
      prisma.busyBlock.findMany({
        where: {
          userId: user.id,
          startAt: { lt: tomorrow.toJSDate() },
          endAt: { gt: today.toJSDate() },
        },
        orderBy: { startAt: "asc" },
      }),
      prisma.studySession.findMany({
        where: {
          userId: user.id,
          startAt: { gte: today.toJSDate(), lt: tomorrow.toJSDate() },
        },
        orderBy: { startAt: "asc" },
        include: { assignment: { select: { title: true, assignmentType: true } } },
      }),
      prisma.studySession.findMany({
        where: {
          userId: user.id,
          kind: "TEST_PREP",
          startAt: { gte: today.toJSDate() },
        },
        orderBy: { startAt: "asc" },
      }),
    ]);

  const hasSchoolCalendar = sources.some((s) => s.type === "SCHOOL");
  const lastSyncedAt = sources.reduce<Date | null>((latest, source) => {
    if (!source.lastSyncedAt) return latest;
    return !latest || source.lastSyncedAt > latest ? source.lastSyncedAt : latest;
  }, null);

  const views = assignments.map((row) => toView(row, now));
  const open = views.filter((v) => OPEN_STATUSES.includes(v.status));

  // ---- Grouping ---------------------------------------------------------
  const groups: DashboardData["groups"] = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  for (const view of open) {
    const due = DateTime.fromJSDate(view.dueAt, { zone });
    if (due < tomorrow) {
      // Overdue work stays visible at the top rather than disappearing.
      groups.today.push(view);
    } else if (due < dayAfterTomorrow) {
      groups.tomorrow.push(view);
    } else if (due <= weekEnd) {
      groups.thisWeek.push(view);
    } else {
      groups.later.push(view);
    }
  }

  for (const key of Object.keys(groups) as (keyof typeof groups)[]) {
    groups[key].sort(
      (a, b) => b.priorityScore - a.priorityScore || +a.dueAt - +b.dueAt,
    );
  }

  // ---- Assessments ------------------------------------------------------
  const prepByAssignment = new Map<string, typeof prepSessions>();
  for (const session of prepSessions) {
    const list = prepByAssignment.get(session.assignmentId) ?? [];
    list.push(session);
    prepByAssignment.set(session.assignmentId, list);
  }

  const assessments: AssessmentView[] = open
    .filter(
      (v) => v.type === "MAJOR_ASSESSMENT" || v.type === "QUIZ" || v.type === "PROJECT",
    )
    .sort((a, b) => +a.dueAt - +b.dueAt)
    .map((view) => {
      const sessions = prepByAssignment.get(view.id) ?? [];
      const completed = sessions.filter((s) => s.status === "COMPLETED").length;
      const daysLeft = daysRemaining(view.dueAt, now, zone);
      const { status, label } = prepStatus({
        daysLeft,
        plannedSessions: sessions.length,
        completedSessions: completed,
      });

      return {
        ...view,
        daysLeft,
        prep: {
          planned: sessions.length,
          completed,
          totalMinutes: sessions.reduce(
            (sum, s) => sum + Math.round((+s.endAt - +s.startAt) / 60_000),
            0,
          ),
          status,
          label,
          sessions: sessions.map((s) => ({
            day: s.startAt,
            minutes: Math.round((+s.endAt - +s.startAt) / 60_000),
            focus: s.focus,
          })),
        },
      };
    });

  // ---- Today summary ----------------------------------------------------
  const dueTodayMinutes = groups.today.reduce(
    (sum, v) => sum + v.estimatedMinutes,
    0,
  );

  return {
    now,
    timezone: zone,
    hasSchoolCalendar,
    lastSyncedAt,
    today: {
      schedule: busyToday.map((b) => ({
        id: b.id,
        title: b.title ?? "Busy",
        startAt: b.startAt,
        endAt: b.endAt,
        allDay: b.allDay,
      })),
      plan: planToday.map((s) => ({
        id: s.id,
        assignmentId: s.assignmentId,
        title: s.assignment.title,
        type: s.assignment.assignmentType,
        startAt: s.startAt,
        endAt: s.endAt,
        minutes: Math.round((+s.endAt - +s.startAt) / 60_000),
        isPrep: s.kind === "TEST_PREP",
        focus: s.focus,
        status: s.status,
      })),
      topTask: open[0] ?? null,
      dueTodayMinutes,
      openCount: open.length,
      nextAssessment:
        assessments.find(
          (a) => a.type === "MAJOR_ASSESSMENT" && a.daysLeft >= 0,
        ) ?? null,
    },
    groups,
    assessments,
  };
}
