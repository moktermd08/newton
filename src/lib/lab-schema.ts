/**
 * The lab's data model. Every collection is described by a CollectionDef that itself lives in the
 * "schema" collection (lab/schema.json), so the model can be reshaped without code changes.
 * This file is pure: no I/O, so it can be tested and imported anywhere.
 */

export const FIELD_TYPES = ["text", "longtext", "number", "boolean", "select", "tags", "ref", "refs", "json"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  /** select only */
  options?: string[];
  /** ref / refs only: the collection id the value points into */
  ref?: string;
};

export type CollectionDef = {
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Which field names a record in lists and pickers. Defaults to "name". */
  titleKey: string;
  fields: FieldDef[];
};

export type LabRecord = { id: string; createdAt: string; updatedAt: string; rev: number; [field: string]: unknown };

/** A problem the caller can show to the person who caused it. Anything else is a bug and should throw. */
export class LabError extends Error {}

export const ID_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;
export const COLLECTION_RE = /^[a-z][a-z0-9-]{0,39}$/;
export const SYSTEM_KEYS = ["id", "createdAt", "updatedAt", "rev"];

/** The one definition that is fixed in code: the schema collection describes everything else, including nothing about itself. */
export const SCHEMA_DEF: CollectionDef = {
  id: "schema",
  label: "Schema",
  description: "The shape of every collection. Add a field here, then use it in the collection's records.",
  icon: "table",
  titleKey: "label",
  fields: [
    { key: "label", label: "Label", type: "text", required: true },
    { key: "description", label: "Description", type: "longtext" },
    { key: "icon", label: "Icon", type: "text", hint: "A short key such as layers, bot, database, flask." },
    { key: "titleKey", label: "Title field", type: "text", hint: "The field that names a record. Default: name." },
    { key: "fields", label: "Fields", type: "json", required: true, hint: "Array of { key, label, type, required?, options?, ref?, hint? }." },
  ],
};

export function titleOf(def: CollectionDef, rec: LabRecord): string {
  const v = rec[def.titleKey || "name"];
  return typeof v === "string" && v.trim() ? v : rec.id;
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/** Checks the shape of a CollectionDef (as stored in lab/schema.json). Throws LabError. */
export function validateDef(raw: unknown): CollectionDef {
  const r = raw as Partial<CollectionDef> | null;
  if (!r || typeof r !== "object") throw new LabError("A collection definition must be an object.");
  if (typeof r.id !== "string" || !COLLECTION_RE.test(r.id) || r.id === "schema")
    throw new LabError("Collection id must be lowercase letters, digits and dashes, starting with a letter (and not \"schema\").");
  if (!Array.isArray(r.fields) || r.fields.length === 0) throw new LabError("Fields must be a non-empty array.");
  const seen = new Set<string>();
  const fields = r.fields.map((f: unknown, i: number): FieldDef => {
    const x = f as Partial<FieldDef> | null;
    const at = `Field ${i + 1}`;
    if (!x || typeof x !== "object") throw new LabError(`${at} must be an object.`);
    if (typeof x.key !== "string" || !/^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(x.key)) throw new LabError(`${at}: key must be letters and digits, starting with a letter.`);
    if (SYSTEM_KEYS.includes(x.key)) throw new LabError(`${at}: "${x.key}" is reserved.`);
    if (seen.has(x.key)) throw new LabError(`${at}: key "${x.key}" is used twice.`);
    seen.add(x.key);
    if (!x.type || !FIELD_TYPES.includes(x.type)) throw new LabError(`${at} (${x.key}): type must be one of ${FIELD_TYPES.join(", ")}.`);
    if (x.type === "select" && (!Array.isArray(x.options) || x.options.length === 0 || x.options.some((o) => typeof o !== "string")))
      throw new LabError(`${at} (${x.key}): a select needs a list of string options.`);
    if ((x.type === "ref" || x.type === "refs") && (typeof x.ref !== "string" || !(COLLECTION_RE.test(x.ref) || x.ref === "schema")))
      throw new LabError(`${at} (${x.key}): ${x.type} needs "ref" set to a collection id.`);
    const out: FieldDef = { key: x.key, label: typeof x.label === "string" && x.label.trim() ? x.label.trim() : x.key, type: x.type };
    if (x.required) out.required = true;
    if (typeof x.hint === "string" && x.hint) out.hint = x.hint;
    if (x.type === "select") out.options = x.options;
    if (x.type === "ref" || x.type === "refs") out.ref = x.ref;
    return out;
  });
  const titleKey = typeof r.titleKey === "string" && r.titleKey.trim() ? r.titleKey.trim() : "name";
  if (titleKey !== "id" && !seen.has(titleKey)) throw new LabError(`Title field "${titleKey}" is not one of the fields.`);
  return {
    id: r.id,
    label: typeof r.label === "string" && r.label.trim() ? r.label.trim() : r.id,
    description: typeof r.description === "string" ? r.description : "",
    icon: typeof r.icon === "string" && r.icon ? r.icon : "table",
    titleKey,
    fields,
  };
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

function coerce(f: FieldDef, v: unknown): unknown {
  const bad = (why: string) => new LabError(`${f.label}: ${why}`);
  switch (f.type) {
    case "text":
    case "longtext": {
      if (typeof v !== "string") throw bad("must be text.");
      const max = f.type === "text" ? 500 : 20000;
      if (v.length > max) throw bad(`must be at most ${max} characters.`);
      return f.type === "text" ? v.trim() : v;
    }
    case "number": {
      const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim()) : NaN;
      if (!Number.isFinite(n)) throw bad("must be a number.");
      return n;
    }
    case "boolean":
      if (typeof v === "boolean") return v;
      if (v === "on" || v === "true") return true;
      if (v === "false" || v === "off") return false;
      throw bad("must be true or false.");
    case "select":
      if (typeof v !== "string" || !f.options?.includes(v)) throw bad(`must be one of ${f.options?.join(", ")}.`);
      return v;
    case "tags":
    case "refs": {
      const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : null;
      if (!list || list.some((x) => typeof x !== "string")) throw bad("must be a list.");
      const items = [...new Set(list.map((x: string) => x.trim()).filter(Boolean))];
      if (items.length > 50 || items.some((x) => x.length > 80)) throw bad("has too many or too long entries.");
      return items;
    }
    case "ref":
      if (typeof v !== "string") throw bad("must be a record id.");
      return v.trim();
    case "json":
      return v; // already a JSON value; the form action parses what was typed
  }
}

/**
 * Turns user input (form strings or a parsed JSON object) into the schema-shaped part of a record.
 * `legacy` are keys the existing record already holds that the schema no longer lists: kept, not rejected.
 */
export function normalize(def: CollectionDef, input: Record<string, unknown>, legacy: string[] = []): Record<string, unknown> {
  const known = new Set(def.fields.map((f) => f.key));
  for (const k of Object.keys(input)) {
    if (SYSTEM_KEYS.includes(k) || known.has(k) || legacy.includes(k)) continue;
    throw new LabError(`Unknown field "${k}". Add it to the schema first.`);
  }
  const out: Record<string, unknown> = {};
  for (const k of legacy) if (!known.has(k) && k in input) out[k] = input[k];
  for (const f of def.fields) {
    const v = input[f.key];
    if (isEmpty(v)) {
      if (f.required) throw new LabError(`${f.label} is required.`);
      continue;
    }
    out[f.key] = coerce(f, v);
  }
  return out;
}
