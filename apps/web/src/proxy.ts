import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect for signed-out visitors.
 *
 * NOT A SECURITY BOUNDARY. It only checks whether a session cookie is present;
 * it does not verify the signature, does not load the user, and does not know
 * what the request is trying to reach. Its whole job is to save a signed-out
 * visitor a round trip.
 *
 * Every read and every mutation is authorized in the data-access layer
 * (`src/server/auth/authorize.ts`), which re-checks the caller against the
 * specific resource. A request that skips this file entirely still cannot read
 * anything it should not.
 */

const SESSION_COOKIE = "readrep_session";
const PROTECTED = ["/player", "/session", "/coach"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)) {
    const url = new URL("/sign-in", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/player/:path*", "/session/:path*", "/coach/:path*"],
};
