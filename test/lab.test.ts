import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as lab from "../src/lib/lab.ts";
import { LabError } from "../src/lib/lab-schema.ts";

/** Each test works on a copy of the shipped seed, so the seed itself is checked too. */
const fresh = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "newton-lab-"));
  cpSync(path.join(import.meta.dirname, "..", "lab"), dir, { recursive: true });
  process.env.LAB_DIR = dir;
  return dir;
};
const rejects = (p: Promise<unknown>, re: RegExp) => assert.rejects(p, (e) => e instanceof LabError && re.test(e.message));

test("the shipped seed loads: nine collections in order, schema last", async () => {
  fresh();
  const ids = (await lab.listCollections()).map((d) => d.id);
  assert.deepEqual(ids, ["functions", "patterns", "journeys", "templates", "configuration", "feedback", "agents", "data", "schema"]);
  assert.equal((await lab.listRecords("schema")).length, 8);
});

test("create gives an id from the name, rev 1; a clash gets a suffix", async () => {
  fresh();
  const a = await lab.saveRecord("functions", { name: "Load testing", zone: "Build" });
  assert.equal(a.id, "load-testing");
  assert.equal(a.rev, 1);
  const b = await lab.saveRecord("functions", { name: "Load testing", zone: "Build" });
  assert.equal(b.id, "load-testing-2");
});

test("update bumps rev and keeps createdAt; form-style strings are coerced", async () => {
  fresh();
  const before = (await lab.getRecord("patterns", "lightweight-prd"))!;
  const after = await lab.saveRecord("patterns", { name: "Lightweight PRD", status: "proven", problem: "p", confidence: "85", tags: "a, b ,a" }, "lightweight-prd");
  assert.equal(after.rev, before.rev + 1);
  assert.equal(after.createdAt, before.createdAt);
  assert.equal(after.confidence, 85);
  assert.deepEqual(after.tags, ["a", "b"]);
});

test("validation: required, select, number, unknown field, bad reference", async () => {
  fresh();
  await rejects(lab.saveRecord("functions", { zone: "Build" }), /Name is required/);
  await rejects(lab.saveRecord("functions", { name: "x", zone: "Nowhere" }), /Zone: must be one of/);
  await rejects(lab.saveRecord("patterns", { name: "x", status: "idea", problem: "p", confidence: "lots" }), /must be a number/);
  await rejects(lab.saveRecord("functions", { name: "x", zone: "Build", colour: "red" }), /Unknown field "colour"/);
  await rejects(lab.saveRecord("patterns", { name: "x", status: "idea", problem: "p", functions: ["ghost"] }), /"ghost" is not in functions/);
});

test("a record that is referenced cannot be deleted, and referencedBy says who uses it", async () => {
  fresh();
  assert.ok((await lab.referencedBy("functions", "requirements-capture")).some((u) => u.collection === "patterns" && u.id === "lightweight-prd"));
  await rejects(lab.deleteRecord("functions", "requirements-capture"), /Still referenced/);
  const free = await lab.saveRecord("functions", { name: "Spare", zone: "Retire" });
  await lab.deleteRecord("functions", free.id);
  assert.equal(await lab.getRecord("functions", free.id), null);
});

test("evolving the schema: a new field is accepted after it is added, and a new collection appears", async () => {
  const dir = fresh();
  const fn = (await lab.getRecord("schema", "functions"))!;
  await rejects(lab.saveRecord("functions", { name: "x", zone: "Build", cost: 5 }), /Unknown field "cost"/);
  await lab.saveRecord("schema", { ...fn, fields: [...(fn.fields as object[]), { key: "cost", label: "Cost", type: "number" }] }, "functions");
  assert.equal((await lab.saveRecord("functions", { name: "x", zone: "Build", cost: 5 })).cost, 5);

  await lab.saveRecord("schema", { label: "Metrics", fields: [{ key: "name", label: "Name", type: "text", required: true }] });
  assert.ok((await lab.listCollections()).some((d) => d.id === "metrics"));
  await lab.saveRecord("metrics", { name: "Lead time" });
  await rejects(lab.deleteRecord("schema", "metrics"), /still has records/);
  assert.ok(readFileSync(path.join(dir, "metrics.json"), "utf8").includes("lead-time"));
});

