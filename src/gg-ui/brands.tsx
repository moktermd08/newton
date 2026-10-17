import type { CSSProperties } from 'react';
import { Icon } from './icon';

/**
 * The GG brands' identity, shared by every GG app so a brand looks the same
 * wherever it appears.
 *
 * Colours are fixed per brand, never by rank, so a brand keeps its colour when
 * a scope or filter changes. The six are the first six categorical slots of
 * the validated palette, in precedence order. The light variants sit under 3:1
 * on white, so a brand colour is never shown without the brand's name.
 */

export interface BrandStyle { color: string; dark: string; icon: string }

const STYLE: Record<string, BrandStyle> = {
  'moksy-ai':     { color: '#2a78d6', dark: '#3987e5', icon: 'sparkles' },
  'gglink':       { color: '#eb6834', dark: '#d95926', icon: 'link' },
  'gurugraphics': { color: '#1baf7a', dark: '#199e70', icon: 'palette' },
  'trialtest':    { color: '#eda100', dark: '#c98500', icon: 'flask' },
  'ggtaskers':    { color: '#e87ba4', dark: '#d55181', icon: 'briefcase' },
  'noor-housing': { color: '#008300', dark: '#008300', icon: 'home' },
};

const FALLBACK: BrandStyle = { color: '#898781', dark: '#898781', icon: 'layers' };

export function brandStyle(slug: string | null | undefined): BrandStyle {
  return (slug && STYLE[slug]) || FALLBACK;
}

/** Brand colour custom properties; `--bc` resolves per theme in the stylesheet. */
export function brandVars(slug: string | null | undefined): CSSProperties {
  const s = brandStyle(slug);
  return { '--b': s.color, '--b-dark': s.dark } as CSSProperties;
}

/** The brand's mark: its glyph on its colour. Always shown beside the name. */
export function BrandMark({ slug, size = 28 }: { slug: string | null | undefined; size?: number }) {
  const s = brandStyle(slug);
  return (
    <span className="brand-mark" style={{ ...brandVars(slug), width: size, height: size }} aria-hidden="true">
      <Icon name={s.icon} size={Math.round(size * 0.55)} />
    </span>
  );
}

/** Inline brand label: a coloured dot and the brand's name. */
export function BrandChip({ slug, name }: { slug: string | null | undefined; name?: string | null }) {
  if (!slug) return <span className="chip chip-all">cross-brand</span>;
  return (
    <span className="chip brand-chip" style={brandVars(slug)}>
      <span className="dot" />{name ?? slug}
    </span>
  );
}

/** Initials avatar for a person, tinted by their brand. */
export function Avatar({ name, slug, size = 28 }: { name: string | null | undefined; slug?: string | null; size?: number }) {
  const initials = (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]!.toUpperCase()).join('') || '?';
  return (
    <span className="avatar" style={{ ...brandVars(slug), width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  );
}
