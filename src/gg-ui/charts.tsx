import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { brandVars } from './brands';

/**
 * Charts, rendered on the server as plain HTML and SVG: no chart library, no
 * client JavaScript. Hover detail comes from native titles plus a CSS
 * highlight. Every coloured mark sits beside a text label, so no chart relies
 * on colour alone.
 */

const n = (v: unknown) => Number(v ?? 0) || 0;
const fmt = (v: number) => v.toLocaleString('en-GB');

/** `brand` tints the bar with that brand's colour (and is the default colour when set). */
export interface Datum { label: ReactNode; value: number; color?: string; href?: string; hint?: string; display?: ReactNode; key?: string; brand?: string }

const tint = (slug?: string): CSSProperties | undefined => (slug ? brandVars(slug) : undefined);

/** Horizontal bars with the label and value written out — the workhorse. */
export function BarList({ items, max, empty = 'No data yet' }: { items: Datum[]; max?: number; empty?: string }) {
  const top = max ?? Math.max(1, ...items.map((i) => n(i.value)));
  if (!items.length) return <div className="chart-empty">{empty}</div>;
  return (
    <div className="barlist">
      {items.map((i, idx) => {
        const w = Math.max(n(i.value) > 0 ? 1.5 : 0, (n(i.value) / top) * 100);
        const row = (
          <>
            <div className="bl-label">{i.label}</div>
            <div className="bl-track">
              <span style={{ width: `${w}%`, background: i.color ?? (i.brand ? 'var(--bc)' : 'var(--series)') }} />
            </div>
            <div className="bl-value">{i.display ?? fmt(n(i.value))}</div>
          </>
        );
        const title = i.hint ?? `${typeof i.label === 'string' ? i.label : ''}: ${fmt(n(i.value))}`;
        return i.href
          ? <Link key={i.key ?? idx} href={i.href} className="bl-row" title={title} style={tint(i.brand)}>{row}</Link>
          : <div key={i.key ?? idx} className="bl-row" title={title} style={tint(i.brand)}>{row}</div>;
      })}
    </div>
  );
}

/**
 * The funnel, rung by rung, with the conversion between rungs written between
 * them — the rate is the point, the bar only shows where the loss is.
 */
