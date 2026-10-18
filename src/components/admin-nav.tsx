"use client";
import { usePathname } from "next/navigation";
import { SideNav, type NavGroup, type NavItem } from "@gg/ui";
import { logout } from "@/app/actions/auth";

const groups = (isAdmin: boolean, userCount: number, lab: NavItem[]): NavGroup[] => [
  { label: "Work", items: [
    { href: "/admin", label: "Dashboard", icon: "grid" },
    { href: "/admin/lifecycle", label: "Lifecycle engine", icon: "layers" },
    ...(isAdmin ? [{ href: "/admin/users", label: "Users", icon: "users" as const, count: userCount }] : []),
  ] },
  { label: "Lab", items: [{ href: "/admin/lab", label: "Overview", icon: "flask" }, ...lab] },
  { label: "Site", items: [
    { href: "/admin/account", label: "Account", icon: "shield" },
    { href: "/", label: "View public site", icon: "home" },
  ] },
];

export function AdminNav({ email, isAdmin, userCount, lab }: { email: string; isAdmin: boolean; userCount: number; lab: NavItem[] }) {
  const path = usePathname();
  return (
    <SideNav
      app={{ name: "Newton", tagline: "Admin", icon: "sparkles" }}
      path={path}
      groups={groups(isAdmin, userCount, lab)}
      footer={
        <form action={logout} style={{ display: "grid", gap: 6 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={email}>{email}</span>
          <button type="submit" className="nav-link" style={{ textAlign: "left", cursor: "pointer" }}>Sign out</button>
        </form>
      }
    />
  );
}
