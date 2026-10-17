import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const KEYLEN = 64;

/** Format: scrypt$<salt base64url>$<hash base64url>. Produced by scripts/auth-setup.mjs. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEYLEN);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

// A fixed hash to compare against when the email is wrong, so a wrong email and a wrong password take the same time.
const DUMMY = "scrypt$AAAAAAAAAAAAAAAAAAAAAA$" + Buffer.alloc(KEYLEN).toString("base64url");

export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  const [scheme, saltB64, hashB64] = (stored || DUMMY).split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64url"), expected.length);
  return stored !== undefined && actual.length === expected.length && timingSafeEqual(actual, expected);
}
