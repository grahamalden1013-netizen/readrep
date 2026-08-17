import { z } from "zod";

/**
 * Planner preferences. Stored as JSON on the user row so the shape can evolve
 * without a migration; always read through `parsePreferences` so older rows
 * keep working.
 */
export const preferencesSchema = z.object({
  /** Earliest a study block may start, "HH:mm" in the user's timezone. */
  earliestStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm")
    .default("15:30"),
  /** Latest a study block may end, "HH:mm". */
  latestEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm")
    .default("21:30"),
  /** Preferred length of a single focused block, in minutes. */
  sessionMinutes: z.number().int().min(10).max(180).default(30),
  /** Break inserted between consecutive blocks, in minutes. */
  breakMinutes: z.number().int().min(0).max(60).default(10),
  /**
   * Days that should get a reduced workload. 0 = Sunday … 6 = Saturday,
   * matching `Date#getDay` and Luxon's `weekday % 7`.
   */
  lightDays: z.array(z.number().int().min(0).max(6)).default([5, 6]),
  /** Fraction of a normal day's capacity to use on a light day. */
  lightDayFactor: z.number().min(0.1).max(1).default(0.5),
  /** How many days before a major assessment to begin spaced study. */
  testPrepLeadDays: z.number().int().min(1).max(21).default(5),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = preferencesSchema.parse({});

/**
 * Tolerant parse: unknown or malformed stored preferences fall back to
 * defaults rather than breaking the dashboard.
 */
export function parsePreferences(value: unknown): Preferences {
  if (value == null || typeof value !== "object") return DEFAULT_PREFERENCES;
  const result = preferencesSchema.safeParse(value);
  return result.success ? result.data : DEFAULT_PREFERENCES;
}
