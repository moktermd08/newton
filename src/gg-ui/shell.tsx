import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconLike } from './icon';

/**
 * The GG app frame: a sticky side nav on the left, the page on the right.
 * Every GG app has the same parts in the same order — the app's mark, the
 * brand switcher, grouped links with counts, and a footer for who is signed
 * in — so someone who knows one app can find their way round the next.
 */

export interface NavItem { href: string; label: string; icon: IconLike; count?: number }
export interface NavGroup { label: string; items: NavItem[] }

export function Shell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="shell">
      {nav}
      <main>{children}</main>
    </div>
  );
}

/**
 * `path` is the current pathname: pass `usePathname()` from a client
 * component. A count above `hotAt` is shown as needing attention.
 */
export function SideNav({ app, path, groups, hotAt = 50, top, footer }: {
  app: { name: string; tagline?: string; icon: IconLike };
  path: string;
  groups: NavGroup[];
  hotAt?: number;
  /** Rendered between the app's mark and the links: the brand switcher. */
  top?: ReactNode;
  footer?: ReactNode;
}) {
  // The most specific link wins: on /cadence/plan, "Goals" (/cadence/plan) is
  // current, not "Activities" (/cadence) as well.
  const matches = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));
  const current = groups.flatMap((g) => g.items).filter((i) => matches(i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="side">
      <div className="brand">
        <span className="logo"><Icon name={app.icon} size={16} /></span>
        <div>
          {app.name}
          {app.tagline ? <small>{app.tagline}</small> : null}
        </div>
      </div>
      {top}
      {groups.map((g) => (
        <div key={g.label}>
          <div className="group">{g.label}</div>
          {g.items.map((item) => {
            const on = item.href === current;
            return (
              <Link key={item.href} href={item.href} className={`nav-link ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined}>
                <Icon name={item.icon} size={16} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count ? <span className={item.count > hotAt ? 'pill hot' : 'pill'}>{item.count.toLocaleString('en-GB')}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
      {footer ? <div className="side-foot">{footer}</div> : null}
    </nav>
  );
}

/**
 * One row of a brand switcher, as a submit button so the switcher works as a
 * plain form posting to a server action. `on` marks the current scope.
 */
export function ScopeItem({ on, mark, label, count, value, field = 'brand', title }: {
  on: boolean; mark: ReactNode; label: string; count?: number; value: string; field?: string; title?: string;
}) {
  return (
    <button type="submit" name={field} value={value} title={title} className={`scope-item ${on ? 'on' : ''}`}>
      {mark}
      <span className="scope-name">{label}</span>
      {count != null ? <span className="count">{count.toLocaleString('en-GB')}</span> : null}
    </button>
  );
}
