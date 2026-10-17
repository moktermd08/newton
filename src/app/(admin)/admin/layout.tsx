import { Shell } from "@gg/ui";
import { AdminNav } from "@/components/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Shell nav={<AdminNav />}>{children}</Shell>;
}
