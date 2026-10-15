import { parse } from "@babel/parser";
import type * as t from "@babel/types";
import type { SecureTransformsOptions } from "../../types";

export const DANGEROUS_CLOBBER_PROPS = new Set([
  "submit",
  "action",
  "reset",
  "elements",
  "length",
  "item",
  "nameditem",
  "nodename",
  "attributes",
  "parentnode",
  "ownerdocument",
  "removechild",
  "appendchild",
  "replacechild",
  "insertbefore",
  "style",
  "constructor",
  "__proto__",
  "prototype",
  "valueof",
  "tostring"
]);

export function isClobberShieldActive(security?: boolean | SecureTransformsOptions): boolean {
  if (!security) return false;
  if (typeof security === "boolean") return security;
  return security.clobberShield !== false;
}

export function isClobberAttribute(attrName: string): boolean {
  const lower = attrName.toLowerCase();
  return lower === "id" || lower === "name";
}

export function isDangerousClobberName(name: string): boolean {
  return DANGEROUS_CLOBBER_PROPS.has(name.toLowerCase());
}

export function assertSafeClobberStatic(attrName: string, value: string): void {
  if (isDangerousClobberName(value)) {
    throw new Error(
      `[visage:security] Blocked dangerous DOM clobbering property "${value}" in attribute "${attrName}".`
    );
  }
}

const SAFE_NAME_CODE = `
const _safeName = (n) => {
  const s = String(typeof n === "function" ? n() : n ?? "");
  return /^(?:submit|action|reset|elements|length|item|namedItem|nodeName|attributes|parentNode|ownerDocument|removeChild|appendChild|replaceChild|insertBefore|style|constructor|__proto__|prototype|valueOf|toString)$/i.test(s) ? "_" + s : n;
};
`;

export const SAFE_NAME_HELPER_AST = parse(SAFE_NAME_CODE, {
  sourceType: "module"
}).program.body[0] as t.VariableDeclaration;
