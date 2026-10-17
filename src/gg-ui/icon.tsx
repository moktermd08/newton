import type { CSSProperties, ComponentType, SVGProps } from 'react';
import {
  Activity, ArrowRight, Bot, Briefcase, Calendar, Clock, Database, Download, FlaskConical, Funnel, House, Inbox,
  Layers, LayoutGrid, Link, ListFilter, Mail, Megaphone, Palette, PoundSterling, Power, Radar, Reply,
  Send, Shield, Sparkles, SquareCheckBig, Sun, Table, Target, TriangleAlert, Trophy, Users,
} from 'lucide-react';

/**
 * Icons come from lucide, the set ggsocial already uses, so a glyph means the
 * same thing in every GG app. Pages name icons by a short key so server code
 * and data rows ("icon: 'send'") can pick one without importing components;
 * passing a lucide component works too.
 */

export type LucideLike = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }>;
export type IconLike = string | LucideLike;

const ICONS: Record<string, LucideLike> = {
  today: Sun,
  calendar: Calendar,
  inbox: Inbox,
  check: SquareCheckBig,
  users: Users,
  briefcase: Briefcase,
  megaphone: Megaphone,
  filter: ListFilter,
  funnel: Funnel,
  source: Radar,
  bot: Bot,
  heart: Activity,
  alert: TriangleAlert,
  clock: Clock,
  send: Send,
  download: Download,
  trophy: Trophy,
  coin: PoundSterling,
  mail: Mail,
  reply: Reply,
  target: Target,
  power: Power,
  database: Database,
  shield: Shield,
  arrow: ArrowRight,
  table: Table,
  grid: LayoutGrid,
  layers: Layers,
  // brand glyphs
  sparkles: Sparkles,
  link: Link,
  palette: Palette,
  flask: FlaskConical,
  home: House,
};

/** Lucide dropped brand logos in 1.x; the few the apps need are drawn here on the same 24px grid. */
const GLYPHS: Record<string, string[]> = {
  linkedin: ['M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z', 'M2 9h4v12H2z', 'M4 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'],
};

export const iconNames = [...Object.keys(ICONS), ...Object.keys(GLYPHS)];

export function Icon({ name, size = 16, style, className }: {
  name: IconLike; size?: number; style?: CSSProperties; className?: string;
}) {
  const shared = { width: size, height: size, className, style: { flex: 'none', ...style }, 'aria-hidden': true } as const;
  if (typeof name !== 'string') {
    const C = name;
    return <C {...shared} strokeWidth={2} />;
  }
  const glyph = GLYPHS[name];
  if (glyph) {
    return (
      <svg {...shared} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
           strokeLinecap="round" strokeLinejoin="round">
        {glyph.map((d, i) => <path key={i} d={d} />)}
      </svg>
    );
  }
  const C = ICONS[name] ?? LayoutGrid;
  return <C {...shared} strokeWidth={2} />;
}
