import type { ArenaProfile, DebateRun } from "@/types/ngn";

/**
 * The Arena store, as a module-level external store.
 *
 * Modelled for `useSyncExternalStore` rather than an effect that copies
 * localStorage into state: React renders the server snapshot during hydration
 * and swaps to the client snapshot immediately after, which is mismatch-free
 * by construction. `hydrated` rides along inside the snapshot so the UI can
 * show a loading state instead of flashing an empty one.
 *
 * Swapping demo persistence for Supabase means replacing `read` and `write`.
 */

const STORAGE_KEY = "ngn.arena.v1";

export type ArenaState = {
  hydrated: boolean;
  profile: ArenaProfile | null;
  activeRun: DebateRun | null;
  history: DebateRun[];
};

/** Stable identity: React compares snapshots by reference. */
const SERVER_STATE: ArenaState = {
  hydrated: false,
  profile: null,
  activeRun: null,
  history: [],
};

function read(): ArenaState {
  if (typeof window === "undefined") return SERVER_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...SERVER_STATE, hydrated: true };
    const parsed = JSON.parse(raw) as Partial<ArenaState>;
    return {
      hydrated: true,
      profile: parsed.profile ?? null,
      activeRun: parsed.activeRun ?? null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    // A corrupt value must not lock a student out of the product.
    return { ...SERVER_STATE, hydrated: true };
  }
}

function write(state: ArenaState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: state.profile,
        activeRun: state.activeRun,
        history: state.history,
      }),
    );
  } catch {
    // Storage can be full or blocked; the session still works in memory.
  }
}

let clientState: ArenaState | null = null;
const listeners = new Set<() => void>();

export function getServerSnapshot(): ArenaState {
  return SERVER_STATE;
}

export function getSnapshot(): ArenaState {
  if (clientState === null) clientState = read();
  return clientState;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Apply a transition, persist it, and notify subscribers. */
export function update(
  transition: (state: ArenaState) => ArenaState,
): ArenaState {
  const next = transition(getSnapshot());
  if (next === clientState) return next;
  clientState = next;
  write(next);
  for (const listener of listeners) listener();
  return next;
}

export function clear(): void {
  clientState = { ...SERVER_STATE, hydrated: true };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to recover from — in-memory state is already cleared.
    }
  }
  for (const listener of listeners) listener();
}
