import type { QueryFilters } from "./types";

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Deterministic JSON stringifier for consistent query key hashing
 */
export function hashKey(queryKey: unknown): string {
  return JSON.stringify(queryKey, (_key, val) => {
    if (isPlainObject(val)) {
      return Object.keys(val)
        .sort()
        .reduce((result: Record<string, unknown>, k) => {
          result[k] = val[k];
          return result;
        }, {});
    }
    return val;
  });
}

/**
 * Deep equality check for primitives, arrays, and objects
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.hasOwn(b, key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Partial matching check: matches if `a` is a subset or partial structure of `b`
 */
export function partialDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === undefined || a === null || b === undefined || b === null) {
    return a === b;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length > b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!partialDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    for (const key of Object.keys(a)) {
      if (!(key in b)) return false;
      if (!partialDeepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

export function matchQuery(filters: QueryFilters | undefined, query: any): boolean {
  if (!filters) return true;

  if (filters.queryKey !== undefined) {
    const filterKey = Array.isArray(filters.queryKey) ? filters.queryKey : [filters.queryKey];
    const queryKey = Array.isArray(query.queryKey) ? query.queryKey : [query.queryKey];

    if (filters.exact) {
      if (filterKey.length !== queryKey.length) return false;
      if (!deepEqual(filterKey, queryKey)) return false;
    } else {
      if (filterKey.length > queryKey.length) return false;
      for (let i = 0; i < filterKey.length; i++) {
        if (!partialDeepEqual(filterKey[i], queryKey[i])) {
          return false;
        }
      }
    }
  }

  if (filters.type === "active" && query.observers.size === 0) {
    return false;
  }
  if (filters.type === "inactive" && query.observers.size > 0) {
    return false;
  }

  if (filters.stale !== undefined && query.isStale() !== filters.stale) {
    return false;
  }

  if (filters.fetchStatus !== undefined && query.fetchStatus() !== filters.fetchStatus) {
    return false;
  }

  if (filters.predicate && !filters.predicate(query)) {
    return false;
  }

  return true;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
