/** Formatting shared by the GG apps: dates, money, rates. en-GB throughout. */

export function When({ at }: { at: string | Date | null | undefined }) {
  if (!at) return <span className="muted">—</span>;
  const d = new Date(at);
  return <span className="muted" title={d.toISOString()}>{relative(d)}</span>;
}

export function relative(d: Date): string {
  const secs = (Date.now() - d.getTime()) / 1000;
  // Due dates and next runs are in the future; "just now" for Friday is a lie.
  if (secs < -60) {
    const ahead = -secs;
    if (ahead < 3600) return `in ${Math.ceil(ahead / 60)}m`;
    if (ahead < 86400) return `in ${Math.round(ahead / 3600)}h`;
    if (ahead < 86400 * 14) return `in ${Math.round(ahead / 86400)}d`;
    return d.toISOString().slice(0, 10);
  }
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 86400 * 14) return `${Math.floor(secs / 86400)}d ago`;
  return d.toISOString().slice(0, 10);
}

/**
 * A date as YYYY-MM-DD in local time. Postgres dates arrive as Date objects,
 * and String(date) is "Mon Sep 14 …", so slicing it gives nonsense.
 */
export function day(d: string | Date | null | undefined): string {
  if (!d) return '—';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/** Money held in minor units (pence). */
export const money = (minor: number | string | null | undefined, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(minor ?? 0) / 100);

/** A 0–1 rate as a percentage. */
export const pct = (n: number | string | null | undefined, digits = 1) =>
  n == null ? '—' : `${(Number(n) * 100).toFixed(digits)}%`;

export const num = (v: number | string | null | undefined) => Number(v ?? 0).toLocaleString('en-GB');
