"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, LinkButton } from "@gg/ui";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Sign in" },
];

/** Public top bar: same mark, nav-link style and buttons as the admin side nav. */
export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="site-head">
      <div className="inner">
        <Link href="/" className="brand">
          <span className="logo"><Icon name="sparkles" size={16} /></span>
          Newton
        </Link>
        <nav>
          {LINKS.map((l) => {
            const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={`nav-link ${on ? "on" : ""}`} aria-current={on ? "page" : undefined}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <LinkButton href="/admin" variant="primary" size="sm">Admin</LinkButton>
      </div>
    </header>
  );
}
