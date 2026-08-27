"use client";

import { useSyncExternalStore } from "react";

/**
 * Small external stores for browser-only state.
 *
 * Using `useSyncExternalStore` rather than `useEffect` + `setState` keeps these
 * hydration-safe and avoids the cascading render that a mount effect causes.
 */

/* ------------------------------------------------------------- scrolled ---- */

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/** True once the page has scrolled past `threshold` pixels. */
export function useScrolled(threshold = 8) {
  return useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > threshold,
    () => false,
  );
}

/* ---------------------------------------------------------------- theme ---- */

const THEME_KEY = "ngn-theme";
const themeListeners = new Set<() => void>();

function emitTheme() {
  themeListeners.forEach((listener) => listener());
}

function subscribeTheme(onChange: () => void) {
  themeListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    themeListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export type Theme = "light" | "dark";

/**
 * The resolved theme. The inline script in the root layout stamps
 * `data-theme` before first paint, so reading it here never flashes.
 */
export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light" as Theme,
  );
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private browsing — the choice simply does not persist.
  }
  emitTheme();
}

/* -------------------------------------------------------- saved stories ---- */

const SAVED_KEY = "ngn-saved-stories";
const savedListeners = new Set<() => void>();

function readSavedRaw() {
  try {
    return window.localStorage.getItem(SAVED_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribeSaved(onChange: () => void) {
  savedListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    savedListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function parseSaved(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Raw saved-stories payload, or `null` while the value is still unknown on the
 * server and during hydration — which is what lets the UI show a skeleton
 * rather than briefly claiming nothing is saved.
 */
export function useSavedRaw(): string | null {
  return useSyncExternalStore(subscribeSaved, readSavedRaw, () => null);
}

export function toggleSavedStory(slug: string) {
  const current = parseSaved(readSavedRaw());
  const next = current.includes(slug)
    ? current.filter((item) => item !== slug)
    : [...current, slug];
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked — nothing persists, and the UI reflects that.
  }
  savedListeners.forEach((listener) => listener());
}
