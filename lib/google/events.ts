import "server-only";

import { DateTime } from "luxon";

import { getCalendarClient, translateGoogleError } from "@/lib/google/client";

export type FetchedEvent = {
  googleEventId: string;
  title: string;
  description: string | null;
  /** First http(s) link found on the event — the Schoology assignment page. */
  sourceUrl: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  /** Google marks the user as free for some events even when they exist. */
  transparent: boolean;
  status: string;
};

/** Pulls the first http(s) URL out of the event's link fields or description. */
function extractSourceUrl(
  htmlLink: string | null | undefined,
  description: string | null,
  location: string | null | undefined,
): string | null {
  // Prefer a Schoology link in the description or location over Google's own
  // htmlLink, which just points back at the calendar event.
  for (const candidate of [description, location]) {
    if (!candidate) continue;
    const match = candidate.match(/https?:\/\/[^\s"'<>)]+/);
    if (match) return match[0];
  }
  return htmlLink ?? null;
}

/** Strips the HTML Google sometimes puts in descriptions down to plain text. */
function toPlainText(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > 0 ? text : null;
}

/**
 * Resolves a Google start/end pair into absolute instants.
 *
 * All-day events carry a bare date and no timezone. Google's `end.date` is
 * exclusive, so a one-day event spans 18th->19th; we clamp it back to the end
 * of the real final day in the user's own timezone, which is when the work is
 * actually due.
 */
function resolveWindow(
  start: { date?: string | null; dateTime?: string | null },
  end: { date?: string | null; dateTime?: string | null } | undefined,
  timezone: string,
): { start: Date; end: Date; allDay: boolean } | null {
  if (start.dateTime) {
    const startAt = new Date(start.dateTime);
    const endAt = end?.dateTime
      ? new Date(end.dateTime)
      : new Date(startAt.getTime() + 3_600_000);
    return { start: startAt, end: endAt, allDay: false };
  }

  if (start.date) {
    const startOfDay = DateTime.fromISO(start.date, { zone: timezone }).startOf(
      "day",
    );
    if (!startOfDay.isValid) return null;

    const exclusiveEnd = end?.date
      ? DateTime.fromISO(end.date, { zone: timezone }).startOf("day")
      : startOfDay.plus({ days: 1 });

    const inclusiveEnd = (
      exclusiveEnd.isValid && exclusiveEnd > startOfDay
        ? exclusiveEnd
        : startOfDay.plus({ days: 1 })
    ).minus({ minutes: 1 });

    return {
      start: startOfDay.toJSDate(),
      end: inclusiveEnd.toJSDate(),
      allDay: true,
    };
  }

  return null;
}

/**
 * Reads events from one calendar over a window.
 *
 * `singleEvents` expands recurring series into individual instances, which is
 * what we want — each occurrence is its own piece of work or its own busy block.
 */
export async function fetchEvents(
  userId: string,
  googleCalendarId: string,
  options: { from: Date; to: Date; timezone: string },
): Promise<FetchedEvent[]> {
  const calendar = await getCalendarClient(userId);
  const events: FetchedEvent[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const response = await calendar.events.list({
        calendarId: googleCalendarId,
        timeMin: options.from.toISOString(),
        timeMax: options.to.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 2500,
        pageToken,
      });

      for (const item of response.data.items ?? []) {
        if (!item.id || !item.start) continue;
        // Cancelled instances of a recurring series come back as tombstones.
        if (item.status === "cancelled") continue;

        const window = resolveWindow(
          item.start,
          item.end ?? undefined,
          options.timezone,
        );
        if (!window) continue;

        const description = toPlainText(item.description);

        events.push({
          googleEventId: item.id,
          title: (item.summary ?? "Untitled").trim(),
          description,
          sourceUrl: extractSourceUrl(item.htmlLink, description, item.location),
          start: window.start,
          end: window.end,
          allDay: window.allDay,
          transparent: item.transparency === "transparent",
          status: item.status ?? "confirmed",
        });
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (error) {
    throw translateGoogleError(error);
  }

  return events;
}
