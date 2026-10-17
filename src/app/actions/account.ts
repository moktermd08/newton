"use server";
import { requireSession, startSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clearFailures, isLockedOut, recordFailure } from "@/lib/throttle";
import { getUserById, setPasswordHash } from "@/lib/users";

export type AccountState = { error?: string; ok?: string } | undefined;

const MIN_PASSWORD = 12;
const MAX_PASSWORD = 128;

export async function changePassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const session = await requireSession();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current || !next) return { error: "Fill in every field." };
  if (next.length < MIN_PASSWORD) return { error: `New password must be at least ${MIN_PASSWORD} characters.` };
  if (next.length > MAX_PASSWORD) return { error: `New password must be at most ${MAX_PASSWORD} characters.` };
  if (next !== confirm) return { error: "The new passwords do not match." };
  if (next === current) return { error: "Choose a password different from the current one." };

  // Guessing the current password through this form is the main abuse of a stolen session, so throttle it per account.
  const key = `change:${session.user.id}`;
  if (isLockedOut(key)) return { error: "Too many attempts. Try again in 15 minutes." };

  const stored = await getUserById(session.user.id);
  if (!stored || !(await verifyPassword(current, stored.passwordHash))) {
    recordFailure(key);
    return { error: "Your current password is incorrect." };
  }

  clearFailures(key);
  await setPasswordHash(stored.id, await hashPassword(next)); // voids every existing session for this account
  await startSession(stored.id);                              // ...and keeps this one
  return { ok: "Password changed. Any other devices have been signed out." };
}
