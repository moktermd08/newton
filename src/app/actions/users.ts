"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { UserError, createUser, deleteUser, setDisabled, setPasswordHash, setRole } from "@/lib/users";

export type UserFormState = { error?: string; ok?: string } | undefined;

const MIN_PASSWORD = 12;
const MAX_PASSWORD = 128;

function checkPassword(pw: string) {
  if (pw.length < MIN_PASSWORD) throw new UserError(`Password must be at least ${MIN_PASSWORD} characters.`);
  if (pw.length > MAX_PASSWORD) throw new UserError(`Password must be at most ${MAX_PASSWORD} characters.`);
}

/** Turns a UserError into a message for the form; anything else is a real fault and propagates. */
async function guarded(run: () => Promise<string>): Promise<UserFormState> {
  try {
    const ok = await run();
    revalidatePath("/admin", "layout");
    return { ok };
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
}

// Every action re-checks admin: the page being hidden from members is not a security boundary.

export async function addUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin();
  return guarded(async () => {
    const password = String(formData.get("password") ?? "");
    checkPassword(password);
    const user = await createUser({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "member"),
      passwordHash: await hashPassword(password),
    });
    return `Added ${user.email}.`;
  });
}

/** One action for the per-row buttons; `intent` says which. */
export async function manageUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const isSelf = id === session.user.id;

  return guarded(async () => {
    switch (intent) {
      case "make-admin": await setRole(id, "admin"); return "Role updated.";
      case "make-member": await setRole(id, "member"); return "Role updated.";
      case "disable":
        if (isSelf) throw new UserError("You cannot disable your own account.");
        await setDisabled(id, true); return "Account disabled.";
      case "enable": await setDisabled(id, false); return "Account enabled.";
      case "reset": {
        const password = String(formData.get("password") ?? "");
        checkPassword(password);
        await setPasswordHash(id, await hashPassword(password));
        return "Password reset.";
      }
      case "delete":
        if (isSelf) throw new UserError("You cannot delete your own account. Ask another admin.");
        await deleteUser(id); return "Account deleted.";
      default: throw new UserError("Unknown action.");
    }
  });
}
