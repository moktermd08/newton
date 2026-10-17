"use client";
import { usePathname } from "next/navigation";
import { SideNav, type NavGroup } from "@gg/ui";
import { logout } from "@/app/actions/auth";

const groups = (isAdmin: boolean, userCount: number): NavGroup[] => [
  { label: "Work", items: [
    { href: "/admin", label: "Dashboard", icon: "grid" },
    { href: "/admin/lifecycle", label: "Lifecycle engine", icon: "layers" },
    ...(isAdmin ? [{ href: "/admin/users", label: "Users", icon: "users" as const, count: userCount }] : []),
  ] },
  { label: "Site", items: [
    { href: "/", label: "View public site", icon: "home" },
  ] },
];

export function AdminNav({ email, isAdmin, userCount }: { email: string; isAdmin: boolean; userCount: number }) {
  const path = usePathname();
  return (
    <SideNav
      app={{ name: "Newton", tagline: "Admin", icon: "sparkles" }}
      path={path}
      groups={groups(isAdmin, userCount)}
      footer={
        <form action={logout} style={{ display: "grid", gap: 6 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={email}>{email}</span>
          <button type="submit" className="nav-link" style={{ textAlign: "left", cursor: "pointer" }}>Sign out</button>
        </form>
      }
    />
  );
}
