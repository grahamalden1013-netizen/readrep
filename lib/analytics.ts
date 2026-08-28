/**
 * Analytics abstraction.
 *
 * Deliberately minimal. Events carry a name and a small set of non-identifying
 * properties — never a user id, never the text a student wrote, never their
 * position on a political question. In demo mode events go to the console
 * behind a flag; a real sink is swapped in by replacing `sink`.
 */

export type AnalyticsEvent =
  | "brief_viewed"
  | "debate_started"
  | "debate_completed"
  | "switch_sides_started"
  | "switch_sides_completed"
  | "article_read"
  | "signup_completed"
  | "class_joined"
  | "debate_shared"
  | "explainer_opened"
  | "position_selected";

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | undefined
>;

type Sink = (event: AnalyticsEvent, properties: AnalyticsProperties) => void;

const consoleSink: Sink = (event, properties) => {
  if (process.env.NODE_ENV === "development") {
    console.debug("[ngn/analytics]", event, properties);
  }
};

let sink: Sink = consoleSink;

export function setAnalyticsSink(next: Sink): void {
  sink = next;
}

export function track(
  event: AnalyticsEvent,
  properties: AnalyticsProperties = {},
): void {
  try {
    sink(event, properties);
  } catch {
    // Analytics must never break a debate in progress.
  }
}
