import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as users from "../src/lib/users.ts";

const fresh = (env: Record<string, string> = {}) => {
  const dir = mkdtempSync(path.join(tmpdir(), "newton-users-"));
  process.env.USERS_FILE = path.join(dir, "nested", "users.json");
  delete process.env.ADMIN_EMAIL; delete process.env.ADMIN_PASSWORD_HASH;
  Object.assign(process.env, env);
  return process.env.USERS_FILE;
};
const mk = (email: string, role = "member", name = "Test") => users.createUser({ name, email, role, passwordHash: "scrypt$a$b" });

test("an empty store has no users and bootstraps nothing without env", async () => {
  fresh();
  assert.equal(await users.hasUsers(), false);
  assert.deepEqual(await users.listUsers(), []);
});

test("the env admin becomes the first admin once, and only when the store is empty", async () => {
  const f = fresh({ ADMIN_EMAIL: "Boss@Example.com", ADMIN_PASSWORD_HASH: "scrypt$x$y" });
  const list = await users.listUsers();
  assert.equal(list.length, 1);
  assert.equal(list[0].email, "boss@example.com");
  assert.equal(list[0].role, "admin");
  await mk("two@example.com");
  delete process.env.ADMIN_EMAIL; // the file now exists, env is ignored
  assert.equal((await users.listUsers()).length, 2);
  assert.equal(statSync(f).mode & 0o777, 0o600, "file is owner-only");
});

test("creating validates input, lower-cases and rejects duplicate emails", async () => {
  fresh();
  const u = await mk("  Ada@Example.COM ", "admin", "Ada");
  assert.equal(u.email, "ada@example.com");
  assert.ok(!("passwordHash" in u), "public users never carry the hash");
  await assert.rejects(mk("ADA@example.com"), /already exists/);
  await assert.rejects(mk("not-an-email"), /valid email/);
  await assert.rejects(mk("a@b.co", "root"), /Role/);
  await assert.rejects(users.createUser({ name: " ", email: "a@b.co", role: "member", passwordHash: "x" }), /Name/);
});

test("the last active admin cannot be demoted, disabled or deleted", async () => {
  fresh();
  const admin = await mk("admin@example.com", "admin");
  const member = await mk("m@example.com");
  await assert.rejects(users.setRole(admin.id, "member"), /at least one active admin/);
  await assert.rejects(users.setDisabled(admin.id, true), /at least one active admin/);
  await assert.rejects(users.deleteUser(admin.id), /at least one active admin/);
  const second = await mk("admin2@example.com", "admin");
  await users.setRole(admin.id, "member");              // now allowed
  await assert.rejects(users.deleteUser(second.id), /at least one active admin/);
  await users.deleteUser(member.id);                    // members can always go
  assert.equal((await users.listUsers()).length, 2);
});

test("a disabled admin does not count as an active admin", async () => {
  fresh();
  const a = await mk("a@example.com", "admin");
  const b = await mk("b@example.com", "admin");
  await users.setDisabled(b.id, true);
  await assert.rejects(users.setDisabled(a.id, true), /at least one active admin/);
});

test("password hash updates and login recording persist", async () => {
  const f = fresh();
  const u = await mk("p@example.com");
  await users.setPasswordHash(u.id, "scrypt$new$hash");
  await users.recordLogin(u.id);
  const stored = await users.getUserByEmail("P@example.com");
  assert.equal(stored?.passwordHash, "scrypt$new$hash");
  assert.ok(stored?.lastLoginAt);
  assert.match(readFileSync(f, "utf8"), /"scrypt\$new\$hash"/);
  await assert.rejects(users.setPasswordHash("missing", "x"), /no longer exists/);
});

test("concurrent creates are serialised and none are lost", async () => {
  fresh();
  await Promise.all(Array.from({ length: 25 }, (_, i) => mk(`user${i}@example.com`)));
  const list = await users.listUsers();
  assert.equal(list.length, 25);
  assert.equal(new Set(list.map((u) => u.email)).size, 25);
});

test("two creates of the same email at once: exactly one wins", async () => {
  fresh();
  const results = await Promise.allSettled([mk("dup@example.com"), mk("dup@example.com"), mk("dup@example.com")]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await users.listUsers()).length, 1);
});

test("a corrupt file stops the app and is not overwritten", async () => {
  const f = fresh();
  await mk("keep@example.com");
  writeFileSync(f, "{ not json");
  await assert.rejects(users.listUsers());
  await assert.rejects(mk("x@example.com"));
  assert.equal(readFileSync(f, "utf8"), "{ not json");
});
