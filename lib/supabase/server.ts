import { cache } from "react";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NEXTREP_SCHEMA, supabaseEnv } from "@/lib/env";
import { AuthRequiredError } from "@/lib/errors";

/**
 * Exactly one Supabase server client per request — including inside Server
 * Actions.
 *
 * `React.cache()` memoises within a render, but **not** inside a Server Action.
 * An action that touched Supabase from several helpers (`getBackendAvailability`,
 * `requireUserId`, `getBackend`) therefore used to build several clients. Each
 * client independently calls `auth.getUser()`, and when the access token is due
 * for refresh they all POST the same **single-use, rotating** refresh token.
 * The first wins; a slower one then finds the token changed underneath it and
 * returns `AuthRefreshDiscardedError` (HTTP 409) — which surfaces as a bogus
 * "not signed in" and logs the user out at the worst moment (pressing Analyze).
 *
 * A `WeakMap` keyed on the request's cookie store is stable across renders and
 * actions alike, so every caller in a request shares one client. auth-js then
 * collapses concurrent refreshes onto a single in-flight promise, so the race
 * cannot happen. The proxy (`lib/supabase/middleware.ts`) keeps its own client
 * — it runs to completion before the action starts, so there is no overlap.
 *
 * Returns null when Supabase is not configured: the seeded demo runs with no
 * backend at all, and callers must handle that.
 */
type CookieStore = Awaited<ReturnType<typeof cookies>>;
type CookieToSet = { name: string; value: string; options: CookieOptions };

const isAuthCookie = (name: string) => name.includes("-auth-token");
const isRemoval = (c: CookieToSet) =>
  c.value === "" || (c.options?.maxAge ?? 1) <= 0 || c.options?.expires?.valueOf?.() === 0;

const clientForRequest = new WeakMap<CookieStore, SupabaseClient>();
const userForClient = new WeakMap<SupabaseClient, Promise<User | null>>();

function buildClient(cookieStore: CookieStore): SupabaseClient {
  return createServerClient(supabaseEnv!.url, supabaseEnv!.anonKey, {
    // NextRep's tables live in their own schema so they cannot collide with
    // anything else in the project. Auth is unaffected by this setting.
    db: { schema: NEXTREP_SCHEMA },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        // Apply refreshed cookies, but never let a `getUser()` failure (429,
        // 5xx, network) clear the session here. Real sign-out deletes the
        // cookies itself (see the `logout` action).
        const authOps = cookiesToSet.filter((c) => isAuthCookie(c.name));
        const clearingSession = authOps.length > 0 && authOps.every(isRemoval);
        const toApply = clearingSession
          ? cookiesToSet.filter((c) => !isAuthCookie(c.name))
          : cookiesToSet;
        try {
          toApply.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component render: cookies are read-only here. The proxy
          // writes the refreshed cookie back to the browser.
        }
      },
    },
  }) as unknown as SupabaseClient;
}

export const createClient = cache(async (): Promise<SupabaseClient | null> => {
  if (!supabaseEnv) return null;

  const cookieStore = await cookies();
  const existing = clientForRequest.get(cookieStore);
  if (existing) return existing;

  const client = buildClient(cookieStore);
  clientForRequest.set(cookieStore, client);
  return client;
});

/**
 * The signed-in Supabase user for this request, or null. Resolved once per
 * request client and shared by every caller (`auth.getUser()` is a network
 * round-trip; there is no reason to make it more than once).
 *
 * A transient auth-server error (rate-limit, outage) falls back to the session
 * already in the cookie rather than reporting a spurious sign-out.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const cached = userForClient.get(supabase);
  if (cached) return cached;

  const pending = (async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error) return data.user;

    const status = (error as { status?: number }).status ?? 0;
    const transient = status === 429 || status === 0 || status >= 500;
    if (transient) {
      const { data: sessionData } = await supabase.auth.getSession();
      return sessionData.session?.user ?? null;
    }
    return null;
  })();

  userForClient.set(supabase, pending);
  return pending;
});

/**
 * Resolve the owner id for a protected mutation from the authenticated session
 * only. Never accepts an id from the caller/browser. Throws `AuthRequiredError`
 * when there is no signed-in user.
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new AuthRequiredError();
  return user.id;
}
