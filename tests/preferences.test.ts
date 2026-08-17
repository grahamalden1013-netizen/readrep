import { describe, expect, it } from "vitest";

import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  preferencesSchema,
} from "@/lib/preferences";

describe("preferences", () => {
  it("provides a complete set of defaults", () => {
    expect(DEFAULT_PREFERENCES.earliestStart).toBe("15:30");
    expect(DEFAULT_PREFERENCES.latestEnd).toBe("21:30");
    expect(DEFAULT_PREFERENCES.sessionMinutes).toBe(30);
    expect(DEFAULT_PREFERENCES.breakMinutes).toBe(10);
    expect(DEFAULT_PREFERENCES.lightDays).toEqual([5, 6]);
  });

  it("keeps valid stored values", () => {
    const stored = {
      ...DEFAULT_PREFERENCES,
      earliestStart: "16:00",
      sessionMinutes: 45,
      lightDays: [0],
    };
    expect(parsePreferences(stored)).toMatchObject({
      earliestStart: "16:00",
      sessionMinutes: 45,
      lightDays: [0],
    });
  });

  it("fills in missing keys from partial stored values", () => {
    expect(parsePreferences({ sessionMinutes: 20 })).toEqual({
      ...DEFAULT_PREFERENCES,
      sessionMinutes: 20,
    });
  });

  it("falls back to defaults for malformed values", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("nonsense")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences({ earliestStart: "25:00" })).toEqual(
      DEFAULT_PREFERENCES,
    );
    expect(parsePreferences({ sessionMinutes: 9999 })).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  it("rejects out-of-range weekday values", () => {
    expect(preferencesSchema.safeParse({ lightDays: [7] }).success).toBe(false);
    expect(preferencesSchema.safeParse({ lightDays: [-1] }).success).toBe(false);
  });

  it("rejects malformed time strings", () => {
    expect(preferencesSchema.safeParse({ latestEnd: "9:30" }).success).toBe(
      false,
    );
    expect(preferencesSchema.safeParse({ latestEnd: "21:60" }).success).toBe(
      false,
    );
  });
});
