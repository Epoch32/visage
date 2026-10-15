import type { SecureTransformsOptions } from "../../types";

/**
 * Checks if the event handler security transform is active
 */
export function isEventShieldActive(security?: boolean | SecureTransformsOptions): boolean {
  if (!security) return false;
  if (typeof security === "boolean") return security;
  return security.eventShield !== false;
}

/**
 * Throws a compile-time error when an event handler receives a string literal
 */
export function assertSafeEventValue(attrName: string, value: string): void {
  throw new Error(
    `[visage:security] Blocked string literal event handler in attribute "${attrName}" ("${value}"). Event handlers must be functions.`
  );
}
