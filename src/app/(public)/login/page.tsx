import { Button, Card, CardHeader, Field } from "@gg/ui";

export default function Login() {
  return (
    <Card className="auth-card">
      <CardHeader title="Sign in" subtitle="Use your admin account." />
      <form className="grid gap-3">
        <Field label="Email"><input type="email" name="email" autoComplete="email" /></Field>
        <Field label="Password"><input type="password" name="password" autoComplete="current-password" /></Field>
        <Button variant="primary" type="submit">Sign in</Button>
      </form>
    </Card>
  );
}
