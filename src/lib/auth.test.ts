/**
 * @jest-environment node
 *
 * jose's WebCrypto calls construct Uint8Array/CryptoKey instances that must
 * come from the same realm jose itself runs in. Under jsdom (this project's
 * default test environment) that realm is a separate sandboxed global from
 * Node's, so `instanceof` checks inside jose fail. Running this file in the
 * plain Node environment keeps everything in one realm.
 */
import { signSession, verifySession, type SessionPayload } from "./auth";
import { hashPassword, verifyPassword } from "./password";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-not-used-in-production";
});

describe("password hashing", () => {
  it("verifies a matching password against its hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(
      verifyPassword("correct horse battery staple", hash)
    ).resolves.toBe(true);
  });

  it("rejects a non-matching password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });
});

describe("session tokens", () => {
  const payload: SessionPayload = {
    userId: "user_1",
    email: "eda@example.com",
    name: "Eda",
    role: "CUSTOMER",
  };

  it("round-trips a signed session", async () => {
    const token = await signSession(payload);
    const verified = await verifySession(token);
    expect(verified).toMatchObject(payload);
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(payload);
    await expect(verifySession(token + "tampered")).resolves.toBeNull();
  });

  it("rejects garbage input", async () => {
    await expect(verifySession("not-a-jwt")).resolves.toBeNull();
  });
});