export function Funnel({ steps }: { steps: Array<{ label: string; value: number }> }) {
  const top = Math.max(1, n(steps[0]?.value));
  // Ordinal blue ramp, darkest at the bottom of the funnel (steps 250 → 600).
  const ramp = ['var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)'];
  return (
    <div className="funnel">
      {steps.map((s, i) => {
        const prev = i > 0 ? n(steps[i - 1]!.value) : null;
        const rate = prev ? n(s.value) / prev : null;
        return (
          <div key={s.label}>
            {i > 0 ? (
              <div className="fn-rate" title={rate != null && rate > 1
                ? 'More at this rung than the one above: some leads skipped a recorded step'
                : `${steps[i - 1]!.label} → ${s.label}`}>
                ↓ {rate == null || rate > 1 ? '—' : `${(rate * 100).toFixed(rate < 0.1 && rate > 0 ? 1 : 0)}%`}
              </div>
            ) : null}
            <div className="fn-row" title={`${s.label}: ${fmt(n(s.value))}`}>
              <div className="fn-label">{s.label}</div>
              <div className="fn-track">
                <span style={{ width: `${Math.max(n(s.value) > 0 ? 1 : 0, (n(s.value) / top) * 100)}%`, background: ramp[Math.min(i, ramp.length - 1)] }} />
              </div>
              <div className="fn-value">{fmt(n(s.value))}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A ring for part-of-whole with a handful of parts, legend always written out. */
export function Donut({ segments, center, sub, size = 140 }: {
  segments: Array<{ label: string; value: number; color: string }>; center?: ReactNode; sub?: ReactNode; size?: number;
}) {
  const total = segments.reduce((a, s) => a + n(s.value), 0);
  const r = 42, c = 2 * Math.PI * r, gap = segments.filter((s) => n(s.value) > 0).length > 1 ? 1.2 : 0;
  let offset = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="breakdown">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--track)" strokeWidth="11" />
        {total > 0 && segments.map((s) => {
          const len = (n(s.value) / total) * c;
          if (len <= 0) return null;
          const el = (
            <circle key={s.label} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="11"
                    strokeDasharray={`${Math.max(0.5, len - gap)} ${c}`} strokeDashoffset={-offset}
                    transform="rotate(-90 50 50)" className="donut-seg">
              <title>{`${s.label}: ${fmt(n(s.value))} (${((n(s.value) / total) * 100).toFixed(0)}%)`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="donut-center">
          {center ?? fmt(total)}
        </text>
      </svg>
      <div className="legend legend-col">
        {segments.map((s) => (
          <div key={s.label} className="lg-item">
            <span className="lg-swatch" style={{ background: s.color }} />
            <span className="lg-label">{s.label}</span>
            <span className="lg-value">{fmt(n(s.value))}</span>
          </div>
        ))}
        {sub ? <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{sub}</div> : null}
      </div>
    </div>
  );
}

/** One thin 100% bar, split with 2px gaps. */
export function StackBar({ segments, height = 8, legend = false }: {
  segments: Array<{ label: string; value: number; color: string }>; height?: number; legend?: boolean;
}) {
  const total = segments.reduce((a, s) => a + n(s.value), 0);
  return (
    <>
      <div className="stackbar" style={{ height }}>
        {total === 0 ? <span style={{ flex: 1, background: 'var(--track)' }} /> : segments.filter((s) => n(s.value) > 0).map((s) => (
          <span key={s.label} style={{ flex: n(s.value), background: s.color }}
                title={`${s.label}: ${fmt(n(s.value))} (${((n(s.value) / total) * 100).toFixed(0)}%)`} />
        ))}
      </div>
      {legend ? <Legend items={segments.map((s) => ({ label: `${s.label} ${fmt(n(s.value))}`, color: s.color }))} /> : null}
    </>
  );
}

export function Legend({ items }: { items: Array<{ label: ReactNode; color: string }> }) {
  return (
    <div className="legend">
      {items.map((i, idx) => (
        <span key={idx} className="lg-item"><span className="lg-swatch" style={{ background: i.color }} />{i.label}</span>
      ))}
    </div>
  );
}

/** Progress ring for a single rate against a whole. */
export function Ring({ value, size = 44, color = 'var(--series)', label }: { value: number; size?: number; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(1, n(value)));
  const r = 16, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--track)" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${v * c} ${c}`} transform="rotate(-90 20 20)" />
      <text x="20" y="20" textAnchor="middle" dominantBaseline="central" className="ring-text">
        {Math.round(v * 100)}%
      </text>
    </svg>
  );
}

/** Y ticks for a count or a rate: 0, the middle only when it lands on a whole count, and the top. */
function ticks(maxY: number, integer: boolean): number[] {
  const mid = maxY / 2;
  return integer && !Number.isInteger(mid) ? [0, maxY] : [0, mid, maxY];
}

/** Shared frame: y ticks on the left, gridlines behind, x labels underneath — all HTML, so text never scales. */
function Frame({ maxY, integer, format, height, labels, children }: {
  maxY: number; integer: boolean; format: (v: number) => string; height: number; labels: string[]; children: ReactNode;
}) {
  const every = Math.ceil(labels.length / 7);
  return (
    <div className="tchart">
      <div className="tc-plot" style={{ height }}>
        {ticks(maxY, integer).map((t) => (
          <div key={t} className={`tc-grid ${t === 0 ? 'base' : ''}`} style={{ bottom: `${(t / maxY) * 100}%` }}>
            <span>{format(t)}</span>
          </div>
        ))}
        {children}
      </div>
      <div className="tc-x">
        {labels.map((l, i) => (
          <span key={i}>{i % every === 0 || i === labels.length - 1 ? l : ''}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Change over time: a 2px line with markers, recessive grid, and the latest
 * value labelled directly. Hover a marker for its value.
 */
export function LineChart({ points, format = (v) => fmt(v), height = 160, color = 'var(--series)', integer = false }: {
  points: Array<{ x: string; y: number }>; format?: (v: number) => string; height?: number; color?: string; integer?: boolean;
}) {
  if (points.length === 0) return <div className="chart-empty">No data yet</div>;
  const maxY = niceMax(Math.max(...points.map((p) => n(p.y))), integer);
  // Slot centres, so each marker sits over its x label.
  const x = (i: number) => ((i + 0.5) / points.length) * 100;
  const y = (v: number) => 100 - (v / maxY) * 100;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(n(p.y)).toFixed(2)}`).join(' ');
  const last = points[points.length - 1]!;
  return (
    <Frame maxY={maxY} integer={integer} format={format} height={height} labels={points.map((p) => p.x)}>
      <div className="tc-area tc-line">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        {points.map((p, i) => (
          <span key={i} className="tc-dot" style={{ left: `${x(i)}%`, top: `${y(n(p.y))}%`, background: color }}
                title={`${p.x}: ${format(n(p.y))}`} />
        ))}
        <span className="tc-direct" style={{ left: `${x(points.length - 1)}%`, top: `${y(n(last.y))}%` }}>{format(n(last.y))}</span>
      </div>
    </Frame>
  );
}

/** Vertical bars for a count per period. Hover a bar for its value. */
export function Columns({ points, height = 160, color = 'var(--series)', format = (v) => fmt(v) }: {
  points: Array<{ x: string; y: number; hint?: string }>; height?: number; color?: string; format?: (v: number) => string;
}) {
  if (points.length === 0) return <div className="chart-empty">No data yet</div>;
  const maxY = niceMax(Math.max(...points.map((p) => n(p.y))), true);
  return (
    <Frame maxY={maxY} integer format={format} height={height} labels={points.map((p) => p.x)}>
      <div className="tc-area tc-cols">
        {points.map((p) => (
          <div key={p.x} className="tc-col" title={p.hint ?? `${p.x}: ${format(n(p.y))}`}>
            <span style={{ height: `${(n(p.y) / maxY) * 100}%`, background: color }} />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** Tiny inline meter for a 0–100 score in a table cell. */
export function Meter({ value, color, width = 44 }: { value: number | null; color?: string; width?: number }) {
  if (value == null) return <span className="dim">—</span>;
  const v = Math.max(0, Math.min(100, n(value)));
  return (
    <span className="meter" title={String(v)} style={{ '--w': `${width}px` } as CSSProperties}>
      <span className="meter-track"><span style={{ width: `${v}%`, background: color ?? (v >= 70 ? 'var(--ok)' : v >= 40 ? 'var(--series)' : 'var(--muted)') }} /></span>
      <span className="meter-num">{v}</span>
    </span>
  );
}

/** A small trend line with a soft fill, for context beside a headline number. */
export function Sparkline({ values, color = 'var(--series)', className }: { values: number[]; color?: string; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values.map(n));
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${96 - (n(v) / max) * 88}`);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={`sparkline ${className ?? ''}`} aria-hidden="true">
      <path d={`M${pts.join(' L')} L100,100 L0,100 Z`} fill={color} fillOpacity={0.12} />
      <path d={`M${pts.join(' L')}`} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function niceMax(v: number, integer = false): number {
  if (v <= 0) return 1;
  if (integer && v <= 4) return Math.max(2, Math.ceil(v));
  const mag = 10 ** Math.floor(Math.log10(v));
  const f = v / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}
