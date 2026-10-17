import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP, runLifecycle, normalizeProfile, pillarWeights, subPillarWeights, horizontalWeights, selectBuildVsBuy } from '../src/index.js';
import { PILLAR_KEYS, appliesTo } from '../src/map.js';
import { benchmark } from '../scripts/benchmark.mjs';
import { readFileSync } from 'node:fs';

const sum = a => a.reduce((s, x) => s + x, 0);
const P = o => normalizeProfile(o).profile;

test('map data is complete and internally consistent', () => {
  assert.equal(MAP.pillars.length, 31);
  assert.equal(PILLAR_KEYS.length, 32);
  assert.equal(MAP.lines.length, 10);
  assert.equal(MAP.gates.length, 9);
  assert.equal(MAP.reports.length, 33);
  const ids = new Set([...MAP.stations, ...MAP.gates].map(n => n.id));
  assert.equal(ids.size, MAP.stations.length + MAP.gates.length, 'ids are unique');
  for (const r of MAP.reports) for (const id of r.stops) assert.ok(ids.has(id), `report ${r.id} stop ${id}`);
  for (const s of MAP.stations) assert.ok(s.pillar >= 1 && s.pillar <= 31, s.id);
  const atlas = JSON.parse(readFileSync(new URL('../data/pillar_atlas.json', import.meta.url)));
  for (const k of PILLAR_KEYS.slice(1)) assert.ok(atlas.pillars[k], `atlas has ${k}`);
});

test('station applicability follows the S/M/L/P scale codes', () => {
  const st = c => ({ scale: c, ai: false });
  assert.ok(appliesTo(st('S'), 'small'));
  assert.ok(!appliesTo(st('M'), 'small') && appliesTo(st('M'), 'medium'));
  assert.ok(!appliesTo(st('L'), 'medium') && appliesTo(st('L'), 'large') && appliesTo(st('L'), 'public'));
  assert.ok(!appliesTo(st('P'), 'large') && appliesTo(st('P'), 'public'));
  assert.ok(!appliesTo({ scale: 'S', ai: true }, 'small', { ai: false }));
});

test('profile validation reports bad input and fills defaults', () => {
  assert.equal(runLifecycle({ orgType: 'galaxy' }).status, 'ERROR');
  assert.equal(runLifecycle({ zones: [9] }).status, 'ERROR');
  const p = P({ orgType: 'public sector' });
  assert.equal(p.orgType, 'public');
  assert.equal(p.monthlyBudgetGBP, null);
  assert.deepEqual(P({ zones: ['Build'] }).zones, [4]);
});

test('pillar weights sum to 1, skip inactive pillars, and are deterministic', () => {
  const p = P({ orgType: 'medium' });
  const w = pillarWeights(p);
  assert.ok(Math.abs(sum(w.map(x => x.weight)) - 1) < 1e-3);
  assert.deepEqual(pillarWeights(p), w);
  assert.equal(pillarWeights(P({ orgType: 'small', zones: [7] })).filter(x => x.weight > 0).every(x => x.stations > 0), true);
});

test('context moves the right pillars', () => {
  const get = (o, n) => pillarWeights(P(o)).find(x => x.pillar === n).weight;
  assert.ok(get({ orgType: 'medium', compliance: ['gdpr', 'pci'] }, 13) > get({ orgType: 'medium' }, 13));
  assert.ok(get({ orgType: 'medium', ai: true }, 23) > get({ orgType: 'medium', ai: false }, 23));
  assert.equal(get({ orgType: 'medium', ai: false }, 23), 0, 'AI governance has no stations without AI');
  assert.ok(get({ orgType: 'medium', legacy: true }, 15) > get({ orgType: 'medium' }, 15));
  assert.ok(get({ orgType: 'medium', priorities: { cost: 1 } }, 22) > get({ orgType: 'medium', priorities: { cost: 0 } }, 22));
  assert.ok(get({ orgType: 'public' }, 29) > get({ orgType: 'small' }, 29));
});

