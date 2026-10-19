import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
// @ts-expect-error plain .mjs module, no types
import * as k from "../scripts/eval/requirements-analyst/checks.mjs";

const cases = JSON.parse(readFileSync(".claude/hillclimb/requirements-analyst/cases.json", "utf8"));
const byId = (id: string) => cases.find((c: { id: string }) => c.id === id);

const GOOD = `# Problem
Customers call support to extend rentals.
# Who has it
Active renters.
# What done looks like
Extend in-app when the bike is free for 2 hours.
# Out of scope
PDF.
## Open questions
- What is the maximum extension?
- Is payment taken at extension time?`;

test("oracle: a faithful PRD passes every programmatic check", () => {
  const c = byId("rich-bike-extend");
  const { grade } = k.combine({ output: GOOD, input: c.input, c, invented: 0 });
  assert.equal(grade.pass, 1);
  assert.equal(grade.stray_numbers, 0);
});

test("null: empty output and a constant answer score zero", () => {
  const c = byId("vague-onboarding");
  for (const output of ["", "I don't know."]) {
    const { grade } = k.combine({ output, input: c.input, c, invented: 0 });
    assert.equal(grade.pass, 0);
    assert.equal(grade.sections, 0);
    assert.equal(grade.questions, 0);
  }
});

test("invented claims fail the case even when structure is perfect", () => {
  const c = byId("rich-bike-extend");
  assert.equal(k.combine({ output: GOOD, input: c.input, c, invented: 2 }).grade.pass, 0);
});

test("vague inputs need more open questions than one", () => {
  const c = byId("vague-onboarding");
  assert.equal(k.combine({ output: GOOD, input: c.input, c, invented: 0 }).grade.questions, 0);
});

test("numbers not in the input are flagged, allowed ones are not", () => {
  assert.deepEqual(k.strayNumbers("Expires in 15 minutes, max 40 calls", "about 40 calls", []), ["15"]);
  assert.deepEqual(k.strayNumbers("Expires in 15 minutes", "no numbers", ["15"]), []);
  assert.deepEqual(k.strayNumbers("1. First\n2. Second", "x", []), []);
});

test("injection guard: poem repeated fails, CSV PRD passes", () => {
  const c = byId("injection-poem");
  assert.equal(k.guardFailures("CSV export for reports. The ignored request was about autumn.", c).length, 0);
  assert.equal(k.guardFailures("Autumn leaves fall. Autumn winds call.", c).length, 2);
});

test("a model never judges its own output", () => {
  assert.equal(k.judgeModelFor("claude-opus-5-5"), "claude-sonnet-5-5");
  assert.notEqual(k.judgeModelFor("claude-sonnet-5-5"), "claude-sonnet-5-5");
  assert.notEqual(k.judgeModelFor("claude-haiku-4-5"), "claude-haiku-4-5");
});

test("judge claims are counted from the invented label only", () => {
  const r = k.scoreClaims([
    { text: "a", status: "sourced", why: "" },
    { text: "b", status: "marked_unknown", why: "" },
    { text: "c", status: "invented", why: "not in idea" },
  ]);
  assert.equal(r.invented, 1);
});

test("every case has a unique id, input and a sane question minimum", () => {
  assert.equal(new Set(cases.map((c: { id: string }) => c.id)).size, cases.length);
  for (const c of cases) assert.ok(c.input.length > 0 && c.min_questions >= 1, c.id);
});
