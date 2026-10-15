import { parse } from "@babel/parser";
import type * as t from "@babel/types";
import type { SecureTransformsOptions } from "../../types";

/**
 * Dangerous URI protocols that trigger client-side script execution
 */
export const DANGEROUS_PROTOCOL_REGEX =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Control characters are filtered to prevent protocol evasion
  /^(?:\s*|[\u0000-\u001F\u007F-\u009F])*(?:(?:javascript|vbscript):|data\s*:\s*(?:text\/(?:html|javascript|ecmascript)|application\/(?:javascript|ecmascript))(?:\s*|;|,))/i;

export const URL_ATTRIBUTES = new Set(["href", "src", "action", "formaction", "cite", "poster"]);

export function isUrlAttribute(attrName: string): boolean {
  return URL_ATTRIBUTES.has(attrName.toLowerCase());
}

export function isDangerousProtocol(url: string): boolean {
  return DANGEROUS_PROTOCOL_REGEX.test(url);
}

export function isUrlShieldActive(security?: boolean | SecureTransformsOptions): boolean {
  if (!security) return false;
  if (typeof security === "boolean") return security;
  return security.urlShield !== false;
}

export function assertSafeStaticUrl(attrName: string, url: string): void {
  if (isDangerousProtocol(url)) {
    throw new Error(
      `[visage:security] Blocked dangerous URI protocol "${url}" in attribute "${attrName}".`
    );
  }
}

const SAFE_URL_CODE = String.raw`
const _safeUrl = (u) =>
  /^(?:\s*|[\u0000-\u001F\u007F-\u009F])*(?:(?:javascript|vbscript):|data\s*:\s*(?:text\/(?:html|javascript|ecmascript)|application\/(?:javascript|ecmascript))(?:\s*|;|,))/i.test(
    String(typeof u === "function" ? u() : u ?? "")
  )
    ? "about:blank"
    : u;
`;

export const SAFE_URL_HELPER_AST = parse(SAFE_URL_CODE, {
  sourceType: "module"
}).program.body[0] as t.VariableDeclaration;
