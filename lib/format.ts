import { DateTime } from "luxon";

/** Formatting helpers shared by server and client components. */

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

export function formatTime(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: timezone }).toFormat("h:mm a");
}

export function formatTimeRange(
  start: Date,
  end: Date,
  timezone: string,
): string {
  return `${formatTime(start, timezone)} – ${formatTime(end, timezone)}`;
}

export function formatDayLabel(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: timezone }).toFormat("EEE");
}

/**
 * Renders a due date the way a student would say it: "today at 11:59 PM",
 * "tomorrow", "Fri 3 Apr". All-day work has no meaningful clock time, so the
 * time is omitted.
 */
export function formatDue(
  dueAt: Date,
  allDay: boolean,
  timezone: string,
  now: Date = new Date(),
): string {
  const due = DateTime.fromJSDate(dueAt, { zone: timezone });
  const today = DateTime.fromJSDate(now, { zone: timezone }).startOf("day");
  const dayDiff = Math.round(due.startOf("day").diff(today, "days").days);

  const time = allDay ? "" : ` at ${due.toFormat("h:mm a")}`;

  if (dayDiff === 0) return `Today${time}`;
  if (dayDiff === 1) return `Tomorrow${time}`;
  if (dayDiff === -1) return `Yesterday${time}`;
  if (dayDiff < 0) return `${Math.abs(dayDiff)} days ago`;
  if (dayDiff < 7) return `${due.toFormat("EEEE")}${time}`;
  return `${due.toFormat("EEE d LLL")}${time}`;
}

/** "in 5 days" / "today" / "2 days ago", for assessment countdowns. */
export function formatCountdown(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 0) return `${days} days`;
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)} days ago`;
}

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** First line or so of a description, for card previews. */
export function previewText(text: string | null, limit = 140): string | null {
  if (!text) return null;
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) return null;
  if (collapsed.length <= limit) return collapsed;
  return `${collapsed.slice(0, limit).trimEnd()}…`;
}
