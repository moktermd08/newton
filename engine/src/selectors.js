/**
 * lifecycle/selectors.js — tool, technology and build-vs-buy selection.
 *
 * Tools and technologies come from the scored pillar atlas
 * (data/pillar_atlas.json). Each candidate gets a weighted sum of its eleven
 * technical + business scores; the weights are derived from the profile, so
 * a cost-driven public body and a speed-driven startup rank the same
 * candidates differently. Build-vs-buy is decided per pillar.
 */
import atlas from '../data/pillar_atlas.json' with { type: 'json' };
import { PILLAR_KEYS, PILLAR_EXTRA_KEYS, pillarName } from './map.js';
import { TUNING } from './weights.js';

const ATLAS = atlas;
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/** Map pillars whose atlas entries are technology choices rather than tools/services. */
export const TECH_PILLARS = new Set([3, 4, 6, 7, 9, 14, 19, 20, 24]);
const TIER = { 'under-100': 1, '100-1k': 2, '1k-10k': 3, '10k-100k': 4, '100k-plus': 5 };
const SECURITY_RANK = { Basic: 0, Standard: 0, Mid: 1, Enterprise: 2, Government: 3 };

const CRITERIA = [
  ['technical', 'performance'], ['technical', 'scaling'], ['technical', 'complexity'], ['technical', 'talent_availability'],
  ['technical', 'ecosystem'], ['technical', 'maturity'], ['business', 'speed_to_market'], ['business', 'tco_5yr'],
  ['business', 'vendor_risk'], ['business', 'time_to_hire'], ['business', 'roi_proxy'],
];

export function criterionWeights(profile) {
  const w = Object.fromEntries(CRITERIA.map(([, c]) => [c, 1]));
  const p = profile.priorities;
  const f = x => 0.5 + x;                     // 0 → 0.5×, 0.5 → 1×, 1 → 1.5×
  w.speed_to_market *= f(p.speed); w.time_to_hire *= f(p.speed);
  w.tco_5yr *= f(p.cost); w.roi_proxy *= f(p.cost);
  w.vendor_risk *= f(p.risk); w.maturity *= f(p.risk);
  w.performance *= f(p.quality); w.ecosystem *= f(p.quality); w.maturity *= f(p.quality);
  if (profile.growth === 'high') { w.scaling *= 1.3; w.performance *= 1.15; }
  if (profile.growth === 'hypergrowth') { w.scaling *= 1.6; w.performance *= 1.3; }
  if (profile.orgType === 'small') { w.complexity *= 1.4; w.talent_availability *= 1.2; }   // complexity is inverted: 10 = simplest
  if (profile.legacy) w.ecosystem *= 1.2;
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w)) w[k] /= sum;
  return w;
}

function tierOf(profile) { return TIER[profile.scale] ?? 2; }
const entryTier = e => [+String(e.compatibility?.tier_min).slice(1) || 1, +String(e.compatibility?.tier_max).slice(1) || 6];

function* atlasEntries(pillarKeys) {
  for (const key of pillarKeys) {
    const p = ATLAS.pillars[key];
    if (!p) continue;
    for (const [focusArea, fa] of Object.entries(p.focusAreas || {})) for (const entry of fa.entries) yield { key, focusArea, entry };
  }
}

function scoreEntry(entry, weights, profile) {
  let total = 0; const parts = [];
  for (const [group, c] of CRITERIA) {
    const v = entry.scores?.[group]?.[c];
    if (typeof v !== 'number') continue;
    total += weights[c] * v;
    parts.push([c, weights[c] * v, v]);
  }
  const notes = [];
  const [lo, hi] = entryTier(entry), t = tierOf(profile);
  if (t < lo || t > hi) { total *= 0.8; notes.push(`designed for tiers L${lo}-L${hi}, profile is L${t}`); }
  const regulated = profile.compliance.length > 0 || profile.orgType === 'public';
  if (regulated && entry.compliance?.security !== undefined && (SECURITY_RANK[entry.compliance.security] ?? 0) < 1) { total *= 0.9; notes.push('security assurance below Mid for a regulated context'); }
  if (regulated && entry.compliance?.accessibility === false) { total *= 0.9; notes.push('no accessibility support'); }
  if (profile.orgType === 'small' && /enterprise|license/.test(entry.financials?.opex_model || '')) notes.push('enterprise licensing may exceed a small budget');
  const why = parts.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, , v]) => `${c} ${v}`);
  return { score: total, why, notes };
}

