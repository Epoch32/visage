import { parse } from "@babel/parser";
import type * as t from "@babel/types";
import type { SecureTransformsOptions } from "../../types";

export function isSpreadSanitizerActive(security?: boolean | SecureTransformsOptions): boolean {
  if (!security) return false;
  if (typeof security === "boolean") return security;
  return security.spreadSanitizer !== false;
}

const CLEAN_SPREAD_CODE = `
const _cleanSpread = (p) => {
  if (!p || typeof p !== "object") return p;
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    if (/^(?:__proto__|constructor|prototype)$/.test(k)) continue;
    if (/^(?:innerHTML|dangerouslySetInnerHTML)$/.test(k)) continue;
    if (/^(?:href|src|action|formaction|cite|poster)$/i.test(k)) {
      out[k] = typeof _safeUrl === "function" ? _safeUrl(v) : v;
    } else if (/^(?:id|name)$/i.test(k)) {
      out[k] = typeof _safeName === "function" ? _safeName(v) : v;
    } else {
      out[k] = v;
    }
  }
  return out;
};
`;

export const CLEAN_SPREAD_HELPER_AST = parse(CLEAN_SPREAD_CODE, {
  sourceType: "module"
}).program.body[0] as t.VariableDeclaration;
