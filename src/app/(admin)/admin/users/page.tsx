import { Badge, Button, EmptyState, PageHeader, Section } from "@gg/ui";

const USERS = [
  { name: "Ada Lovelace", email: "ada@example.com", role: "Admin" },
  { name: "Alan Turing", email: "alan@example.com", role: "Editor" },
  { name: "Grace Hopper", email: "grace@example.com", role: "Viewer" },
];

export default function Users() {
  return (
    <>
      <PageHeader icon="users" title="Users" subtitle="People who can sign in." action={<Button variant="primary">Invite user</Button>} />
      <Section title="All users" flush>
        {USERS.length === 0 ? <EmptyState title="No users yet" /> : (
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.email}><td>{u.name}</td><td>{u.email}</td><td><Badge>{u.role}</Badge></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </>
  );
}
