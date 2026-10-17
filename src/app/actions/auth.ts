"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "@/lib/session";

export type LoginState = { error?: string; email?: string } | undefined;

// In-memory throttle: 5 failures per IP in 15 minutes. Per server process, so it resets on restart and
// does not span instances; put a shared store behind it before running more than one.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map<string, number[]>();

function recent(key: string, now: number) {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key, list);
  return list;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (!email || !password) return { error: "Enter your email and password.", email };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  if (recent(ip, now).length >= MAX_FAILURES) return { error: "Too many attempts. Try again in 15 minutes.", email };

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !hash) return { error: "Sign-in is not set up. Run `npm run auth:setup`.", email };

  // Always verify the password, even for a wrong email, so timing does not reveal which was wrong.
  const passwordOk = await verifyPassword(password, email === adminEmail ? hash : undefined);
  if (!passwordOk) {
    failures.set(ip, [...recent(ip, now), now]);
    return { error: "Incorrect email or password.", email };
  }

  failures.delete(ip);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(adminEmail), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect(next);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
