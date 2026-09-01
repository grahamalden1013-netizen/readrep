import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";

/**
 * Routes that require a signed-in user. The demo flow is deliberately absent:
 * /games/new, /sessions/* and the seeded game must work without an account.
 */
const PROTECTED_PREFIXES = ["/account"];

/**
 * Runs on every request (see `proxy.ts`). This is the one place a refreshed
 * Supabase session cookie is written back to the browser: Server Components
 * cannot set cookies, so without this the session would never be renewed.
 */
export async function updateSession(request: NextRequest) {
  if (!supabaseEnv) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the session when needed and, via `setAll` above, writes the new
  // cookie onto `response`. Errors here (e.g. an expired refresh token) leave
  // `user` null; the downstream page or action decides what to do about that.
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
