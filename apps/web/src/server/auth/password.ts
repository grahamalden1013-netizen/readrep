import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/**
 * Phase 0 password hashing.
 *
 * scrypt with a per-user random salt and a constant-time comparison. This is
 * adequate for a local development sign-in and is NOT the production identity
 * story: Phase 1 replaces this whole module with a real identity provider that
 * handles recovery, session revocation, and rate limiting. See
 * docs/adr/0004-authentication.md.
 */
export const hashPassword = async (
  password: string,
): Promise<{ passwordHash: string; salt: string }> => {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return { passwordHash: derived.toString("hex"), salt };
};

export const verifyPassword = async (
  password: string,
  passwordHash: string,
  salt: string,
): Promise<boolean> => {
  const derived = await scrypt(password, salt, KEY_LENGTH);
  const expected = Buffer.from(passwordHash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
};
