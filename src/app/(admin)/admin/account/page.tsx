import { Badge, PageHeader, Section, When } from "@gg/ui";
import { ChangePasswordForm } from "@/components/change-password-form";
import { requireSession } from "@/lib/auth";

export default async function Account() {
  const { user } = await requireSession();
  return (
    <>
      <PageHeader icon="shield" title="Account" subtitle="Your sign-in details." />
      <Section title="Profile">
        <p style={{ margin: 0, display: "grid", gap: 4 }}>
          <span><strong>{user.name}</strong> <Badge tone={user.role === "admin" ? "ok" : "muted"}>{user.role}</Badge></span>
          <span>{user.email}</span>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            Last sign-in: {user.lastLoginAt ? <When at={user.lastLoginAt} /> : "Never"}
          </span>
        </p>
      </Section>
      <Section title="Change password" subtitle="Changing it signs you out on every other device.">
        <ChangePasswordForm />
      </Section>
    </>
  );
}
