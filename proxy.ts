import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect for signed-out visitors.
 *
 * This is a UX shortcut only — it checks for the presence of a session cookie,
 * not its validity. Real authorization happens in `requireUser()` on every
 * page and Server Action.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/settings"];

const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasSessionCookie = SESSION_COOKIES.some((name) =>
    request.cookies.has(name),
  );
  if (hasSessionCookie) return NextResponse.next();

  const signInUrl = new URL("/sign-in", request.url);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