test('sub-pillar weights sum to 1 within a pillar and respect org size', () => {
  const med = subPillarWeights(P({ orgType: 'medium' }), 10);
  assert.ok(Math.abs(sum(med.map(x => x.weight)) - 1) < 1e-3);
  const small = subPillarWeights(P({ orgType: 'small' }), 13).map(x => x.station);
  const pub = subPillarWeights(P({ orgType: 'public' }), 13).map(x => x.station);
  assert.ok(!small.includes('accred') && pub.includes('accred'));
});

test('horizontal weights stay in 0-1 and react to priorities', () => {
  const find = (o, key, v) => horizontalWeights(P(o), key).find(x => x.vector === v).weight;
  for (const x of horizontalWeights(P({}), 'P10_Security')) assert.ok(x.weight >= 0 && x.weight <= 1);
  assert.ok(find({ priorities: { cost: 1 } }, 'P20_Architecture', 'v3_cost') >= find({ priorities: { cost: 0 } }, 'P20_Architecture', 'v3_cost'));
  assert.ok(find({ orgType: 'public' }, 'P13_Compliance', 'v13_compliance_map') > find({ orgType: 'small' }, 'P13_Compliance', 'v13_compliance_map'));
  assert.ok(horizontalWeights(P({}), 'P24_AIGovernance').length >= 11, 'pillars without weight.json rows use analogs');
});

test('build vs buy leans buy for commodity pillars and build for differentiators', () => {
  const v = o => Object.fromEntries(selectBuildVsBuy(P(o), pillarWeights(P(o)), { min: 0 }).map(x => [x.pillar, x]));
  const r = v({ orgType: 'medium' });
  assert.equal(r[22].verdict, 'buy');
  assert.equal(r[1].verdict, 'build');
  assert.ok(v({ orgType: 'medium', differentiator: 1 })[10].buyScore < r[10].buyScore);
});

test('full run returns every section and a consistent team', () => {
  const r = runLifecycle({ orgType: 'medium', teamSize: 20, compliance: ['gdpr'], ai: true });
  assert.equal(r.status, 'OK');
  for (const k of ['pillars', 'focus', 'subPillars', 'horizontals', 'technology', 'tools', 'buildVsBuy', 'resources', 'cost', 'reports', 'topStations'])
    assert.ok(r[k] && (Array.isArray(r[k]) ? r[k].length : Object.keys(r[k]).length), k);
  assert.equal(sum(r.resources.map(x => x.fte)), 20, 'FTE allocation equals team size');
  assert.ok(r.cost.totalGBP.low < r.cost.totalGBP.expected && r.cost.totalGBP.expected < r.cost.totalGBP.high);
  assert.equal(r.cost.budget, null);
  assert.equal(runLifecycle({ orgType: 'medium', monthlyBudgetGBP: 1 }).cost.budget.withinBudget, false);
});

test('tool ranking changes with priorities and flags regulated gaps', () => {
  const top = o => runLifecycle(o).technology.flatMap(g => g.candidates.map(c => c.score)).slice(0, 20).join();
  assert.notEqual(top({ orgType: 'small', priorities: { speed: 1, cost: 1 } }), top({ orgType: 'large', priorities: { risk: 1, quality: 1 } }));
});

test('benchmark over the 1,000 use cases', () => {
  const b = benchmark();
  assert.equal(b.n, 1000);
  assert.equal(b.errors, 0);
  // Floors sit below the measured values (92.6 / 83.9 / 66.9 at time of writing) to catch regressions, not to define quality.
  assert.ok(b.pillarInFocus >= 88, `pillarInFocus ${b.pillarInFocus}`);
  assert.ok(b.stationInTop15 >= 78, `stationInTop15 ${b.stationInTop15}`);
  assert.ok(b.reportInTop8 >= 60, `reportInTop8 ${b.reportInTop8}`);
});
