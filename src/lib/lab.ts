import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  ID_RE, LabError, SCHEMA_DEF, SYSTEM_KEYS, normalize, slugify, validateDef,
  type CollectionDef, type LabRecord,
} from "./lab-schema.ts";

/**
 * The lab store: one JSON file per collection in lab/ (override with LAB_DIR), each `{ "records": [...] }`.
 * The files are meant to be committed, so git is the history of how a pattern improved. Writes are atomic
 * (temp file + rename) and serialised through an in-process lock; like lib/users it suits one server process.
 * lab/schema.json holds the collection definitions; see lab-schema.ts.
 */

const dir = () => process.env.LAB_DIR || path.join(process.cwd(), "lab");
const fileOf = (collection: string) => path.join(dir(), `${collection}.json`);

const g = globalThis as unknown as { __newtonLabLock?: Promise<unknown> };
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = (g.__newtonLabLock ?? Promise.resolve()).then(fn, fn);
  g.__newtonLabLock = run.catch(() => undefined);
  return run;
}

async function readFile(collection: string): Promise<LabRecord[]> {
  let raw: string;
  try {
    raw = await fs.readFile(fileOf(collection), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  // A corrupt file must stop the app, not be overwritten with an empty list.
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.records)) throw new Error(`${fileOf(collection)} is not a valid lab file`);
  return parsed.records as LabRecord[];
}

async function writeFile(collection: string, records: LabRecord[]) {
  const dest = fileOf(collection);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ records }, null, 2) + "\n");
  await fs.rename(tmp, dest);
}

/** Collection definitions in file order, then the built-in schema collection last. */
async function defs(): Promise<CollectionDef[]> {
  const stored = (await readFile("schema")).map((r) => validateDef({ ...r }));
  return [...stored, SCHEMA_DEF];
}

async function defOf(collection: string): Promise<CollectionDef> {
  const d = (await defs()).find((x) => x.id === collection);
  if (!d) throw new LabError(`There is no collection "${collection}".`);
  return d;
}

/** Schema records are stored as `{id, label, description, icon, titleKey, fields}` like any other record. */
const records = (collection: string) => readFile(collection);

export const listCollections = () => withLock(defs);
export const getCollection = (collection: string) => withLock(async () => (await defs()).find((d) => d.id === collection) ?? null);
export const listRecords = (collection: string) => withLock(async () => { await defOf(collection); return records(collection); });
export const getRecord = (collection: string, id: string) =>
  withLock(async () => { await defOf(collection); return (await records(collection)).find((r) => r.id === id) ?? null; });

/** Where a record is used: every ref/refs field in any collection that points at it. */
async function usages(all: CollectionDef[], collection: string, id: string) {
  const out: { collection: string; id: string; field: string }[] = [];
  for (const d of all) {
    const refFields = d.fields.filter((f) => (f.type === "ref" || f.type === "refs") && f.ref === collection);
    if (!refFields.length) continue;
    for (const r of await records(d.id)) {
      for (const f of refFields) {
        const v = r[f.key];
        if (v === id || (Array.isArray(v) && v.includes(id))) out.push({ collection: d.id, id: r.id, field: f.key });
      }
    }
  }
  return out;
}
export const referencedBy = (collection: string, id: string) => withLock(async () => usages(await defs(), collection, id));

/** Every ref/refs value must name a record that exists. */
async function checkRefs(
  def: CollectionDef, fields: Record<string, unknown>, all: CollectionDef[],
  idsOf: (collection: string) => Promise<Set<string>> = async (c) => new Set((await records(c)).map((r) => r.id)),
) {
  for (const f of def.fields) {
    const v = fields[f.key];
    if (v === undefined || (f.type !== "ref" && f.type !== "refs")) continue;
    const target = f.ref!;
    if (!all.some((d) => d.id === target)) throw new LabError(`${f.label}: collection "${target}" does not exist.`);
    const have = await idsOf(target);
    for (const id of f.type === "ref" ? [v as string] : (v as string[])) {
      if (!have.has(id)) throw new LabError(`${f.label}: "${id}" is not in ${target}.`);
    }
  }
}

/** Create (no `id`) or update (with `id`) a record. Input is validated against the collection's definition. */
export const saveRecord = (collection: string, input: Record<string, unknown>, id?: string) =>
  withLock(async () => {
    const all = await defs();
    const def = all.find((d) => d.id === collection);
    if (!def) throw new LabError(`There is no collection "${collection}".`);
    const existing = await records(collection);
    const current = id ? existing.find((r) => r.id === id) : undefined;
    if (id && !current) throw new LabError("That record no longer exists.");

    const legacy = current ? Object.keys(current).filter((k) => !SYSTEM_KEYS.includes(k)) : [];
    // A raw-JSON edit replaces the record, so fields it leaves out are dropped; a form always sends every field.
    const fields = normalize(def, input, legacy);
    await checkRefs(def, fields, all);

    const now = new Date().toISOString();
    let rec: LabRecord;
    if (current) {
      rec = { id: current.id, createdAt: current.createdAt, updatedAt: now, rev: (current.rev ?? 1) + 1, ...fields };
    } else {
      const wanted = typeof input.id === "string" && input.id ? input.id : slugify(String(fields[def.titleKey] ?? ""));
      if (!wanted) throw new LabError("Give the record a name so it can get an id.");
      if (!ID_RE.test(wanted)) throw new LabError("Id must be lowercase letters, digits and dashes.");
      let newId = wanted;
      if (typeof input.id === "string" && input.id) {
        if (existing.some((r) => r.id === newId)) throw new LabError(`Id "${newId}" is already used.`);
      } else {
        for (let n = 2; existing.some((r) => r.id === newId); n++) newId = `${wanted}-${n}`;
      }
      rec = { id: newId, createdAt: now, updatedAt: now, rev: 1, ...fields };
    }
    // A bad definition would break every read of the lab, so check it as the final record before it is written.
    if (collection === "schema") Object.assign(rec, validateDef({ ...rec }));
    await writeFile(collection, current ? existing.map((r) => (r.id === rec.id ? rec : r)) : [...existing, rec]);
    return rec;
  });

