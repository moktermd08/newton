#!/usr/bin/env node
/**
 * newton-lifecycle — weighted lifecycle selections for an organisation profile.
 *   newton-lifecycle --org public --ai --compliance gdpr,wcag --team 40 --speed 0.3 --cost 0.9
 *   newton-lifecycle profile.json --json
 */
import { readFileSync } from 'node:fs';
import { runLifecycle } from '../src/index.js';

const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(`--${name}`); return i < 0 ? def : (argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[i + 1]); };
const file = argv.find(a => a.endsWith('.json') && !a.startsWith('--'));

let input = file ? JSON.parse(readFileSync(file, 'utf8')) : {};
const num = v => (v === undefined || v === true ? undefined : Number(v));
const overrides = {
  orgType: flag('org'), sector: flag('sector'), teamSize: num(flag('team')), durationMonths: num(flag('months')),
  monthlyBudgetGBP: num(flag('budget')), growth: flag('growth'), scale: flag('scale'),
  compliance: flag('compliance') && String(flag('compliance')).split(','),
  zones: flag('zones') && String(flag('zones')).split(','),
  lines: flag('lines') && String(flag('lines')).split(','),
  ai: argv.includes('--no-ai') ? false : argv.includes('--ai') ? true : undefined,
  legacy: argv.includes('--legacy') ? true : undefined,
  priorities: Object.fromEntries(['speed', 'cost', 'quality', 'risk'].filter(k => flag(k) !== undefined).map(k => [k, num(flag(k))])),
};
for (const [k, v] of Object.entries(overrides)) if (v !== undefined && v !== false) input[k] = k === 'priorities' ? { ...input.priorities, ...v } : v;
if (overrides.ai === false) input.ai = false;

const r = runLifecycle(input);
if (argv.includes('--json')) { console.log(JSON.stringify(r, null, 2)); process.exit(r.status === 'OK' ? 0 : 1); }
if (r.status !== 'OK') { console.error(r.errors.join('\n')); process.exit(1); }

const pct = x => (x * 100).toFixed(1).padStart(5) + '%';
const p = r.profile;
console.log(`\nNEWTON LIFECYCLE — ${p.orgType} | team ${p.teamSize} | ${p.durationMonths} months | zones: ${r.zones.join(', ')}\n`);
console.log('PILLARS (80% of weight)');
r.pillars.filter(x => r.focus.includes(x.pillar)).forEach(x => console.log(`  ${pct(x.weight)}  ${String(x.pillar).padStart(2)} ${x.name.padEnd(28)} ${x.drivers.join('; ')}`));
console.log('\nBUILD / BUY / CONFIGURE');
r.buildVsBuy.slice(0, 10).forEach(b => console.log(`  ${b.verdict.padEnd(9)} ${b.name.padEnd(28)} buyScore ${b.buyScore}`));
console.log('\nTECHNOLOGY');
r.technology.slice(0, 8).forEach(t => console.log(`  ${t.pillarName} / ${t.focusArea}: ${t.candidates.map(c => `${c.name} (${c.score})`).join(', ')}`));
console.log('\nTOOLS');
r.tools.slice(0, 8).forEach(t => console.log(`  ${t.pillarName} / ${t.focusArea}: ${t.candidates.map(c => `${c.name} (${c.score})`).join(', ')}`));
console.log('\nRESOURCES (FTE)');
r.resources.slice(0, 12).forEach(x => console.log(`  ${String(x.fte).padStart(5)}  ${x.role.padEnd(28)} ${x.sourcing}`));
const c = r.cost.totalGBP;
console.log(`\nCOST  £${c.low.toLocaleString()} – £${c.high.toLocaleString()} (expected £${c.expected.toLocaleString()}), ${r.cost.currency}, ${r.cost.durationMonths} months${r.cost.budget ? `, budget utilisation ${r.cost.budget.utilisation}` : ''}`);
console.log(`      ${r.cost.caveat}`);
console.log('\nREPORTS TO GENERATE');
r.reports.slice(0, 6).forEach(x => console.log(`  ${x.name.padEnd(34)} ${x.family}`));
console.log('');
