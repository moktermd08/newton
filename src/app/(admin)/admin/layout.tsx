import { Shell } from "@gg/ui";
import { AdminNav } from "@/components/admin-nav";
import { requireSession } from "@/lib/auth";
import { listUsers } from "@/lib/users";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const isAdmin = user.role === "admin";
  const userCount = isAdmin ? (await listUsers()).length : 0;
  return <Shell nav={<AdminNav email={user.email} isAdmin={isAdmin} userCount={userCount} />}>{children}</Shell>;
}
