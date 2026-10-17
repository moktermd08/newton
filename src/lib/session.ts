import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "newton_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

type Payload = { sub: string; exp: number };

/** AUTH_SECRET signs the session cookie. Missing or short means auth cannot work, so fail closed. */
function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters (run `npm run auth:setup`).");
  return s;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest();

export function createSessionToken(sub: string, now = Date.now()): string {
  const body = b64(JSON.stringify({ sub, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS } satisfies Payload));
  return `${body}.${b64(sign(body))}`;
}

/** Returns the payload for a valid, unexpired token; null for anything else (never throws on bad input). */
export function verifySessionToken(token: string | undefined | null, now = Date.now()): Payload | null {
  if (!token) return null;
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra !== undefined) return null;
  const expected = sign(body);
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    return typeof p.sub === "string" && typeof p.exp === "number" && p.exp * 1000 > now ? p : null;
  } catch {
    return null;
  }
}
