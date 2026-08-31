import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";

/**
 * Routes that require a signed-in user. The demo flow is deliberately absent:
 * /games/new, /sessions/* and the seeded game must work without an account.
 */
const PROTECTED_PREFIXES = ["/account"];

type CookieToSet = { name: string; value: string; options: CookieOptions };

const isAuthCookie = (name: string) => name.includes("-auth-token");
const isRemoval = (c: CookieToSet) =>
  c.value === "" || (c.options?.maxAge ?? 1) <= 0 || c.options?.expires?.valueOf?.() === 0;

/**
 * Runs on every request (see `proxy.ts`). Its job is to write a *refreshed*
 * session cookie back to the browser — Server Components cannot set cookies, so
 * without this the session would never renew.
 *
 * It must never be the thing that *ends* a session. A transient failure from
 * the auth server (HTTP 429 rate-limit, a 5xx, a network blip) makes
 * `@supabase/ssr` ask us to delete the auth cookie; honouring that on a proxy
 * that runs for every request turns one blip into a full logout mid-flow.
 * Sign-out has its own path (`logout` action → `supabase.auth.signOut()` in a
 * Server Action, which clears cookies directly), so here we drop auth-cookie
 * *removals* and apply only refreshes.
 */
export async function updateSession(request: NextRequest) {
  if (!supabaseEnv) {
    return NextResponse.next({ request });
  }

  // Router prefetches fire on link hover and viewport entry — many per page,
  // for navigations that may never happen. They don't need session gating, and
  // making each one refresh the token burns the auth server's rate limit for
  // no benefit. Let them through untouched; a real navigation still refreshes.
  if (request.headers.get("next-router-prefetch") === "1") {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        // A full session clear = every auth-cookie op is a removal. Keep the
        // existing session cookie in that case; apply everything else.
        const authOps = cookiesToSet.filter((c) => isAuthCookie(c.name));
        const clearingSession = authOps.length > 0 && authOps.every(isRemoval);
        const toApply = clearingSession
          ? cookiesToSet.filter((c) => !isAuthCookie(c.name))
          : cookiesToSet;

        toApply.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toApply.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the session when due and (via setAll) writes the new cookie onto
  // `response`. An error here just leaves `user` null; the page or action then
  // decides what to do — the session cookie itself is left intact.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (!user && isProtected) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
