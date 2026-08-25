import { describe, expect, it, vi } from "vitest";

// The module reads config at import time for the signing secret.
vi.stubEnv(
  "READREP_SESSION_SECRET",
  "test-secret-for-readrep-session-cookies-0123456789",
);

const { decodeSession, encodeSession, SESSION_COOKIE } = await import("./session");

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

describe("session cookies", () => {
  it("round-trips a user id", () => {
    const token = encodeSession("user-1", NOW + HOUR);
    expect(decodeSession(token, NOW)).toEqual({
      userId: "user-1",
      expiresAtMs: NOW + HOUR,
    });
  });

  it("rejects a missing cookie", () => {
    expect(decodeSession(undefined, NOW)).toBeNull();
    expect(decodeSession("", NOW)).toBeNull();
  });

  it("rejects a token that is not three parts", () => {
    expect(decodeSession("user-1.123", NOW)).toBeNull();
    expect(decodeSession("garbage", NOW)).toBeNull();
  });

  it("rejects a tampered user id", () => {
    const token = encodeSession("user-1", NOW + HOUR);
    const [, expires, signature] = token.split(".");
    expect(decodeSession(`user-2.${expires}.${signature}`, NOW)).toBeNull();
  });

  it("rejects an extended expiry", () => {
    const token = encodeSession("user-1", NOW + HOUR);
    const [userId, , signature] = token.split(".");
    const farFuture = NOW + 100 * HOUR;
    expect(decodeSession(`${userId}.${farFuture}.${signature}`, NOW)).toBeNull();
  });

  it("rejects a forged signature", () => {
    const token = encodeSession("user-1", NOW + HOUR);
    const [userId, expires] = token.split(".");
    expect(decodeSession(`${userId}.${expires}.notarealsignature`, NOW)).toBeNull();
  });

  it("rejects an expired token even though the signature is valid", () => {
    const token = encodeSession("user-1", NOW - 1);
    expect(decodeSession(token, NOW)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = encodeSession("user-1", NOW + HOUR);
    vi.resetModules();
    vi.stubEnv(
      "READREP_SESSION_SECRET",
      "a-completely-different-secret-value-9876543210",
    );
    const other = await import("./session");
    expect(other.decodeSession(token, NOW)).toBeNull();
    vi.unstubAllEnvs();
  });

  it("names the cookie predictably", () => {
    expect(SESSION_COOKIE).toBe("readrep_session");
  });

  it("puts no readable user data in the token beyond the id", () => {
    const token = encodeSession("user-1", NOW + HOUR);
    expect(token).not.toMatch(/@/);
    expect(token.split(".")).toHaveLength(3);
  });
});
