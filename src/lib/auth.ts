import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";
import { getUserById, type PublicUser } from "./users";

/**
 * The signed-in user, or null. The cookie only proves who signed in; the account is looked up every time,
 * so disabling or deleting a user ends their session on the next request.
 */
export async function getSession(): Promise<{ sub: string; user: PublicUser } | null> {
  const jar = await cookies();
  const payload = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const stored = await getUserById(payload.sub);
  if (!stored || stored.disabled) return null;
  const { passwordHash: _hash, ...user } = stored;
  return { sub: user.id, user };
}

/** Use at the top of anything that must be signed in. The proxy is the first gate; this is the second. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** For pages and actions that manage accounts. Members are sent back to the dashboard. */
export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/admin");
  return session;
}

/** Only same-site paths, so `?next=` cannot send someone to another host. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/(?!\/|\\)/.test(next) && !next.includes("\r") && !next.includes("\n") ? next : "/admin";
}
