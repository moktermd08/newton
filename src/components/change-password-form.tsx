"use client";
import { useActionState, useRef } from "react";
import { Banner, Button, Field } from "@gg/ui";
import { changePassword, type AccountState } from "@/app/actions/account";

export function ChangePasswordForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: AccountState, fd: FormData) => {
    const res = await changePassword(prev, fd);
    if (res?.ok) ref.current?.reset();
    return res;
  }, undefined);
  return (
    <form ref={ref} action={action} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
      {state?.error && <Banner tone="danger" icon="alert">{state.error}</Banner>}
      {state?.ok && <Banner tone="ok" icon="check">{state.ok}</Banner>}
      <Field label="Current password">
        <input type="password" name="current" required autoComplete="current-password" maxLength={128} />
      </Field>
      <Field label="New password" hint="At least 12 characters.">
        <input type="password" name="next" required minLength={12} maxLength={128} autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password">
        <input type="password" name="confirm" required minLength={12} maxLength={128} autoComplete="new-password" />
      </Field>
      <div><Button variant="primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Change password"}</Button></div>
    </form>
  );
}
