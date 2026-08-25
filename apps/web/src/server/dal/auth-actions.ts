import "server-only";
import { z } from "zod";
import { localStore, rawCollections } from "../store/local-store";
import { verifyPassword } from "../auth/password";
import { endSession, startSession } from "../auth/session";
import { recordAudit } from "../auth/authorize";
import { logger } from "../logging";

export const SignInInput = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(200),
});

/**
 * Phase 0 local sign-in.
 *
 * Returns the same message whether the account does not exist or the password
 * is wrong, so the form cannot be used to enumerate which parents and players
 * have accounts.
 *
 * Not a production identity provider: no rate limiting, no lockout, no
 * recovery, no server-side revocation. Phase 1 replaces it. See
 * docs/KNOWN_LIMITATIONS.md.
 */
export const signIn = async (raw: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; message: string }> => {
  const parsed = SignInInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Enter an email address and a password." };
  }

  const generic = {
    ok: false as const,
    message: "That email and password do not match.",
  };

  const user = await localStore.identity.findUserByEmail(parsed.data.email);
  if (!user || user.deactivatedAt !== null) {
    await recordAudit({
      action: "auth.sign_in_failed",
      resourceType: "user",
      resourceId: "unknown",
      outcome: "denied",
    });
    return generic;
  }

  const credential = await rawCollections.credentials.find((c) => c.userId === user.id);
  if (!credential) {
    logger.warn("account has no credential record", { userId: user.id });
    return generic;
  }

  const valid = await verifyPassword(
    parsed.data.password,
    credential.passwordHash,
    credential.salt,
  );
  if (!valid) {
    await recordAudit({
      action: "auth.sign_in_failed",
      resourceType: "user",
      resourceId: user.id,
      outcome: "denied",
    });
    return generic;
  }

  await startSession(user.id);
  await recordAudit({
    action: "auth.signed_in",
    resourceType: "user",
    resourceId: user.id,
    outcome: "allowed",
    actorUserId: user.id,
  });
  return { ok: true };
};

export const signOut = async (userId: string | null): Promise<void> => {
  if (userId) {
    await recordAudit({
      action: "auth.signed_out",
      resourceType: "user",
      resourceId: userId,
      outcome: "allowed",
      actorUserId: userId,
    });
  }
  await endSession();
};
