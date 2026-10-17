import Link from 'next/link';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { BrandChip } from './brands';
import { Sparkline } from './charts';
import { tintedInk, tintedSurface } from './color';
import { Icon, type IconLike } from './icon';

/**
 * The GG page vocabulary. Every page is a PageHeader (icon, title, one plain
 * sentence on what the page is for), then Cards: a CardHeader and a body.
 * Headline numbers are StatTiles; empty cases are EmptyStates. None of these
 * hold state, so they render on the server and inside client components alike.
 */

/** Semantic tones. `good`/`bad` are accepted as older spellings of `ok`/`danger`. */
export type Tone = 'ok' | 'warn' | 'danger' | 'muted' | 'good' | 'bad';
const TONE: Record<Tone, 'ok' | 'warn' | 'danger' | 'muted'> = {
  ok: 'ok', good: 'ok', warn: 'warn', danger: 'danger', bad: 'danger', muted: 'muted',
};
const toneVar = (t: Tone) => `var(--${TONE[t]})`;

/** What a page is scoped to: one brand, every brand, or not brand-scoped at all (false). */
export interface Scope { slug: string; name: string }

export function PageHeader({ icon, title, subtitle, scope, action }: {
  icon?: IconLike; title: ReactNode; subtitle?: ReactNode; scope?: Scope | null | false; action?: ReactNode;
}) {
  return (
    <header className="page-head">
      {icon ? <div className="ph-icon"><Icon name={icon} size={20} /></div> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1>
          {title}
          {scope === false || scope === undefined ? null : scope
            ? <BrandChip slug={scope.slug} name={scope.name} />
            : <span className="chip chip-all"><Icon name="grid" size={12} />All brands</span>}
        </h1>
        {subtitle ? <p className="sub">{subtitle}</p> : null}
      </div>
      {action ? <div className="ph-right">{action}</div> : null}
    </header>
  );
}

/** A surface. `flush` drops the padding so a table can run edge to edge. */
export function Card({ children, className = '', flush, ...rest }: ComponentProps<'section'> & { flush?: boolean }) {
  return <section className={`section ${flush ? 'flush' : ''} ${className}`} {...rest}>{children}</section>;
}

export function CardHeader({ title, subtitle, icon, action }: {
  title: ReactNode; subtitle?: ReactNode; icon?: IconLike; action?: ReactNode;
}) {
  return (
    <>
      <div className="section-head">
        <h2>{icon ? <Icon name={icon} size={14} /> : null}{title}</h2>
        {action}
      </div>
      {subtitle ? <p className="section-sub">{subtitle}</p> : null}
    </>
  );
}

/** A Card with its header: the common case. */
export function Section({ title, icon, subtitle, action, children, className, flush }: {
  title: ReactNode; icon?: IconLike; subtitle?: ReactNode; action?: ReactNode; children: ReactNode;
  className?: string; flush?: boolean;
}) {
  return (
    <Card className={className} flush={flush}>
      <CardHeader title={title} icon={icon} subtitle={subtitle} action={action} />
      {children}
    </Card>
  );
}

/** A row of StatTiles. */
export function Stats({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="stats" style={style}>{children}</div>;
}

/**
 * A headline number: label, value, one line of context. `tone` colours the
 * value when the number itself is the warning; `color` (a brand or kind hex)
 * tints the icon and trend instead; `trend` adds a sparkline and `delta` the
 * change against the previous period.
 */
export function StatTile({ label, value, hint, icon, tone, color, href, trend, delta, children }: {
  label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: IconLike; tone?: Tone; color?: string; href?: string;
  trend?: number[]; delta?: { value: number; goodWhenUp?: boolean }; children?: ReactNode;
}) {
  const tint: CSSProperties | undefined = color && !tone
    ? { background: tintedSurface(color, 16), color: tintedInk(color, 80) } : undefined;
  const up = delta ? delta.value > 0 : false;
  const good = delta ? (delta.goodWhenUp ?? true) === up : false;
  const body = (
    <>
      <div className="stat-top">
        <div className="stat-k">{label}</div>
        {trend && trend.some((v) => v > 0) ? <Sparkline values={trend} className="stat-spark" color={color ? tintedInk(color, 85) : undefined} /> : null}
        {icon ? <span className={`stat-icon ${tone ? TONE[tone] : ''}`} style={tint}><Icon name={icon} size={15} /></span> : null}
      </div>
      <div className="stat-v" style={tone ? { color: toneVar(tone) } : undefined}>{value}</div>
      {hint || (delta && delta.value !== 0) ? (
        <div className="stat-n">
          {delta && delta.value !== 0 ? (
            <span className={good ? 'ok' : 'danger'} style={{ fontWeight: 600, marginRight: 6 }}>
              {up ? '↑' : '↓'} {Math.abs(delta.value)}%
            </span>
          ) : null}
          {hint}
        </div>
      ) : null}
      {children}
    </>
  );
  return href ? <Link href={href} className="stat link">{body}</Link> : <div className="stat">{body}</div>;
}

/**
 * A pill. Give it a `tone` for a status, or a `color` (a brand or kind hex)
 * that is blended toward the theme so the label stays readable.
 */
export function Badge({ children, tone, color, title, className = '' }: {
  children: ReactNode; tone?: Tone; color?: string; title?: string; className?: string;
}) {
  const style: CSSProperties | undefined = color
    ? { color: tintedInk(color), background: tintedSurface(color), borderColor: `color-mix(in oklab, ${color} 45%, transparent)` }
    : undefined;
  return <span className={`tag ${tone ? TONE[tone] : ''} ${className}`} style={style} title={title}>{children}</span>;
}

/** A soft tinted square holding an icon: the anchor for tiles, rows and headers. */
export function IconChip({ icon, color = 'var(--accent)', size = 'md' }: {
  icon: IconLike; color?: string; size?: 'sm' | 'md' | 'lg';
}) {
  const px = { sm: 15, md: 18, lg: 28 }[size];
  return (
    <span className={`icon-chip ${size}`} style={{ background: tintedSurface(color, 16), color: tintedInk(color, 80) }}>
      <Icon name={icon} size={px} />
    </span>
  );
}

/** `bare` drops the dashed frame, for an empty state already inside a card. */
export function EmptyState({ title, body, action, icon = 'inbox', children, bare }: {
  title?: ReactNode; body?: ReactNode; action?: ReactNode; icon?: IconLike; children?: ReactNode; bare?: boolean;
}) {
  return (
    <div className={`empty ${bare ? 'bare' : ''}`}>
      <Icon name={icon} size={26} style={{ opacity: 0.5, marginBottom: 6 }} />
      {title ? <div className="empty-title">{title}</div> : null}
      {body ? <div>{body}</div> : null}
      {children ? <div>{children}</div> : null}
      {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
    </div>
  );
}

export type ButtonVariant = 'primary' | 'subtle' | 'ghost' | 'danger';

export function buttonClass(variant: ButtonVariant = 'subtle', size: 'sm' | 'md' = 'md') {
  return `btn ${variant} ${size}`;
}

export function Button({ variant = 'subtle', size = 'md', className = '', ...rest }: ComponentProps<'button'> & {
  variant?: ButtonVariant; size?: 'sm' | 'md';
}) {
  return <button className={`${buttonClass(variant, size)} ${className}`} {...rest} />;
}

export function LinkButton({ href, variant = 'subtle', size = 'md', children, className = '' }: {
  href: string; variant?: ButtonVariant; size?: 'sm' | 'md'; children: ReactNode; className?: string;
}) {
  return <Link href={href} className={`${buttonClass(variant, size)} ${className}`}>{children}</Link>;
}

/** A labelled form control. */
export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

/** A labelled divider inside a long form or card. */
export function SectionTitle({ title, hint }: { title: ReactNode; hint?: ReactNode }) {
  return (
    <div className="section-title">
      <h3>{title}</h3>
      {hint ? <p>{hint}</p> : null}
    </div>
  );
}

/**
 * Underline tabs as links, so the chosen tab lives in the URL (`?v=`) and a
 * view can be shared or bookmarked.
 */
export function Tabs({ items }: {
  items: Array<{ href: string; label: ReactNode; on?: boolean; count?: number; icon?: IconLike }>;
}) {
  return (
    <nav className="tabs">
      {items.map((t) => (
        <Link key={t.href} href={t.href} className={`tab ${t.on ? 'on' : ''}`} aria-current={t.on ? 'page' : undefined}>
          {t.icon ? <Icon name={t.icon} size={14} /> : null}
          {t.label}
          {t.count != null ? <span className="pill">{t.count.toLocaleString('en-GB')}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** A full-width notice above the page: a safety stop, a kill switch, a degraded mode. */
export function Banner({ tone = 'muted', icon, children }: { tone?: Tone; icon?: IconLike; children: ReactNode }) {
  return (
    <div className={`banner ${TONE[tone]}-banner`}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </div>
  );
}
