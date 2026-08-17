import "server-only";

import { DateTime } from "luxon";

import { prisma } from "@/lib/db";
import { fetchEvents } from "@/lib/google/events";
import { calculatePriority } from "@/lib/priority";
import { classifyEvent } from "@/lib/schoology/classify";
import { estimateMinutes } from "@/lib/schoology/estimate";
import type { CurrentUser } from "@/lib/session";

/**
 * Pulls Google Calendar into our database.
 *
 * Two hard rules, both from the spec:
 *   1. Google is read-only. Nothing here writes back to a calendar.
 *   2. The Schoology calendar produces assignments and never busy time — a
 *      due date is not an appointment, and treating it as one would wipe out
 *      the free windows the planner depends on.
 *
 * Local state survives every sync: `status` is never included in an update,
 * so marking something Done cannot be undone by the next refresh.
 */

/** How far back to look for assignments, so recently-missed work still shows. */
const ASSIGNMENT_LOOKBACK_DAYS = 14;
const ASSIGNMENT_LOOKAHEAD_DAYS = 120;

/** Availability is only needed for the near term. */
const BUSY_LOOKBACK_DAYS = 1;
const BUSY_LOOKAHEAD_DAYS = 21;

export type SyncResult = {
  added: number;
  updated: number;
  removed: number;
  busyBlocks: number;
  schoolCalendars: number;
  busyCalendars: number;
  syncedAt: Date;
};

export class NoSchoolCalendarError extends Error {
  constructor() {
    super("No school calendar selected.");
    this.name = "NoSchoolCalendarError";
  }
}

/**
 * An all-day event on a busy calendar ("Spring Break", a birthday) does not
 * mean the whole day is unavailable. Those are shown on the schedule but never
 * used to block out planning time.
 */
export function blocksPlanningTime(event: {
  allDay: boolean;
  transparent: boolean;
}): boolean {
  return !event.allDay && !event.transparent;
}

