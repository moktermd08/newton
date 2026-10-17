import test from "node:test";
import assert from "node:assert/strict";
import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "../src/lib/session.ts";

process.env.AUTH_SECRET = "x".repeat(40);
const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);

test("a fresh token verifies and carries sub and iat", () => {
  const p = verifySessionToken(createSessionToken("user-1", T0), T0 + 1000);
  assert.equal(p?.sub, "user-1");
  assert.equal(p?.iat, Math.floor(T0 / 1000));
});

test("expires after the TTL", () => {
  const t = createSessionToken("u", T0);
  assert.ok(verifySessionToken(t, T0 + (SESSION_TTL_SECONDS - 1) * 1000));
  assert.equal(verifySessionToken(t, T0 + (SESSION_TTL_SECONDS + 1) * 1000), null);
});

test("rejects tampering, a different secret, and malformed tokens", () => {
  const t = createSessionToken("u", T0);
  const [body, mac] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ sub: "admin", iat: 0, exp: 9999999999 })).toString("base64url");
  assert.equal(verifySessionToken(`${forged}.${mac}`, T0), null, "signature does not cover the forged body");
  assert.equal(verifySessionToken(`${body}.AAAA`, T0), null);
  assert.equal(verifySessionToken(`${body}.${mac}.extra`, T0), null);
  assert.equal(verifySessionToken(body, T0), null);
  assert.equal(verifySessionToken("", T0), null);
  assert.equal(verifySessionToken(undefined, T0), null);
  process.env.AUTH_SECRET = "y".repeat(40);
  assert.equal(verifySessionToken(t, T0), null, "token from another secret");
  process.env.AUTH_SECRET = "x".repeat(40);
});

test("refuses to work without a strong secret", () => {
  process.env.AUTH_SECRET = "short";
  assert.throws(() => createSessionToken("u"), /AUTH_SECRET/);
  assert.throws(() => verifySessionToken("a.b"), /AUTH_SECRET/);
  process.env.AUTH_SECRET = "x".repeat(40);
});
