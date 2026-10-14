export const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeHtmlAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function formatStaticElement(
  tagName: string,
  attrsStr: string,
  childrenHtml: string
): string {
  const fullAttrs = attrsStr ? ` ${attrsStr}` : "";
  if (VOID_ELEMENTS.has(tagName)) {
    return `<${tagName}${fullAttrs}>`;
  }
  return `<${tagName}${fullAttrs}>${childrenHtml}</${tagName}>`;
}
