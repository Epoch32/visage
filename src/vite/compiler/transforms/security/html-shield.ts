import { parse } from "@babel/parser";
import type * as t from "@babel/types";
import type { SecureTransformsOptions } from "../../types";

export const DANGEROUS_HTML_REGEX =
  /<(?:\/)?(?:script|iframe|object|embed|base)\b|\s+on[a-z]+\s*=|(?:\bhref|\bsrc)\s*=\s*['"]\s*(?:javascript|vbscript):/i;

export function isHtmlShieldActive(security?: boolean | SecureTransformsOptions): boolean {
  if (!security) return false;
  if (typeof security === "boolean") return security;
  return security.htmlShield !== false;
}

export function isHtmlAttribute(attrName: string): boolean {
  return attrName === "innerHTML" || attrName === "dangerouslySetInnerHTML";
}

export function isDangerousHtml(html: string): boolean {
  return DANGEROUS_HTML_REGEX.test(html);
}

export function assertSafeHtmlStatic(attrName: string, html: string): void {
  if (isDangerousHtml(html)) {
    throw new Error(
      `[visage:security] Blocked dangerous HTML injection in attribute "${attrName}". Content contains executable scripts or event handlers.`
    );
  }
}

const SAFE_HTML_CODE = String.raw`
const _safeHtml = (h) => {
  const raw = typeof h === "object" && h !== null && "__html" in h ? h.__html : h;
  const s = String(typeof raw === "function" ? raw() : raw ?? "");
  const clean = s
    .replace(/<(?:script|iframe|object|embed|base)\b[^>]*>[\s\S]*?<\/(?:script|iframe|object|embed|base)>|<(?:script|iframe|object|embed|base)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
    .replace(/(?:href|src)\s*=\s*['"]\s*(?:javascript|vbscript):[^'"]*['"]/gi, 'href="about:blank"');
  return typeof h === "object" && h !== null && "__html" in h ? { ...h, __html: clean } : clean;
};
`;

export const SAFE_HTML_HELPER_AST = parse(SAFE_HTML_CODE, {
  sourceType: "module"
}).program.body[0] as t.VariableDeclaration;
