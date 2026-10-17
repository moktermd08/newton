/**
 * lifecycle/resources.js — resource and cost selection.
 *
 * Demand for a role is the summed global weight (pillar weight × station
 * weight within the pillar) of the stations that role owns. Total headcount
 * is the profile's team size, split by demand with largest-remainder
 * rounding to quarter-FTE. Day rates are placeholders in data/tuning.json.
 */
import { MAP } from './map.js';
import { TUNING, pillarWeights, subPillarWeights } from './weights.js';

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const QUARTER = 4;

/** Global weight of every applicable station: pillarWeight × weight inside its pillar. */
export function stationWeights(profile, pillars = pillarWeights(profile)) {
  const out = [];
  for (const p of pillars) {
    if (!p.weight) continue;
    for (const s of subPillarWeights(profile, p.pillar)) out.push({ ...s, pillar: p.pillar, weight: s.weight * p.weight });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

export function selectResources(profile, stations) {
  const byRole = new Map();
  for (const s of stations) {
    const r = byRole.get(s.owner) || { role: s.owner, demand: 0, stations: [] };
    r.demand += s.weight; r.stations.push({ id: s.station, name: s.name, weight: s.weight });
    byRole.set(s.owner, r);
  }
  const roles = [...byRole.values()];
  const total = roles.reduce((a, r) => a + r.demand, 0) || 1;

  // largest-remainder allocation of teamSize in quarter-FTE units
  const units = profile.teamSize * QUARTER;
  roles.forEach(r => { r.exact = (r.demand / total) * units; r.units = Math.floor(r.exact); });
  let left = units - roles.reduce((a, r) => a + r.units, 0);
  [...roles].sort((a, b) => (b.exact - b.units) - (a.exact - a.units)).slice(0, Math.max(0, left)).forEach(r => { r.units += 1; });

  return roles.map(r => {
    const fte = r.units / QUARTER;
    const family = TUNING.roleFamilies[r.role] || 'delivery';
    let sourcing = 'in-house';
    if (fte < 0.5) sourcing = 'fractional / shared';
    else if (profile.orgType === 'small' && ['security', 'data'].includes(family)) sourcing = 'contract or partner';
    return { role: r.role, family, fte, share: round(r.demand / total, 3), sourcing,
      topStations: r.stations.sort((a, b) => b.weight - a.weight).slice(0, 3).map(s => s.name) };
  }).filter(r => r.fte > 0).sort((a, b) => b.fte - a.fte || b.share - a.share);
}

/**
 * Indicative labour + tooling cost. Not a quote: rates are placeholders, tool
 * running costs depend on vendor pricing the atlas only records by model.
 */
export function estimateCost(profile, resources, toolSelection = { technology: [], tools: [] }) {
  const R = TUNING.rates;
  const lines = resources.map(r => {
    const rate = R.byFamily[r.family]?.[profile.orgType] ?? 500;
    const monthly = r.fte * R.daysPerMonth * rate;
    return { role: r.role, fte: r.fte, dayRateGBP: rate, monthlyGBP: Math.round(monthly) };
  });
  const monthlyLabour = lines.reduce((a, l) => a + l.monthlyGBP, 0);
  const labour = monthlyLabour * profile.durationMonths;

  const top = [...toolSelection.technology, ...toolSelection.tools].map(g => g.candidates[0]).filter(Boolean);
  const toolSetup = Math.round(top.reduce((a, c) => a + (c.setupCostUSD || 0), 0) * R.usdToGbp);
  const recurring = [...new Set(top.map(c => c.opexModel).filter(Boolean))];

  const C = R.contingency;
  const contingency = C.base + C.perRiskPriority * profile.priorities.risk + (profile.legacy ? C.legacy : 0) + (profile.ai ? C.ai : 0);
  const base = labour + toolSetup;
  const monthlyBudget = profile.monthlyBudgetGBP;
  return {
    currency: 'GBP', durationMonths: profile.durationMonths,
    monthlyLabourGBP: Math.round(monthlyLabour), labourGBP: Math.round(labour), toolSetupGBP: toolSetup,
    contingencyRate: round(contingency, 3),
    totalGBP: { low: Math.round(base), expected: Math.round(base * (1 + contingency)), high: Math.round(base * (1 + contingency * 2)) },
    budget: monthlyBudget ? { monthlyGBP: monthlyBudget, utilisation: round(monthlyLabour / monthlyBudget, 2), withinBudget: monthlyLabour <= monthlyBudget } : null,
    recurringToolCostModels: recurring,
    lines,
    caveat: 'Indicative: placeholder day rates (data/tuning.json) and tool set-up costs only; recurring tool costs are listed by pricing model, not priced.',
  };
}
