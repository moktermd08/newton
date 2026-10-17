import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** The signed-in admin, or null. Reads the session cookie; safe to call from layouts, pages and route handlers. */
export async function getSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** Use at the top of anything that must be signed in. The proxy is the first gate; this is the second. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Only same-site paths, so `?next=` cannot send someone to another host. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/(?!\/|\\)/.test(next) && !next.includes("\r") && !next.includes("\n") ? next : "/admin";
}
