import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Account store: one JSON file, written atomically (temp file + rename) and serialised through an
 * in-process lock. Good for one server process on a writable disk; it does not protect two processes
 * writing at once. Swap this module for a database when that matters; callers only use the exports.
 * Passwords arrive already hashed (see ./password), so this file has no other imports.
 */

export type Role = "admin" | "member";
export const ROLES: Role[] = ["admin", "member"];

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  disabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  /** Sessions issued before this time are void. Set whenever the password changes. Absent = never changed. */
  sessionsValidFrom?: string;
};
export type PublicUser = Omit<StoredUser, "passwordHash">;

/** A problem the caller can show to the person who caused it. Anything else is a bug and should throw. */
export class UserError extends Error {}

const file = () => process.env.USERS_FILE || path.join(process.cwd(), "data", "users.json");

// One lock per process, shared across Next's separate server bundles via globalThis.
const g = globalThis as unknown as { __newtonUsersLock?: Promise<unknown> };
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = (g.__newtonUsersLock ?? Promise.resolve()).then(fn, fn);
  g.__newtonUsersLock = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<StoredUser[]> {
  let raw: string;
  try {
    raw = await fs.readFile(file(), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return bootstrap();
  }
  // A corrupt file must stop the app, not be overwritten with an empty list.
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.users)) throw new Error(`${file()} is not a valid users file`);
  return parsed.users as StoredUser[];
}

async function writeAll(users: StoredUser[]) {
  const dest = file();
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ users }, null, 2) + "\n", { mode: 0o600 });
  await fs.rename(tmp, dest);
}

/** First run only: the ADMIN_EMAIL / ADMIN_PASSWORD_HASH pair from `npm run auth:setup` becomes the first admin. */
async function bootstrap(): Promise<StoredUser[]> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!email || !passwordHash) return [];
  const first: StoredUser = {
    id: randomUUID(), name: "Admin", email, role: "admin", passwordHash,
    disabled: false, createdAt: new Date().toISOString(), lastLoginAt: null,
  };
  await writeAll([first]);
  return [first];
}

const strip = ({ passwordHash: _hash, ...rest }: StoredUser): PublicUser => rest;
const normEmail = (e: string) => e.trim().toLowerCase();

function validateProfile(name: string, email: string, role: string) {
  if (!name.trim() || name.trim().length > 80) throw new UserError("Name must be 1 to 80 characters.");
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new UserError("Enter a valid email address.");
  if (!ROLES.includes(role as Role)) throw new UserError("Role must be admin or member.");
}

/** Refuse any change that would leave no active admin. */
function assertAnotherAdmin(users: StoredUser[], target: StoredUser) {
  if (target.role === "admin" && !target.disabled && !users.some((u) => u.id !== target.id && u.role === "admin" && !u.disabled))
    throw new UserError("There must always be at least one active admin.");
}

export const listUsers = () => withLock(async () => (await readAll()).map(strip).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
export const hasUsers = () => withLock(async () => (await readAll()).length > 0);
export const getUserById = (id: string) => withLock(async () => (await readAll()).find((u) => u.id === id));
export const getUserByEmail = (email: string) => withLock(async () => (await readAll()).find((u) => u.email === normEmail(email)));

export const createUser = (input: { name: string; email: string; role: string; passwordHash: string }) =>
  withLock(async () => {
    const email = normEmail(input.email);
    validateProfile(input.name, email, input.role);
    const users = await readAll();
    if (users.some((u) => u.email === email)) throw new UserError("A user with that email already exists.");
    const user: StoredUser = {
      id: randomUUID(), name: input.name.trim(), email, role: input.role as Role, passwordHash: input.passwordHash,
      disabled: false, createdAt: new Date().toISOString(), lastLoginAt: null,
    };
    await writeAll([...users, user]);
    return strip(user);
  });

async function mutate(id: string, change: (u: StoredUser, all: StoredUser[]) => StoredUser | null) {
  return withLock(async () => {
    const users = await readAll();
    const target = users.find((u) => u.id === id);
    if (!target) throw new UserError("That user no longer exists.");
    const next = change(target, users);
    await writeAll(next ? users.map((u) => (u.id === id ? next : u)) : users.filter((u) => u.id !== id));
  });
}

export const setRole = (id: string, role: string) =>
  mutate(id, (u, all) => {
    if (!ROLES.includes(role as Role)) throw new UserError("Role must be admin or member.");
    if (role !== "admin") assertAnotherAdmin(all, u);
    return { ...u, role: role as Role };
  });

export const setDisabled = (id: string, disabled: boolean) =>
  mutate(id, (u, all) => {
    if (disabled) assertAnotherAdmin(all, u);
    return { ...u, disabled };
  });

/** Changing a password also voids every existing session for that account. */
export const setPasswordHash = (id: string, passwordHash: string) =>
  mutate(id, (u) => ({ ...u, passwordHash, sessionsValidFrom: new Date().toISOString() }));

export const deleteUser = (id: string) =>
  mutate(id, (u, all) => {
    assertAnotherAdmin(all, u);
    return null;
  });

export const recordLogin = (id: string) => mutate(id, (u) => ({ ...u, lastLoginAt: new Date().toISOString() })).catch(() => undefined);
