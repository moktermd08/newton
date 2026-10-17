import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/password.ts";

test("a password verifies against its own hash and not another", async () => {
  const h = await hashPassword("correct horse battery");
  assert.match(h, /^scrypt\$[\w-]+\$[\w-]+$/);
  assert.equal(await verifyPassword("correct horse battery", h), true);
  assert.equal(await verifyPassword("wrong horse battery", h), false);
  assert.equal(await verifyPassword("", h), false);
});

test("the same password hashes differently each time (random salt)", async () => {
  assert.notEqual(await hashPassword("same-password-1"), await hashPassword("same-password-1"));
});

test("no stored hash never verifies, even for a matching-looking input", async () => {
  assert.equal(await verifyPassword("anything", undefined), false);
  assert.equal(await verifyPassword("", undefined), false);
});

test("malformed stored hashes are rejected, not thrown", async () => {
  assert.equal(await verifyPassword("x", "garbage"), false);
  assert.equal(await verifyPassword("x", "bcrypt$a$b"), false);
  assert.equal(await verifyPassword("x", "scrypt$$"), false);
});
