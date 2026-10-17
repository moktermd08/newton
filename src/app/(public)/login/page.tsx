import { redirect } from "next/navigation";
import { Card, CardHeader } from "@gg/ui";
import { LoginForm } from "@/components/login-form";
import { getSession, safeNext } from "@/lib/auth";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);
  return (
    <Card className="auth-card">
      <CardHeader title="Sign in" subtitle="Use your admin account." />
      <LoginForm next={next} />
    </Card>
  );
}
