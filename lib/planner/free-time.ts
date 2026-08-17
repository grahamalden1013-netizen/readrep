import { DateTime } from "luxon";

import type { Preferences } from "@/lib/preferences";

/** A span of time that is already spoken for. */
export type Busy = { startAt: Date; endAt: Date; allDay: boolean };

/** A span of time available for schoolwork. */
export type FreeWindow = { start: Date; end: Date; minutes: number };

/** Parses "HH:mm" onto a given day in a given zone. */
export function timeOnDay(
  day: DateTime,
  time: string,
  zone: string,
): DateTime {
  const [hour, minute] = time.split(":").map(Number);
  return day.setZone(zone).set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });
}

/**
 * Merges overlapping or touching busy spans so subtraction is straightforward.
 */
export function mergeBusy(busy: Busy[]): { start: Date; end: Date }[] {
  const spans = busy
    .filter((b) => !b.allDay) // All-day markers do not consume the whole day.
    .map((b) => ({ start: b.startAt, end: b.endAt }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: { start: Date; end: Date }[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start.getTime() <= last.end.getTime()) {
      if (span.end > last.end) last.end = span.end;
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

/**
 * Finds the usable stretches of a day.
 *
 * Starts from the student's working hours, removes anything already booked,
 * and drops fragments too short to be worth sitting down for. When the day is
 * already underway, the current time becomes the earliest start — the planner
 * should never propose a block that has already passed.
 */
export function findFreeWindows(options: {
  day: DateTime;
  busy: Busy[];
  preferences: Preferences;
  timezone: string;
  now: Date;
  /** Shortest window worth offering. */
  minimumMinutes?: number;
}): FreeWindow[] {
  const { day, busy, preferences, timezone, now } = options;
  const minimumMinutes = options.minimumMinutes ?? 15;

  const dayStart = timeOnDay(day, preferences.earliestStart, timezone);
  const dayEnd = timeOnDay(day, preferences.latestEnd, timezone);
  if (!dayStart.isValid || !dayEnd.isValid || dayEnd <= dayStart) return [];

  const nowDt = DateTime.fromJSDate(now, { zone: timezone });
  // Round up to the next 5 minutes so plans start on a tidy boundary.
  const roundedNow = nowDt.plus({
    minutes: (5 - (nowDt.minute % 5)) % 5,
  }).set({ second: 0, millisecond: 0 });

  let cursor = roundedNow > dayStart ? roundedNow : dayStart;
  if (cursor >= dayEnd) return [];

  const windows: FreeWindow[] = [];
  const merged = mergeBusy(busy);

  for (const span of merged) {
    const spanStart = DateTime.fromJSDate(span.start, { zone: timezone });
    const spanEnd = DateTime.fromJSDate(span.end, { zone: timezone });

    if (spanEnd <= cursor) continue;
    if (spanStart >= dayEnd) break;

    if (spanStart > cursor) {
      const gapEnd = spanStart < dayEnd ? spanStart : dayEnd;
      const minutes = gapEnd.diff(cursor, "minutes").minutes;
      if (minutes >= minimumMinutes) {
        windows.push({
          start: cursor.toJSDate(),
          end: gapEnd.toJSDate(),
          minutes: Math.floor(minutes),
        });
      }
    }

    if (spanEnd > cursor) cursor = spanEnd;
    if (cursor >= dayEnd) break;
  }

  if (cursor < dayEnd) {
    const minutes = dayEnd.diff(cursor, "minutes").minutes;
    if (minutes >= minimumMinutes) {
      windows.push({
        start: cursor.toJSDate(),
        end: dayEnd.toJSDate(),
        minutes: Math.floor(minutes),
      });
    }
  }

  return windows;
}

/** Total usable minutes across every free window. */
export function totalFreeMinutes(windows: FreeWindow[]): number {
  return windows.reduce((sum, window) => sum + window.minutes, 0);
}

/**
 * How much work the student should take on for a given day. Light days — the
 * ones they asked to keep clear — get a reduced share.
 */
export function capacityForDay(
  day: DateTime,
  freeMinutes: number,
  preferences: Preferences,
): number {
  const weekday = day.weekday % 7; // Luxon: Monday=1..Sunday=7 -> 0=Sunday
  const isLight = preferences.lightDays.includes(weekday);
  return Math.floor(freeMinutes * (isLight ? preferences.lightDayFactor : 1));
}
