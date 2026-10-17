// Rebuilds data/*.json from the two source artefacts:
//   node scripts/extract.mjs <map.html> <use-cases.xlsx>
// The map HTML is the published "Software Lifecycle Map" artifact; the xlsx is
// Software-Lifecycle-Use-Cases.xlsx. Needs the `unzip` CLI for the xlsx.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [htmlPath, xlsxPath] = process.argv.slice(2);
if (!htmlPath || !xlsxPath) { console.error('usage: extract.mjs <map.html> <use-cases.xlsx>'); process.exit(1); }
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

// ── map ────────────────────────────────────────────────────────────────────
const html = fs.readFileSync(htmlPath, 'utf8');
const a = html.indexOf('const PILLARS='), b = html.indexOf('const ZB=');
if (a < 0 || b < 0) throw new Error('map data block not found in HTML');
const ctx = vm.createContext({});
vm.runInContext(html.slice(a, b).replace(/\bconst\b/g, 'var'), ctx);
const { PILLARS, LINES, RAW, GATES, REPORTS } = ctx;

const stations = [];
for (const [line, rows] of Object.entries(RAW)) for (const r of rows) {
  stations.push({ id: r[0], line, x: r[1], name: r[2], scale: r[3], ai: !!r[4], pillar: r[5],
    owner: r[6], inputs: r[7].split('|'), outputs: r[8].split('|') });
}
const zoneBounds = [5.5, 11.5, 17.5, 25.5, 30.5, 37.5];
const zoneOf = x => zoneBounds.findIndex(z => x < z) + 1 || 7;
stations.forEach(s => { s.zone = zoneOf(s.x); });
const gates = GATES.map(g => ({ id: g.id, x: g.x, zone: zoneOf(g.x), name: g.name, lines: g.lines,
  inputs: g.ins, outputs: g.outs, failure: g.fail }));
const reports = REPORTS.map(r => ({ id: r.id, family: r.fam, name: r.name, description: r.desc, stops: r.stops }));
const lines = LINES.map(l => ({ id: l.id, name: l.name, row: l.row }));
fs.writeFileSync(path.join(out, 'lifecycle-map.json'), JSON.stringify(
  { zones: ['Discover', 'Define', 'Design', 'Build', 'Release', 'Operate', 'Retire'],
    pillars: PILLARS, lines, stations, gates, reports }, null, 1));
console.log(`map: ${PILLARS.length} pillars, ${lines.length} lines, ${stations.length} stations, ${gates.length} gates, ${reports.length} reports`);

// ── use cases ──────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-'));
execFileSync('unzip', ['-o', '-q', xlsxPath, '-d', tmp]);
const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const sst = [...fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<si>(.*?)<\/si>/gs)]
  .map(m => dec([...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map(t => t[1]).join('')));
const wbRels = fs.readFileSync(path.join(tmp, 'xl/workbook.xml'), 'utf8');
const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets/sheet2.xml'), 'utf8'); // "Use Cases"
if (!/name="Use Cases" sheetId="2"/.test(wbRels)) throw new Error('sheet2 is not "Use Cases"');
const rows = [...sheet.matchAll(/<row [^>]*>(.*?)<\/row>/gs)].map(r => {
  const cells = {};
  for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
    const v = c[3] && c[3].match(/<v>(.*?)<\/v>/s);
    if (!v) continue;
    cells[c[1]] = /t="s"/.test(c[2]) ? sst[+v[1]] : dec(v[1]);
  }
  return cells;
});
const head = rows[0];
const cols = Object.keys(head);
const useCases = rows.slice(1).filter(r => r[cols[0]]).map(r => Object.fromEntries(cols.map(c => [head[c], r[c] ?? ''])));
fs.writeFileSync(path.join(out, 'use-cases.json'), JSON.stringify({ columns: cols.map(c => head[c]), useCases }, null, 1));
console.log(`use cases: ${useCases.length}; columns: ${cols.map(c => head[c]).join(' | ')}`);
fs.rmSync(tmp, { recursive: true });
