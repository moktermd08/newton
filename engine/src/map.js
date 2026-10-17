/**
 * lifecycle/map.js — loads the Software Lifecycle Map and answers structural
 * questions about it (which stations apply to an organisation, what each
 * pillar is made of). Pure and read-only; data lives in data/lifecycle-map.json.
 */
import lifecycleMap from '../data/lifecycle-map.json' with { type: 'json' };

export const MAP = lifecycleMap;
export const ZONES = MAP.zones;

/** Map pillar number (1-31, as used on the map) → Newton pillar-atlas key. */
export const PILLAR_KEYS = [
  null, // 1-indexed
  'P01_Strategy', 'P02_Experience', 'P03_Code', 'P04_Database', 'P05_Content',
  'P06_Hardware', 'P07_Pattern', 'P08_Testing', 'P09_Deployment', 'P10_Security',
  'P11_Actors', 'P12_Support', 'P13_Compliance', 'P14_Scaling', 'P15_Maintenance',
  'P16_Sales', 'P17_Marketing', 'P18_Documentation', 'P19_Integration', 'P20_Architecture',
  'P21_ChangeManagement', 'P22_FinancialGovernance', 'P24_AIGovernance', 'P26_MLOps',
  'P25_CustomerDataLifecycle', 'P27_SupplyChainSecurity', 'P28_CustomerOnboarding',
  'P29_Sustainability', 'P30_VendorLifecycle', 'P31_ContinuousRiskManagement',
  'P32_ContinuousDocumentation',
];
// Map pillar 12 is "Support / Observability"; the atlas splits it in two.
export const PILLAR_EXTRA_KEYS = { 12: ['P23_Observability'] };

export const pillarName = n => MAP.pillars[n - 1];
export const stationsById = Object.fromEntries(MAP.stations.map(s => [s.id, s]));
export const gatesById = Object.fromEntries(MAP.gates.map(g => [g.id, g]));
export const linesById = Object.fromEntries(MAP.lines.map(l => [l.id, l]));

export const ORG_TYPES = ['small', 'medium', 'large', 'public'];

/**
 * Station scale codes from the map: S all sizes, M medium and up,
 * L large and public sector, P public sector only.
 */
export function appliesTo(station, orgType, { ai = true } = {}) {
  if (station.ai && !ai) return false;
  switch (station.scale) {
    case 'S': return true;
    case 'M': return orgType !== 'small';
    case 'L': return orgType === 'large' || orgType === 'public';
    case 'P': return orgType === 'public';
    default: return true;
  }
}

/** Number of gates a station's line passes through, within ±1.5 columns of the station. */
export function gatesNear(station) {
  return MAP.gates.filter(g => g.lines.includes(station.line) && Math.abs(g.x - station.x) <= 1.5);
}

/** Reports that draw on each station / gate id. */
export const reportsByStop = (() => {
  const m = {};
  for (const r of MAP.reports) for (const id of r.stops) (m[id] ||= []).push(r.id);
  return m;
})();