export const deleteRecord = (collection: string, id: string) =>
  withLock(async () => {
    const all = await defs();
    if (!all.some((d) => d.id === collection)) throw new LabError(`There is no collection "${collection}".`);
    const existing = await records(collection);
    if (!existing.some((r) => r.id === id)) throw new LabError("That record no longer exists.");
    const used = await usages(all, collection, id);
    if (used.length) {
      const names = used.slice(0, 3).map((u) => `${u.collection}/${u.id}`).join(", ");
      throw new LabError(`Still referenced by ${used.length} record${used.length === 1 ? "" : "s"} (${names}${used.length > 3 ? ", …" : ""}). Remove those links first.`);
    }
    if (collection === "schema" && (await records(id)).length)
      throw new LabError("That collection still has records. Delete them first.");
    await writeFile(collection, existing.filter((r) => r.id !== id));
  });

/** The whole lab as one JSON document: what you carry to the live platform. */
export const exportLab = () =>
  withLock(async () => {
    const all = await defs();
    const data: Record<string, LabRecord[]> = {};
    for (const d of all) data[d.id] = await records(d.id);
    return { exportedAt: new Date().toISOString(), version: 1, collections: data };
  });

export type ImportSummary = Record<string, { created: number; updated: number }>;

/**
 * Merges an export (see exportLab) into the lab: records are matched by id, new ones are added, existing
 * ones are replaced and their revision bumped. Nothing is removed. Everything is checked against the merged
 * schema and links before anything is written, so a bad file changes nothing. `dryRun` checks and reports only.
 */
export const importLab = (doc: unknown, dryRun = false) =>
  withLock(async () => {
    const root = doc as { collections?: Record<string, unknown> } | null;
    const incoming = root?.collections;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) throw new LabError("This is not a lab export: it has no \"collections\" object.");
    for (const [c, list] of Object.entries(incoming)) if (!Array.isArray(list)) throw new LabError(`${c}: must be a list of records.`);

    const now = new Date().toISOString();
    const state = new Map<string, LabRecord[]>();
    const load = async (c: string) => { if (!state.has(c)) state.set(c, await records(c)); return state.get(c)!; };
    const changed = new Set<string>();
    const summary: ImportSummary = {};
    const imported: { def: CollectionDef; fields: Record<string, unknown>; at: string }[] = [];

    // upsert returns the stored record; `legacy` lets an updated record keep fields the schema no longer lists.
    const upsert = async (def: CollectionDef, raw: unknown, where: string) => {
      const r = raw as Record<string, unknown> | null;
      if (!r || typeof r !== "object" || Array.isArray(r)) throw new LabError(`${where}: must be an object.`);
      const id = r.id;
      if (typeof id !== "string" || !ID_RE.test(id)) throw new LabError(`${where}: missing or invalid id.`);
      const list = await load(def.id);
      const current = list.find((x) => x.id === id);
      let fields: Record<string, unknown>;
      try {
        fields = normalize(def, r, current ? Object.keys(current).filter((k) => !SYSTEM_KEYS.includes(k)) : []);
      } catch (e) {
        if (e instanceof LabError) throw new LabError(`${where}: ${e.message}`);
        throw e;
      }
      const rec: LabRecord = current
        ? { id, createdAt: current.createdAt, updatedAt: now, rev: (current.rev ?? 1) + 1, ...fields }
        : { id, createdAt: typeof r.createdAt === "string" ? r.createdAt : now, updatedAt: now, rev: 1, ...fields };
      state.set(def.id, current ? list.map((x) => (x.id === id ? rec : x)) : [...list, rec]);
      changed.add(def.id);
      const s = (summary[def.id] ??= { created: 0, updated: 0 });
      if (current) s.updated++; else s.created++;
      return { rec, fields };
    };

    // Schema first: the incoming definitions decide what the other collections may hold.
    for (const [i, raw] of ((incoming.schema as unknown[]) ?? []).entries()) {
      const { rec } = await upsert(SCHEMA_DEF, raw, `schema[${i}]`);
      try { Object.assign(rec, validateDef({ ...rec })); } catch (e) {
        if (e instanceof LabError) throw new LabError(`schema[${i}]: ${e.message}`);
        throw e;
      }
    }
    const all = [...(await load("schema")).map((r) => validateDef({ ...r })), SCHEMA_DEF];
    for (const [c, list] of Object.entries(incoming)) {
      if (c === "schema") continue;
      const def = all.find((d) => d.id === c);
      if (!def) throw new LabError(`${c}: no such collection. Include its definition under "schema".`);
      for (const [i, raw] of (list as unknown[]).entries()) {
        const { fields } = await upsert(def, raw, `${c}[${i}]`);
        imported.push({ def, fields, at: `${c}[${i}]` });
      }
    }
    for (const c of changed) await load(c);
    const ids = new Map([...state].map(([c, list]) => [c, new Set(list.map((r) => r.id))]));
    for (const { def, fields, at } of imported) {
      try { await checkRefs(def, fields, all, async (c) => ids.get(c) ?? new Set((await records(c)).map((r) => r.id))); } catch (e) {
        if (e instanceof LabError) throw new LabError(`${at}: ${e.message}`);
        throw e;
      }
    }
    if (!dryRun) for (const c of changed) await writeFile(c, state.get(c)!);
    return summary;
  });
