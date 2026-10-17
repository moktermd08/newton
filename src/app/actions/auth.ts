"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext, startSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { SESSION_COOKIE } from "@/lib/session";
import { clearFailures, isLockedOut, recordFailure } from "@/lib/throttle";
import { getUserByEmail, hasUsers, recordLogin } from "@/lib/users";

export type LoginState = { error?: string; email?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (!email || !password) return { error: "Enter your email and password.", email };

  const h = await headers();
  const key = `login:${h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`;
  if (isLockedOut(key)) return { error: "Too many attempts. Try again in 15 minutes.", email };

  if (!(await hasUsers())) return { error: "Sign-in is not set up. Run `npm run auth:setup`.", email };

  // Always verify the password, even for an unknown or disabled account, so timing does not reveal which was wrong.
  const user = await getUserByEmail(email);
  const passwordOk = await verifyPassword(password, user && !user.disabled ? user.passwordHash : undefined);
  if (!passwordOk || !user) {
    recordFailure(key);
    return { error: "Incorrect email or password.", email };
  }

  clearFailures(key);
  await recordLogin(user.id);
  await startSession(user.id);
  redirect(next);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
