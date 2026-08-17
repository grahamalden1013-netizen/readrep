import { DateTime } from "luxon";

import type { AssignmentType } from "@/lib/generated/prisma/enums";
import type { Preferences } from "@/lib/preferences";
import {
  capacityForDay,
  findFreeWindows,
  totalFreeMinutes,
  type Busy,
  type FreeWindow,
} from "@/lib/planner/free-time";

/**
 * Turns a ranked task list plus real free time into a chronological plan.
 *
 * Work is placed in priority order into the gaps between the student's actual
 * calendar events, split into sittings of their preferred length, with breaks
 * between. Nothing is ever placed over an existing event, and nothing is
 * written back to Google — the plan lives only in our database.
 */

export type PlannableTask = {
  assignmentId: string;
  title: string;
  type: AssignmentType;
  priorityScore: number;
  /** Minutes of work still to do. */
  remainingMinutes: number;
  dueAt: Date;
  /** Test preparation rather than finishing a deliverable. */
  isPrep: boolean;
  focus?: string;
};

export type PlannedBlock = {
  assignmentId: string;
  title: string;
  type: AssignmentType;
  start: Date;
  end: Date;
  minutes: number;
  isPrep: boolean;
  focus?: string;
};

export type DayPlan = {
  blocks: PlannedBlock[];
  /** Tasks that did not fit in the available time. */
  deferred: PlannableTask[];
  freeMinutes: number;
  scheduledMinutes: number;
  capacityMinutes: number;
  isLightDay: boolean;
};

/** Shortest sitting worth scheduling. */
const MIN_BLOCK_MINUTES = 15;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * Places tasks into free windows.
 *
 * A task longer than the preferred session length is split across several
 * sittings rather than scheduled as one marathon block. Breaks are inserted
 * between consecutive blocks inside the same window.
 */
export function planDay(options: {
  tasks: PlannableTask[];
  busy: Busy[];
  preferences: Preferences;
  timezone: string;
  now: Date;
  day?: DateTime;
}): DayPlan {
  const { tasks, busy, preferences, timezone, now } = options;
  const day =
    options.day ?? DateTime.fromJSDate(now, { zone: timezone }).startOf("day");

  const windows = findFreeWindows({
    day,
    busy,
    preferences,
    timezone,
    now,
    minimumMinutes: MIN_BLOCK_MINUTES,
  });

  const freeMinutes = totalFreeMinutes(windows);
  const capacityMinutes = capacityForDay(day, freeMinutes, preferences);
  const weekday = day.weekday % 7;
  const isLightDay = preferences.lightDays.includes(weekday);

  // Highest priority first; ties broken by the nearer deadline.
  const queue = [...tasks]
    .filter((task) => task.remainingMinutes > 0)
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        a.dueAt.getTime() - b.dueAt.getTime(),
    )
    .map((task) => ({ ...task }));

  const blocks: PlannedBlock[] = [];
  let scheduledMinutes = 0;

  for (const window of windows) {
    let cursor = window.start;
    let blocksInWindow = 0;

    while (cursor < window.end && scheduledMinutes < capacityMinutes) {
      const next = queue.find((task) => task.remainingMinutes > 0);
      if (!next) break;

      // Breaks separate consecutive sittings, but never open a window.
      if (blocksInWindow > 0 && preferences.breakMinutes > 0) {
        cursor = addMinutes(cursor, preferences.breakMinutes);
        if (cursor >= window.end) break;
      }

      const windowRemaining = Math.floor(
        (window.end.getTime() - cursor.getTime()) / 60_000,
      );
      const capacityRemaining = capacityMinutes - scheduledMinutes;

      let minutes = Math.min(
        next.remainingMinutes,
        preferences.sessionMinutes,
        windowRemaining,
        capacityRemaining,
      );

      // Avoid leaving a useless stub: if finishing this sitting would strand
      // less than a full short block, absorb the remainder into this one.
      const leftover = next.remainingMinutes - minutes;
      if (leftover > 0 && leftover < MIN_BLOCK_MINUTES) {
        const absorbed = minutes + leftover;
        if (absorbed <= windowRemaining && absorbed <= capacityRemaining) {
          minutes = absorbed;
        }
      }

      if (minutes < MIN_BLOCK_MINUTES) {
        // Too little room left in this window to be useful.
        if (windowRemaining < MIN_BLOCK_MINUTES) break;
        if (capacityRemaining < MIN_BLOCK_MINUTES) break;
        // Otherwise the task itself is nearly done; schedule what remains.
        if (next.remainingMinutes < MIN_BLOCK_MINUTES) {
          const end = addMinutes(cursor, next.remainingMinutes);
          blocks.push({
            assignmentId: next.assignmentId,
            title: next.title,
            type: next.type,
            start: cursor,
            end,
            minutes: next.remainingMinutes,
            isPrep: next.isPrep,
            focus: next.focus,
          });
          scheduledMinutes += next.remainingMinutes;
          cursor = end;
          next.remainingMinutes = 0;
          blocksInWindow += 1;
          continue;
        }
        break;
      }

      const end = addMinutes(cursor, minutes);
      blocks.push({
        assignmentId: next.assignmentId,
        title: next.title,
        type: next.type,
        start: cursor,
        end,
        minutes,
        isPrep: next.isPrep,
        focus: next.focus,
      });

      scheduledMinutes += minutes;
      next.remainingMinutes -= minutes;
      cursor = end;
      blocksInWindow += 1;
    }

    if (scheduledMinutes >= capacityMinutes) break;
  }

  const deferred = queue.filter((task) => task.remainingMinutes > 0);

  return {
    blocks,
    deferred,
    freeMinutes,
    scheduledMinutes,
    capacityMinutes,
    isLightDay,
  };
}

export type { FreeWindow };