test("a bad schema definition is refused and does not break the lab", async () => {
  fresh();
  await rejects(lab.saveRecord("schema", { label: "Bad", fields: [{ key: "a", label: "A", type: "wat" }] }), /type must be one of/);
  await rejects(lab.saveRecord("schema", { label: "9 lives", fields: [{ key: "name", label: "N", type: "text" }] }), /Collection id/);
  assert.equal((await lab.listCollections()).length, 9);
});

test("export holds every collection", async () => {
  fresh();
  const out = await lab.exportLab();
  assert.equal(Object.keys(out.collections).length, 9);
  assert.ok(out.collections.patterns.length >= 3);
});

test("import merges by id, bumps rev on existing, adds new, and survives a round trip", async () => {
  fresh();
  const out = await lab.exportLab();
  const before = (await lab.getRecord("patterns", "lightweight-prd"))!;
  out.collections.patterns[0] = { ...out.collections.patterns[0], confidence: 90 };
  out.collections.functions.push({ id: "chaos-testing", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "x", rev: 1, name: "Chaos testing", zone: "Operate" });
  const summary = await lab.importLab(out);
  assert.deepEqual(summary.functions, { created: 1, updated: 6 });
  assert.equal(summary.patterns.updated, 3);
  const after = (await lab.getRecord("patterns", "lightweight-prd"))!;
  assert.equal(after.confidence, 90);
  assert.equal(after.rev, before.rev + 1);
  assert.equal((await lab.getRecord("functions", "chaos-testing"))!.createdAt, "2026-01-01T00:00:00.000Z");
});

test("import is all or nothing: a bad record, unknown collection or dangling link writes nothing", async () => {
  fresh();
  const good = { id: "ok-one", name: "Fine", zone: "Build" };
  const bad = (collections: Record<string, unknown[]>) => lab.importLab({ collections });
  await rejects(bad({ functions: [good, { id: "bad-one", name: "Bad", zone: "Moon" }] }), /functions\[1\]: Zone: must be one of/);
  await rejects(bad({ nope: [good] }), /nope: no such collection/);
  await rejects(bad({ patterns: [{ id: "p2", name: "P", status: "idea", problem: "x", functions: ["ghost"] }] }), /patterns\[0\]: Functions: "ghost" is not in functions/);
  await rejects(lab.importLab({ nothing: true }), /not a lab export/);
  assert.equal(await lab.getRecord("functions", "ok-one"), null);
  assert.equal((await lab.listRecords("patterns")).length, 3);
});

test("import can bring a new collection with its records, and dry run writes nothing", async () => {
  fresh();
  const doc = { collections: {
    schema: [{ id: "metrics", label: "Metrics", fields: [{ key: "name", label: "Name", type: "text", required: true }] }],
    metrics: [{ id: "lead-time", name: "Lead time" }],
  } };
  assert.deepEqual(await lab.importLab(doc, true), { schema: { created: 1, updated: 0 }, metrics: { created: 1, updated: 0 } });
  assert.equal((await lab.listCollections()).length, 9);
  await lab.importLab(doc);
  assert.equal((await lab.listRecords("metrics")).length, 1);
});

test("a json field can hold a plain string or a number, not only objects", async () => {
  fresh();
  const rec = await lab.saveRecord("configuration", { name: "region", scope: "global", value: "eu-west-1" });
  assert.equal(rec.value, "eu-west-1");
  assert.equal((await lab.saveRecord("configuration", { name: "region", scope: "global", value: 0 }, rec.id)).value, 0);
});
