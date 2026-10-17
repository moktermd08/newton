/**
 * Failure throttle: 5 failures per key in 15 minutes. In memory and per server process, so it resets on
 * restart and does not span instances; put a shared store behind it before running more than one.
 */
const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES = 5;

// Shared across Next's separate server bundles via globalThis.
const g = globalThis as unknown as { __newtonThrottle?: Map<string, number[]> };
const store = (g.__newtonThrottle ??= new Map<string, number[]>());

function recent(key: string, now: number) {
  const list = (store.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  store.set(key, list);
  return list;
}

export const isLockedOut = (key: string, now = Date.now()) => recent(key, now).length >= MAX_FAILURES;
export const recordFailure = (key: string, now = Date.now()) => { store.set(key, [...recent(key, now), now]); };
export const clearFailures = (key: string) => { store.delete(key); };
