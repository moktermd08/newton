import { Shell } from "@gg/ui";
import { AdminNav } from "@/components/admin-nav";
import { requireSession } from "@/lib/auth";
import { listCollections, listRecords } from "@/lib/lab";
import { listUsers } from "@/lib/users";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const isAdmin = user.role === "admin";
  const userCount = isAdmin ? (await listUsers()).length : 0;
  const defs = await listCollections();
  const dataRecords = await listRecords("data");
  const categoryIcons: Record<string, string> = { People: "users", Product: "grid", Service: "link", Company: "briefcase" };
  const categories = (defs.find((d) => d.id === "data")?.fields.find((f) => f.key === "category")?.options ?? []).map((o) => ({
    href: `/admin/lab/data-category/${o.toLowerCase()}`, label: o, icon: categoryIcons[o] ?? "database",
    count: dataRecords.filter((r) => r.category === o).length,
  }));
  const lab = defs.flatMap((d) => [{ href: `/admin/lab/${d.id}`, label: d.label, icon: d.icon }, ...(d.id === "data" ? categories : [])]);
  return <Shell nav={<AdminNav email={user.email} isAdmin={isAdmin} userCount={userCount} lab={lab} />}>{children}</Shell>;
}
