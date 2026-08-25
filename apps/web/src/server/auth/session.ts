import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { config } from "../config";

/**
 * Phase 0 session cookies.
 *
 * A signed, expiring cookie holding a user id and nothing else. HMAC-SHA256
 * over `userId.expiresAt`, compared in constant time. The cookie is
 * `httpOnly`, `sameSite=lax`, and `secure` in production.
 *
 * What this is not: server-side session storage, so there is no revocation
 * beyond expiry. That is a real gap, recorded in docs/KNOWN_LIMITATIONS.md, and
 * it is one of the reasons Phase 1 replaces this module rather than extending
 * it.
 */

export const SESSION_COOKIE = "readrep_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const sign = (payload: string): string =>
  createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");

export const encodeSession = (userId: string, expiresAtMs: number): string => {
  const payload = `${userId}.${expiresAtMs}`;
  return `${payload}.${sign(payload)}`;
};

export type DecodedSession = { userId: string; expiresAtMs: number };

export const decodeSession = (
  token: string | undefined,
  nowMs: number,
): DecodedSession | null => {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signature] = parts as [string, string, string];

  const expected = sign(`${userId}.${expiresRaw}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const expiresAtMs = Number(expiresRaw);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null;
  if (userId.length === 0) return null;

  return { userId, expiresAtMs };
};

export const startSession = async (userId: string): Promise<void> => {
  const expiresAtMs = Date.now() + SESSION_TTL_MS;
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(userId, expiresAtMs), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: "/",
    expires: new Date(expiresAtMs),
  });
};

export const endSession = async (): Promise<void> => {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
};

export const readSessionUserId = async (): Promise<string | null> => {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value, Date.now())?.userId ?? null;
};
