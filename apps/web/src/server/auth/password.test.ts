import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const { passwordHash, salt } = await hashPassword("correct horse battery staple");
    await expect(
      verifyPassword("correct horse battery staple", passwordHash, salt),
    ).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const { passwordHash, salt } = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("wrong password", passwordHash, salt)).resolves.toBe(
      false,
    );
  });

  it("never stores the plaintext", async () => {
    const { passwordHash, salt } = await hashPassword("hunter2");
    expect(passwordHash).not.toContain("hunter2");
    expect(salt).not.toContain("hunter2");
  });

  it("salts, so identical passwords hash differently", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    expect(a.salt).not.toBe(b.salt);
    expect(a.passwordHash).not.toBe(b.passwordHash);
  });

  it("does not verify against another user's salt", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    await expect(verifyPassword("same password", a.passwordHash, b.salt)).resolves.toBe(
      false,
    );
  });

  it("rejects a malformed hash without throwing", async () => {
    const { salt } = await hashPassword("x");
    await expect(verifyPassword("x", "abcd", salt)).resolves.toBe(false);
  });
});
