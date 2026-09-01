import { cache } from "react";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { NEXTREP_SCHEMA, supabaseEnv } from "@/lib/env";
import { AuthRequiredError } from "@/lib/errors";

/**
 * One Supabase server client per request.
 *
 * `cache()` memoises this for the lifetime of a single server request, so the
 * layout, the page, its data functions and any Server Action it triggers all
 * share the same client — and therefore the same auth/session state.
 *
 * That sharing matters: Supabase refresh tokens rotate and are single-use. If
 * several independently-created clients each call `auth.getUser()` in the same
 * request, they race to refresh with the same refresh token; the losers get
 * `refresh_token_already_used`, and `@supabase/ssr` reacts by deleting the
 * session cookie — silently signing the user out mid-request. One shared client
 * refreshes at most once, so that race cannot happen.
 *
 * Returns null when Supabase is not configured: the seeded demo runs with no
 * backend at all, and callers must handle that.
 */
export const createClient = cache(async () => {
  if (!supabaseEnv) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    // NextRep's tables live in their own schema so they cannot collide with
    // anything else in the project. Auth is unaffected by this setting.
    db: { schema: NEXTREP_SCHEMA },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called while rendering a Server Component, where cookies are
          // read-only. The proxy (`lib/supabase/middleware.ts`) runs on every
          // request and is the single place that writes a refreshed session
          // cookie back to the browser.
        }
      },
    },
  });
});

/**
 * The signed-in Supabase user for this request, or null. Memoised per request:
 * every caller shares one `auth.getUser()` result.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
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
