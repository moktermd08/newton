/**
 * lifecycle/index.js — Newton's software-lifecycle layer.
 *
 * runLifecycle(profile) turns an organisation profile into weighted selections
 * over the Software Lifecycle Map: pillars, sub-pillars (stations), horizontal
 * vectors, tools, technologies, resources, cost, build-vs-buy and the Moksy
 * report journeys most worth generating. Pure and deterministic.
 */
import { MAP, PILLAR_KEYS, reportsByStop, ZONES } from './map.js';
import { normalizeProfile } from './profile.js';
import { pillarWeights, subPillarWeights, horizontalWeights } from './weights.js';
import { selectTools, selectBuildVsBuy } from './selectors.js';
import { selectResources, estimateCost, stationWeights } from './resources.js';

export { normalizeProfile, pillarWeights, subPillarWeights, horizontalWeights, selectTools, selectBuildVsBuy, selectResources, estimateCost, stationWeights };
export { MAP } from './map.js';

const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

/** Pillars covering `share` of total weight, heaviest first. */
export function focusPillars(pillars, share = 0.8) {
  let acc = 0; const out = [];
  for (const p of pillars) { if (acc >= share || !p.weight) break; out.push(p); acc += p.weight; }
  return out;
}

/** Report journeys scored by the summed weight of their stops (normalised by length^0.5 so short reports are not buried). */
export function rankReports(stations, gateWeight = 0) {
  const w = Object.fromEntries(stations.map(s => [s.station, s.weight]));
  return MAP.reports.map(r => {
    const hit = r.stops.filter(id => w[id] !== undefined);
    const sum = hit.reduce((a, id) => a + w[id], 0) + (r.stops.length - hit.length) * 0 + gateWeight;
    return { id: r.id, name: r.name, family: r.family, score: round(sum / Math.sqrt(r.stops.length)), coverage: round(hit.length / r.stops.length, 2) };
  }).sort((a, b) => b.score - a.score);
}

export function runLifecycle(input = {}, opts = {}) {
  const { profile, errors } = normalizeProfile(input);
  if (errors.length) return { status: 'ERROR', errors };

  const pillars = pillarWeights(profile);
  const focus = focusPillars(pillars, opts.focusShare ?? 0.8);
  const stations = stationWeights(profile, pillars);

  const subPillars = {}, horizontals = {};
  for (const p of focus) {
    subPillars[p.pillar] = subPillarWeights(profile, p.pillar).slice(0, opts.subPillarLimit ?? 6);
    horizontals[p.pillar] = horizontalWeights(profile, p.key).slice(0, opts.horizontalLimit ?? 8);
  }
  const toolSel = selectTools(profile, pillars, opts.tools);
  const resources = selectResources(profile, stations);

  return {
    status: 'OK',
    profile,
    zones: profile.zones ? profile.zones.map(z => ZONES[z - 1]) : ZONES,
    pillars, focus: focus.map(p => p.pillar), subPillars, horizontals,
    technology: toolSel.technology, tools: toolSel.tools, criterionWeights: toolSel.criterionWeights,
    buildVsBuy: selectBuildVsBuy(profile, pillars),
    resources, cost: estimateCost(profile, resources, toolSel),
    reports: rankReports(stations).slice(0, opts.reportLimit ?? 8),
    topStations: stations.slice(0, 15).map(s => ({ ...s, weight: round(s.weight) })),
  };
}
