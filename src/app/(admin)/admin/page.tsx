import { PageHeader, Section, StatTile, Stats, Badge } from "@gg/ui";
import { requireSession } from "@/lib/auth";
import { listUsers } from "@/lib/users";

export default async function Dashboard() {
  const { user } = await requireSession();
  const users = user.role === "admin" ? await listUsers() : null;
  const active = users?.filter((u) => !u.disabled).length;
  return (
    <>
      <PageHeader icon="grid" title="Dashboard" subtitle="A quick look at how things are going." />
      <Stats>
        {users && <StatTile label="Users" value={String(users.length)} hint={`${active} active`} icon="users" href="/admin/users" />}
        <StatTile label="Active today" value="42" icon="heart" />
        <StatTile label="Open issues" value="3" icon="alert" tone="warn" />
      </Stats>
      <Section title="Recent activity" icon="clock">
        <p style={{ margin: 0 }}>
          <Badge tone="ok">ok</Badge> All systems running.
        </p>
      </Section>
    </>
  );
}