export async function syncUser(user: CurrentUser): Promise<SyncResult> {
  const now = new Date();
  const zone = user.timezone;

  const sources = await prisma.calendarSource.findMany({
    where: { userId: user.id },
  });
  const schoolSources = sources.filter((s) => s.type === "SCHOOL");
  const busySources = sources.filter((s) => s.type === "BUSY");

  if (schoolSources.length === 0) throw new NoSchoolCalendarError();

  let added = 0;
  let updated = 0;
  let removed = 0;

  // ---- Assignments (school calendars only) ------------------------------
  const assignmentFrom = DateTime.fromJSDate(now, { zone })
    .minus({ days: ASSIGNMENT_LOOKBACK_DAYS })
    .startOf("day")
    .toJSDate();
  const assignmentTo = DateTime.fromJSDate(now, { zone })
    .plus({ days: ASSIGNMENT_LOOKAHEAD_DAYS })
    .endOf("day")
    .toJSDate();

  for (const source of schoolSources) {
    const events = await fetchEvents(user.id, source.googleCalendarId, {
      from: assignmentFrom,
      to: assignmentTo,
      timezone: zone,
    });

    const seen = new Set<string>();

    for (const event of events) {
      seen.add(event.googleEventId);

      const { type, cleanTitle, course } = classifyEvent(
        event.title,
        event.description,
      );
      // An all-day assignment is due by the end of that day.
      const dueAt = event.allDay ? event.end : event.start;
      const estimated = estimateMinutes(type, event.title, event.description);

      const existing = await prisma.assignment.findUnique({
        where: {
          userId_googleEventId: {
            userId: user.id,
            googleEventId: event.googleEventId,
          },
        },
        select: { id: true, status: true, estimatedMinutes: true },
      });

      const priorityScore = calculatePriority({
        type,
        status: existing?.status ?? "NOT_STARTED",
        dueAt,
        estimatedMinutes: existing?.estimatedMinutes ?? estimated,
        testPrepLeadDays: user.preferences.testPrepLeadDays,
        now,
      });

      if (existing) {
        await prisma.assignment.update({
          where: { id: existing.id },
          data: {
            // Title, timing and description follow Google. `status` is
            // deliberately absent — that belongs to the student, not the feed.
            title: cleanTitle,
            description: event.description,
            sourceUrl: event.sourceUrl,
            course,
            assignmentType: type,
            dueAt,
            allDay: event.allDay,
            priorityScore,
            calendarId: source.id,
            removedFromSourceAt: null,
          },
        });
        updated += 1;
      } else {
        await prisma.assignment.create({
          data: {
            userId: user.id,
            googleEventId: event.googleEventId,
            calendarId: source.id,
            title: cleanTitle,
            description: event.description,
            sourceUrl: event.sourceUrl,
            course,
            assignmentType: type,
            dueAt,
            allDay: event.allDay,
            estimatedMinutes: estimated,
            priorityScore,
          },
        });
        added += 1;
      }
    }

    // Anything inside the window that Google no longer reports has been
    // deleted upstream. Flag it rather than destroying the student's status.
    const vanished = await prisma.assignment.updateMany({
      where: {
        userId: user.id,
        calendarId: source.id,
        dueAt: { gte: assignmentFrom, lte: assignmentTo },
        googleEventId: { notIn: [...seen] },
        removedFromSourceAt: null,
      },
      data: { removedFromSourceAt: now },
    });
    removed += vanished.count;
  }

  // ---- Availability (busy calendars only) --------------------------------
  const busyFrom = DateTime.fromJSDate(now, { zone })
    .minus({ days: BUSY_LOOKBACK_DAYS })
    .startOf("day")
    .toJSDate();
  const busyTo = DateTime.fromJSDate(now, { zone })
    .plus({ days: BUSY_LOOKAHEAD_DAYS })
    .endOf("day")
    .toJSDate();

  let busyBlocks = 0;

  // Rebuild the window wholesale: busy blocks are a disposable mirror of
  // Google, so there is no local state to preserve.
  await prisma.busyBlock.deleteMany({
    where: { userId: user.id, startAt: { gte: busyFrom, lte: busyTo } },
  });

  for (const source of busySources) {
    const events = await fetchEvents(user.id, source.googleCalendarId, {
      from: busyFrom,
      to: busyTo,
      timezone: zone,
    });

    for (const event of events) {
      await prisma.busyBlock.upsert({
        where: {
          userId_googleEventId: {
            userId: user.id,
            googleEventId: event.googleEventId,
          },
        },
        create: {
          userId: user.id,
          calendarId: source.id,
          googleEventId: event.googleEventId,
          title: event.title,
          startAt: event.start,
          endAt: event.end,
          allDay: event.allDay || event.transparent,
        },
        update: {
          calendarId: source.id,
          title: event.title,
          startAt: event.start,
          endAt: event.end,
          allDay: event.allDay || event.transparent,
        },
      });
      busyBlocks += 1;
    }
  }

  await prisma.calendarSource.updateMany({
    where: { userId: user.id },
    data: { lastSyncedAt: now },
  });

  return {
    added,
    updated,
    removed,
    busyBlocks,
    schoolCalendars: schoolSources.length,
    busyCalendars: busySources.length,
    syncedAt: now,
  };
}

/**
 * Recomputes priority for every open assignment. Scores decay with time, so
 * they need refreshing even when nothing changed upstream.
 */
export async function refreshPriorities(user: CurrentUser): Promise<number> {
  const now = new Date();
  const assignments = await prisma.assignment.findMany({
    where: {
      userId: user.id,
      status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
      removedFromSourceAt: null,
    },
    select: {
      id: true,
      assignmentType: true,
      status: true,
      dueAt: true,
      estimatedMinutes: true,
    },
  });

  for (const assignment of assignments) {
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        priorityScore: calculatePriority({
          type: assignment.assignmentType,
          status: assignment.status,
          dueAt: assignment.dueAt,
          estimatedMinutes: assignment.estimatedMinutes,
          testPrepLeadDays: user.preferences.testPrepLeadDays,
          now,
        }),
      },
    });
  }

  return assignments.length;
}
