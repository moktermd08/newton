"use client";
import { usePathname } from "next/navigation";
import { SideNav, type NavGroup } from "@gg/ui";

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

export function AdminNav() {
  const path = usePathname();
  return (
    <SideNav
      app={{ name: "Newton", tagline: "Admin", icon: "sparkles" }}
      path={path}
      groups={GROUPS}
      footer="Signed in as admin"
    />
  );
}
