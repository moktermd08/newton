"use client";
import { useActionState, useRef } from "react";
import { Badge, Banner, Button, Field } from "@gg/ui";
import { addUser, manageUser } from "@/app/actions/users";

type Row = { id: string; name: string; email: string; role: "admin" | "member"; disabled: boolean };

export function AddUserForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof addUser>>, fd: FormData) => {
    const res = await addUser(prev, fd);
    if (res?.ok) ref.current?.reset();
    return res;
  }, undefined);
  return (
    <form ref={ref} action={action} style={{ display: "grid", gap: 12 }}>
      {state?.error && <Banner tone="danger" icon="alert">{state.error}</Banner>}
      {state?.ok && <Banner tone="ok" icon="check">{state.ok}</Banner>}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <Field label="Name"><input type="text" name="name" required maxLength={80} autoComplete="off" /></Field>
        <Field label="Email"><input type="email" name="email" required autoComplete="off" /></Field>
        <Field label="Role">
          <select name="role" defaultValue="member"><option value="member">Member</option><option value="admin">Admin</option></select>
        </Field>
        <Field label="Initial password" hint="At least 12 characters. Share it securely.">
          <input type="password" name="password" required minLength={12} maxLength={128} autoComplete="new-password" />
        </Field>
      </div>
      <div><Button variant="primary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add user"}</Button></div>
    </form>
  );
}

export function UserActions({ user, isSelf }: { user: Row; isSelf: boolean }) {
  const [state, action, pending] = useActionState(manageUser, undefined);
  const confirmFirst = (message: string) => (e: React.MouseEvent) => { if (!confirm(message)) e.preventDefault(); };
  return (
    <form action={action} style={{ display: "grid", gap: 6 }}>
      <input type="hidden" name="id" value={user.id} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Button size="sm" name="intent" value={user.role === "admin" ? "make-member" : "make-admin"} disabled={pending}>
          {user.role === "admin" ? "Make member" : "Make admin"}
        </Button>
        {!isSelf && (
          <Button size="sm" name="intent" value={user.disabled ? "enable" : "disable"} disabled={pending}>
            {user.disabled ? "Enable" : "Disable"}
          </Button>
        )}
        {!isSelf && (
          <Button size="sm" variant="danger" name="intent" value="delete" disabled={pending}
            onClick={confirmFirst(`Delete ${user.email}? This cannot be undone.`)}>Delete</Button>
        )}
      </div>
      <details>
        <summary style={{ cursor: "pointer", fontSize: 12 }}>Reset password</summary>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input type="password" name="password" minLength={12} maxLength={128} placeholder="New password" autoComplete="new-password" />
          <Button size="sm" name="intent" value="reset" disabled={pending}>Set</Button>
        </div>
      </details>
      {state?.error && <Badge tone="danger">{state.error}</Badge>}
      {state?.ok && <Badge tone="ok">{state.ok}</Badge>}
    </form>
  );
}
