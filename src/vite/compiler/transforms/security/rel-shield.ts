import type { SecureTransformsOptions } from "../../types";

/**
 * Checks if the rel shield security transform is active
 */
export function isRelShieldActive(security?: boolean | SecureTransformsOptions): boolean {
  if (!security) return false;
  if (typeof security === "boolean") return security;
  return security.relShield !== false;
}

/**
 * Normalizes rel tokens to guarantee noopener and noreferrer for target="_blank"
 */
export function normalizeRel(existingRel?: string): string {
  const tokens = new Set((existingRel || "").trim().split(/\s+/).filter(Boolean));
  tokens.add("noopener");
  tokens.add("noreferrer");
  return Array.from(tokens).join(" ");
}
