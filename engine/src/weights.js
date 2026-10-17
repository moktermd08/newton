/**
 * lifecycle/weights.js — three weight layers, each normalised:
 *   1. pillarWeights      how much each of the 31 map pillars matters for this profile
 *   2. subPillarWeights   how much each station (sub-pillar) matters inside a pillar
 *   3. horizontalWeights  how much each horizontal vector (v1-v18) matters for a pillar
 *
 * Structural mass comes from the map itself (stations that apply, the gates
 * they sit near, the reports that draw on them). Context multipliers come
 * from data/tuning.json. Every weight carries the reasons that moved it.
 */
import tuning from '../data/tuning.json' with { type: 'json' };
import vectorWeights from '../data/weight.json' with { type: 'json' };
import { MAP, PILLAR_KEYS, appliesTo, gatesNear, reportsByStop, pillarName } from './map.js';

export const TUNING = tuning;
const VECTOR_WEIGHTS = vectorWeights;

const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
const inZones = (st, profile) => !profile.zones || profile.zones.includes(st.zone);

export function applicableStations(profile) {
  return MAP.stations.filter(s => appliesTo(s, profile.orgType, { ai: profile.ai }) && inZones(s, profile));
}

function stationMass(st, profile) {
  const m = TUNING.structuralMass;
  const reports = Math.min(m.reportCap, (reportsByStop[st.id] || []).length);
  const mass = m.station + m.perNearbyGate * gatesNear(st).length + m.perReport * reports;
  return profile.lines?.includes(st.line) ? mass * TUNING.lineFocusMultiplier : mass;
}

function priorityFactor(p) {
  const { min, max } = TUNING.priorityRange;
  return min + (max - min) * p;
}

function normalise(items, key = 'weight') {
  const total = items.reduce((s, i) => s + i[key], 0) || 1;
  items.forEach(i => { i[key] = round(i[key] / total); });
  return items;
}

/** @returns {Array<{pillar:number,name:string,key:string,weight:number,stations:number,drivers:string[]}>} sorted heaviest first */
export function pillarWeights(profile) {
  const B = TUNING.pillarBoosts;
  const stations = applicableStations(profile);
  const out = [];
  for (let n = 1; n <= 31; n++) {
    const own = stations.filter(s => s.pillar === n);
    let w = own.reduce((s, st) => s + stationMass(st, profile), 0);
    const drivers = [];
    const boost = (mult, why) => { if (w > 0) { w *= mult; drivers.push(why); } };

    if (profile.compliance.length && B.compliancePerRegime.pillars.includes(n))
      boost(1 + B.compliancePerRegime.perUnit * Math.min(B.compliancePerRegime.cap, profile.compliance.length), `compliance: ${profile.compliance.join(', ')}`);
    if (profile.ai && B.ai.pillars.includes(n)) boost(B.ai.multiplier, 'AI/ML in scope');
    if (profile.legacy && B.legacy.pillars.includes(n)) boost(B.legacy.multiplier, 'modernising an existing system');
    if (profile.orgType === 'public' && B.public.pillars.includes(n)) boost(B.public.multiplier, 'public sector obligations');
    const g = B.growth[profile.growth];
    if (g && g.pillars.includes(n)) boost(g.multiplier, `${profile.growth} growth`);
    for (const [k, group] of Object.entries(TUNING.priorityGroups)) {
      const p = profile.priorities[k];
      if (group.includes(n) && p !== 0.5) boost(priorityFactor(p), `${k} priority ${p}`);
    }
    out.push({ pillar: n, name: pillarName(n), key: PILLAR_KEYS[n], weight: w, stations: own.length, drivers });
  }
  return normalise(out).sort((a, b) => b.weight - a.weight);
}

/** Stations of one pillar, weighted within that pillar (sums to 1). */
export function subPillarWeights(profile, pillar) {
  const own = applicableStations(profile).filter(s => s.pillar === pillar);
  const items = own.map(st => {
    const gates = gatesNear(st).map(g => g.name);
    return { station: st.id, name: st.name, line: st.line, zone: st.zone, owner: st.owner, weight: stationMass(st, profile),
      drivers: [...(gates.length ? [`near gate: ${gates.join(', ')}`] : []), ...((reportsByStop[st.id] || []).length ? [`feeds ${reportsByStop[st.id].length} report(s)`] : [])] };
  });
  return normalise(items).sort((a, b) => b.weight - a.weight);
}

function baseVector(key) {
  const direct = VECTOR_WEIGHTS.pillars[key];
  if (direct) return direct;
  const analogs = (TUNING.vectorAnalogs[key] || []).map(k => VECTOR_WEIGHTS.pillars[k]).filter(Boolean);
  if (!analogs.length) return null;
  const out = {};
  for (const v of Object.keys(analogs[0])) {
    if (typeof analogs[0][v] === 'number') out[v] = analogs.reduce((s, a) => s + a[v], 0) / analogs.length;
  }
  return out;
}

/**
 * Horizontal vector weights (0-1, comparable across vectors) for one pillar.
 * v1-v11 start from weight.json (or the average of analog pillars); v12-v18
 * start from tuning.json. Profile context then shifts them.
 */
export function horizontalWeights(profile, pillarKey) {
  const base = baseVector(pillarKey) || {};
  const w = {};
  for (const [k, v] of Object.entries(base)) if (/^v\d+_/.test(k)) w[k] = v;
  Object.assign(w, TUNING.horizontalBase);
  const why = {};
  const mult = (k, f, reason) => { if (w[k] === undefined) return; w[k] = Math.min(1, w[k] * f); (why[k] ||= []).push(reason); };

  for (const [prio, vec] of Object.entries(TUNING.vectorPriority)) {
    const p = profile.priorities[prio];
    if (p !== 0.5) mult(vec, priorityFactor(p), `${prio} priority ${p}`);
  }
  if (!profile.ai) { mult('v6_prompts', 0.3, 'AI out of scope'); mult('v11_agent', 0.3, 'AI out of scope'); }
  if (profile.legacy) { mult('v10_int', 1.3, 'legacy integration'); mult('v9_risk', 1.2, 'legacy risk'); }
  if (!profile.existingSkills.length) mult('v2_skills', 1.15, 'no declared skills');
  if (profile.compliance.length || profile.orgType === 'public') {
    mult('v13_compliance_map', 1.8 + 0.1 * profile.compliance.length, 'regulated context');
    mult('v9_risk', 1.15, 'regulated context');
  }
  if (profile.orgType === 'large' || profile.orgType === 'public') {
    mult('v16_maturity_model', 1.6, `${profile.orgType} governance`);
    mult('v17_stakeholders', 1.5, `${profile.orgType} stakeholder load`);
  }
  mult('v18_buy_vs_build', 0.6 + 0.8 * (1 - profile.differentiator), `differentiator ${profile.differentiator}`);

  return Object.entries(w).map(([vector, weight]) => ({ vector, weight: round(weight, 3), drivers: why[vector] || [] }))
    .sort((a, b) => b.weight - a.weight);
}
