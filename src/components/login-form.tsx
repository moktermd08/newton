"use client";
import { useActionState } from "react";
import { Banner, Button, Field } from "@gg/ui";
import { login } from "@/app/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="next" value={next} />
      {state?.error && <Banner tone="danger" icon="alert">{state.error}</Banner>}
      <Field label="Email"><input type="email" name="email" autoComplete="email" required autoFocus defaultValue={state?.email} /></Field>
      <Field label="Password"><input type="password" name="password" autoComplete="current-password" required /></Field>
      <Button variant="primary" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
