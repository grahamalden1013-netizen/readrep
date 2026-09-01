/** Machine-readable reason a Server Action failed, when the client should react
 *  to it specifically (e.g. "auth-required" → send the user to /login). */
export type ActionErrorCode = "auth-required";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: ActionErrorCode };
