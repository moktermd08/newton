/**
 * lifecycle/useCaseProfile.js — turns a row of the 1,000-use-case catalogue
 * into a Newton profile, so the engine can be benchmarked against known
 * situations (does the right pillar / report come out on top?).
 */
import { ZONES, MAP } from './map.js';

const ORDER = [['Small', 'small'], ['Medium', 'medium'], ['Large', 'large'], ['Public', 'public']];

export function profileFromUseCase(uc) {
  const types = ORDER.filter(([col]) => uc[col]).map(([, t]) => t);
  const text = `${uc['Use case']} ${uc.Challenge}`.toLowerCase();
  const compliance = ['gdpr', 'hipaa', 'pci', 'iso 27001', 'soc 2', 'wcag'].filter(k => text.includes(k)).map(k => k.replace(' ', ''));
  return {
    orgType: types[0] ?? 'medium',
    otherOrgTypes: types.slice(1),
    sector: String(uc.Sector || 'any').toLowerCase(),
    zones: [Number(uc.Zone)],
    lines: MAP.lines.filter(l => l.name === uc['Discipline (map line)']).map(l => l.id),
    ai: /\b(ai|ml|llm|model|machine learning)\b/.test(text),
    legacy: /\b(legacy|migrat|moderni[sz]|decommission|retire|replat)/.test(text),
    compliance,
  };
}

export const zoneName = z => ZONES[z - 1];
