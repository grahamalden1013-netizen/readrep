import "server-only";
import { AuthRequiredError } from "@/lib/errors";
import { supabaseEnv } from "@/lib/env";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

/**
 * Assert a signed-in user for a protected mutation when Supabase is the backend.
 * With the local file backend there are no accounts, so this is a no-op there.
 * Throws `AuthRequiredError` (→ typed result via `withAuthedAction`).
 */
export async function requireOwnerWhenSupabase(): Promise<void> {
  if (supabaseEnv) {
    await requireUserId();
  }
}

/**
 * Runs a protected Server Action body, turning a missing/expired session into a
 * typed `{ ok: false, code: "auth-required" }` result instead of a thrown 500.
 * The client uses the code to send the user to /login and offer a retry.
 *
 * Any other error is left to throw — those are real faults, not an auth state
 * the user can fix by signing in.
 */
export async function withAuthedAction<T>(
  run: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (cause) {
    if (cause instanceof AuthRequiredError) {
      return { ok: false, error: cause.message, code: cause.code };
    }
    throw cause;
  }
}
