// node scripts/benchmark.mjs — runs Newton over all 1,000 use cases and prints hit rates.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runLifecycle, MAP } from '../src/index.js';
import { profileFromUseCase } from '../src/useCaseProfile.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const { useCases } = JSON.parse(readFileSync(path.join(here, '..', 'data', 'use-cases.json'), 'utf8'));
const stationPillar = Object.fromEntries(MAP.stations.map(s => [s.id, s.pillar]));
const gateIds = new Set(MAP.gates.map(g => g.id));

export function benchmark(limit = Infinity) {
  let n = 0, errors = 0, pillarHit = 0, stationHit = 0, reportTop3 = 0, reportTop8 = 0, reportable = 0;
  for (const uc of useCases.slice(0, limit)) {
    const ids = String(uc['Station IDs']).split(/[,\s]+/).filter(id => id && !gateIds.has(id));
    const r = runLifecycle(profileFromUseCase(uc));
    n++;
    if (r.status !== 'OK') { errors++; continue; }
    const wanted = new Set(ids.map(id => stationPillar[id]).filter(Boolean));
    if ([...wanted].some(p => r.focus.includes(p))) pillarHit++;
    const topStations = new Set(r.topStations.map(s => s.station));
    if (ids.some(id => topStations.has(id))) stationHit++;
    const rank = r.reports.findIndex(x => x.name === uc['Moksy report']);
    reportable++;
    if (rank >= 0 && rank < 3) reportTop3++;
    if (rank >= 0) reportTop8++;
  }
  const pct = x => Math.round((x / (n - errors)) * 1000) / 10;
  return { n, errors, pillarInFocus: pct(pillarHit), stationInTop15: pct(stationHit), reportInTop3: pct(reportTop3), reportInTop8: pct(reportTop8) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(benchmark());
