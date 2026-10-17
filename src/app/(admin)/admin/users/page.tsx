import { Badge, PageHeader, Section, When } from "@gg/ui";
import { AddUserForm, UserActions } from "@/components/users-manager";
import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/users";

export default async function Users() {
  const session = await requireAdmin();
  const users = await listUsers();
  return (
    <>
      <PageHeader icon="users" title="Users" subtitle="Accounts that can sign in. Admins manage accounts; members use the engine." />
      <Section title="Add a user">
        <AddUserForm />
      </Section>
      <Section title={`All users (${users.length})`} flush>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Manage</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}{u.id === session.user.id && <> <Badge tone="muted">you</Badge></>}</td>
                <td>{u.email}</td>
                <td><Badge tone={u.role === "admin" ? "ok" : "muted"}>{u.role}</Badge></td>
                <td>{u.disabled ? <Badge tone="warn">disabled</Badge> : <Badge tone="ok">active</Badge>}</td>
                <td>{u.lastLoginAt ? <When at={u.lastLoginAt} /> : "Never"}</td>
                <td><UserActions user={u} isSelf={u.id === session.user.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}
