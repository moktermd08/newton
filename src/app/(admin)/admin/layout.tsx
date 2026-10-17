import { Shell } from "@gg/ui";
import { AdminNav } from "@/components/admin-nav";
import { requireSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <Shell nav={<AdminNav email={session.sub} />}>{children}</Shell>;
}
