import { Shell } from "@gg/ui";
import { AdminNav } from "@/components/admin-nav";
import { requireSession } from "@/lib/auth";
import { listCollections } from "@/lib/lab";
import { listUsers } from "@/lib/users";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const isAdmin = user.role === "admin";
  const userCount = isAdmin ? (await listUsers()).length : 0;
  const lab = (await listCollections()).map((d) => ({ href: `/admin/lab/${d.id}`, label: d.label, icon: d.icon }));
  return <Shell nav={<AdminNav email={user.email} isAdmin={isAdmin} userCount={userCount} lab={lab} />}>{children}</Shell>;
}
