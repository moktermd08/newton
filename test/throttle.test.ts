import test from "node:test";
import assert from "node:assert/strict";
import { MAX_FAILURES, clearFailures, isLockedOut, recordFailure } from "../src/lib/throttle.ts";

const T = Date.UTC(2026, 0, 1);

test("locks after the maximum failures and unlocks after the window", () => {
  const k = "t1";
  for (let i = 0; i < MAX_FAILURES - 1; i++) recordFailure(k, T + i);
  assert.equal(isLockedOut(k, T + 10), false);
  recordFailure(k, T + 10);
  assert.equal(isLockedOut(k, T + 11), true);
  assert.equal(isLockedOut(k, T + 15 * 60 * 1000 + 100), false, "old failures age out");
});

test("keys are independent and success clears the count", () => {
  for (let i = 0; i < MAX_FAILURES; i++) recordFailure("a", T);
  assert.equal(isLockedOut("a", T), true);
  assert.equal(isLockedOut("b", T), false);
  clearFailures("a");
  assert.equal(isLockedOut("a", T), false);
});
