export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => any)
  | ClassValue[]
  | Record<string, any>;

/**
 * Check if a class value tree contains any reactive signal or function getters
 */
export function hasReactiveClass(val: any): boolean {
  if (typeof val === "function") return true;
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      if (hasReactiveClass(val[i])) return true;
    }
    return false;
  }
  if (typeof val === "object" && val !== null) {
    for (const k in val) {
      if (typeof val[k] === "function") return true;
    }
  }
  return false;
}

/**
 * Normalize dynamic classes from strings, numbers, arrays, and objects
 */
export function normalizeClass(val: any): string {
  if (!val) return "";
  if (typeof val === "function") return normalizeClass(val());
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return String(val);

  if (Array.isArray(val)) {
    let res = "";
    for (let i = 0; i < val.length; i++) {
      const item = typeof val[i] === "function" ? val[i]() : val[i];
      const itemStr = normalizeClass(item);
      if (itemStr) {
        res = res ? `${res} ${itemStr}` : itemStr;
      }
    }
    return res;
  }

  if (typeof val === "object") {
    let res = "";
    for (const key in val) {
      const condition = typeof val[key] === "function" ? val[key]() : val[key];
      if (condition) {
        res = res ? `${res} ${key}` : key;
      }
    }
    return res;
  }

  return "";
}

/**
 * Flexible classnames utility for combining conditional classes
 *
 * Example:
 * ```ts
 * cx("btn", { active: isActive(), disabled: !isEnabled() }, ["extra-1", extraClass])
 * ```
 */
export function cx(...args: ClassValue[]): string {
  return normalizeClass(args);
}
