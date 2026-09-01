/**
 * Raised when a protected operation runs without a signed-in user — no session,
 * or a session that expired and could not be refreshed. It is a distinct type
 * (not a generic Error) so Server Actions can translate it into a typed
 * `{ ok: false, code: "auth-required" }` result and the client can send the
 * user to /login and offer a retry, rather than surfacing a 500.
 */
export class AuthRequiredError extends Error {
  readonly code = "auth-required" as const;
  constructor(message = "Log in to continue — this is saved against your account.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}
