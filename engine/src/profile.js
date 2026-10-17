/**
 * lifecycle/profile.js — normalises an organisation profile into the shape
 * every lifecycle selector consumes. All inputs are optional; defaults are
 * chosen per organisation type so a one-field profile still produces a result.
 */
import { ORG_TYPES, ZONES } from './map.js';

const PRIORITY_KEYS = ['speed', 'cost', 'quality', 'risk'];
const GROWTH = ['stable', 'medium', 'high', 'hypergrowth'];
const SCALES = ['under-100', '100-1k', '1k-10k', '10k-100k', '100k-plus'];

const DEFAULTS = {
  small:  { teamSize: 6,   scale: 'under-100', durationMonths: 6 },
  medium: { teamSize: 25,  scale: '100-1k',    durationMonths: 9 },
  large:  { teamSize: 120, scale: '1k-10k',    durationMonths: 12 },
  public: { teamSize: 60,  scale: '1k-10k',    durationMonths: 14 },
};

const clamp01 = n => Math.min(1, Math.max(0, Number(n)));

export function normalizeProfile(input = {}) {
  const errors = [];
  const orgType = String(input.orgType ?? input.size ?? 'medium').toLowerCase().replace('public sector', 'public');
  if (!ORG_TYPES.includes(orgType)) errors.push(`orgType must be one of ${ORG_TYPES.join(', ')}`);
  const type = ORG_TYPES.includes(orgType) ? orgType : 'medium';
  const d = DEFAULTS[type];

  let zones = input.zones ?? (input.zone != null ? [input.zone] : null);
  if (zones) zones = [].concat(zones).map(z => (typeof z === 'string' && isNaN(z) ? ZONES.findIndex(n => n.toLowerCase() === z.toLowerCase()) + 1 : Number(z)));
  if (zones && zones.some(z => !(z >= 1 && z <= 7))) { errors.push('zones must be 1-7 or a zone name'); zones = null; }

  const growth = GROWTH.includes(input.growth) ? input.growth : 'medium';
  const scale = SCALES.includes(input.scale) ? input.scale : d.scale;

  const pr = { speed: 0.5, cost: 0.5, quality: 0.5, risk: 0.5, ...(input.priorities || {}) };
  for (const k of PRIORITY_KEYS) pr[k] = Number.isFinite(+pr[k]) ? clamp01(pr[k]) : 0.5;

  const profile = {
    orgType: type,
    sector: String(input.sector ?? 'any').toLowerCase(),
    ai: input.ai ?? true,
    lines: [].concat(input.lines ?? []).map(String), // optional discipline focus (map line ids, e.g. 'sec')
    zones,                                   // null = whole lifecycle
    teamSize: Math.max(1, Math.round(+input.teamSize || d.teamSize)),
    monthlyBudgetGBP: +input.monthlyBudgetGBP || null,  // no default: only checked when supplied
    durationMonths: +input.durationMonths || d.durationMonths,
    scale,
    growth,
    compliance: [].concat(input.compliance ?? []).map(String).map(s => s.toLowerCase()),
    legacy: !!input.legacy,                  // modernisation of an existing system
    differentiator: clamp01(input.differentiator ?? 0.5), // how much the capability sets the org apart
    existingSkills: [].concat(input.existingSkills ?? []).map(String).map(s => s.toLowerCase()),
    priorities: pr,
    region: String(input.region ?? 'uk').toLowerCase(),
  };
  return { profile, errors };
}
