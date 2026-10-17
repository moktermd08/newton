"use client";
import { usePathname } from "next/navigation";
import { SideNav, type NavGroup } from "@gg/ui";
import { logout } from "@/app/actions/auth";

const GROUPS: NavGroup[] = [
  { label: "Work", items: [
    { href: "/admin", label: "Dashboard", icon: "grid" },
    { href: "/admin/lifecycle", label: "Lifecycle engine", icon: "layers" },
    { href: "/admin/users", label: "Users", icon: "users", count: 3 },
  ] },
  { label: "Site", items: [
    { href: "/", label: "View public site", icon: "home" },
  ] },
];

export function AdminNav({ email }: { email: string }) {
  const path = usePathname();
  return (
    <SideNav
      app={{ name: "Newton", tagline: "Admin", icon: "sparkles" }}
      path={path}
      groups={GROUPS}
      footer={
        <form action={logout} style={{ display: "grid", gap: 6 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={email}>{email}</span>
          <button type="submit" className="nav-link" style={{ textAlign: "left", cursor: "pointer" }}>Sign out</button>
        </form>
      }
    />
  );
}