/**
 * @param {object} profile  normalised profile
 * @param {Array} pillars   output of pillarWeights()
 * @param {{pillars?:number, perFocusArea?:number}} opts  how many top pillars to cover and candidates kept per focus area
 */
export function selectTools(profile, pillars, { pillars: topN = 10, perFocusArea = 3 } = {}) {
  const weights = criterionWeights(profile);
  const technology = [], tools = [];
  for (const pw of pillars.filter(p => p.weight > 0).slice(0, topN)) {
    const keys = [PILLAR_KEYS[pw.pillar], ...(PILLAR_EXTRA_KEYS[pw.pillar] || [])];
    const byArea = new Map();
    for (const { key, focusArea, entry } of atlasEntries(keys)) {
      const s = scoreEntry(entry, weights, profile);
      const k = `${key}|${focusArea}`;
      if (!byArea.has(k)) byArea.set(k, []);
      byArea.get(k).push({ id: entry.id, name: entry.name, category: entry.category, ...s, setupCostUSD: entry.financials?.setup_cost_usd ?? 0, opexModel: entry.financials?.opex_model, trending: entry.trending });
    }
    for (const [k, list] of byArea) {
      const ranked = list.sort((a, b) => b.score - a.score).slice(0, perFocusArea)
        .map(c => ({ ...c, score: round(c.score) }));
      const row = { pillar: pw.pillar, pillarName: pw.name, pillarWeight: pw.weight, focusArea: k.split('|')[1], candidates: ranked };
      (TECH_PILLARS.has(pw.pillar) ? technology : tools).push(row);
    }
  }
  return { technology, tools, criterionWeights: Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, round(v, 3)])) };
}

/**
 * Build / buy / configure verdict per pillar. `buyScore` runs 0-1; the
 * thresholds are 0.6 and 0.4.
 */
export function selectBuildVsBuy(profile, pillars, { min = 0.01 } = {}) {
  return pillars.filter(p => p.weight >= min).map(p => {
    const reasons = [];
    let buy = TUNING.commodity[p.pillar] ?? 0.5;
    reasons.push(`commodity ${buy}`);
    const adj = (d, why) => { buy += d; reasons.push(`${d > 0 ? '+' : ''}${round(d, 2)} ${why}`); };

    const diff = (profile.differentiator - 0.5) * -0.3 * (1 - (TUNING.commodity[p.pillar] ?? 0.5) * 0.5);
    if (Math.abs(diff) > 0.005) adj(diff, `differentiator ${profile.differentiator}`);
    if (profile.teamSize < 10) adj(0.1, 'team under 10');
    if (profile.teamSize >= 100) adj(-0.05, 'large team can absorb build');
    if (!profile.existingSkills.length) adj(0.05, 'no declared in-house skills');
    const speed = profile.priorities.speed; if (speed !== 0.5) adj((speed - 0.5) * 0.3, `speed priority ${speed}`);
    const regulated = profile.compliance.length > 0 || profile.orgType === 'public';
    if (regulated && [10, 13, 26].includes(p.pillar)) adj(0.1, 'certified products ease assurance');
    if (profile.orgType === 'public') adj(0.05, 'framework procurement (e.g. G-Cloud) favours buy');

    buy = Math.min(1, Math.max(0, buy));
    const verdict = buy >= 0.6 ? 'buy' : buy <= 0.4 ? 'build' : 'configure';
    return { pillar: p.pillar, name: p.name, weight: p.weight, buyScore: round(buy), verdict, reasons };
  }).sort((a, b) => b.weight - a.weight);
}
