/**
 * Colour maths for colours chosen at runtime (a brand's hex, a status). Text
 * painted straight in an arbitrary hex is unreadable on one theme or the
 * other, so tints are blended toward the current theme's tokens instead.
 */

function parse(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG 2.1 relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string) {
  const rgb = parse(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hexes, 1 to 21. */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever reads better on `hex`. */
export function readableOn(hex: string) {
  return contrast(hex, '#000000') >= contrast(hex, '#ffffff') ? '#000000' : '#ffffff';
}

export function isValidHex(hex: string) {
  return parse(hex) !== null;
}

/** Normalises user input ("6366F1", "#6366f1") to "#6366f1", or null. */
export function normalizeHex(hex: string) {
  const rgb = parse(hex);
  return rgb ? `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}` : null;
}

/** A tint of `color` that stays legible as text in both themes. */
export function tintedInk(color: string, strength = 68) {
  return `color-mix(in oklab, ${color} ${strength}%, var(--text))`;
}

export function tintedSurface(color: string, strength = 14) {
  return `color-mix(in oklab, ${color} ${strength}%, var(--surface))`;
}

export function tintedBorder(color: string, strength = 42) {
  return `color-mix(in oklab, ${color} ${strength}%, var(--border))`;
}
