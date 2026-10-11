import type { Child } from "../dom/render";
import { createRoot } from "../signals";

const VOID_ELEMENTS = new Set([
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderChildToString(child: Child): string {
  if (child === null || child === undefined || child === false || child === true) {
    return "";
  }

  if (typeof child === "function") {
    return renderChildToString((child as () => any)());
  }

  if (Array.isArray(child)) {
    return child.map((c) => renderChildToString(c)).join("");
  }

  if (typeof child === "object" && "nodeType" in child) {
    return (child as any).outerHTML || (child as any).textContent || "";
  }

  return escapeHtml(String(child));
}

/**
 * Synchronously render a Visage component tree to an HTML string
 */
export function renderToString(fn: () => Child): string {
  return createRoot(() => {
    const result = fn();
    return renderNodeToString(result);
  });
}

function renderNodeToString(node: any): string {
  if (node === null || node === undefined || node === false || node === true) {
    return "";
  }

  if (typeof node === "function") {
    return renderNodeToString(node());
  }

  if (Array.isArray(node)) {
    return node.map((n) => renderNodeToString(n)).join("");
  }

  if (typeof node === "object" && node !== null) {
    if ("tagName" in node) {
      const tag = String(node.tagName).toLowerCase();
      const isVoid = VOID_ELEMENTS.has(tag);

      let attrStr = "";
      if (node.attributes instanceof Map) {
        for (const [k, v] of node.attributes) {
          attrStr += ` ${k}="${escapeHtml(String(v))}"`;
        }
      }

      if (
        node.style &&
        typeof node.style === "object" &&
        !(node.attributes instanceof Map && node.attributes.has("style"))
      ) {
        const styleEntries = Object.entries(node.style).filter(
          ([_, v]) => typeof v === "string" && v.length > 0
        );
        if (styleEntries.length > 0) {
          const styleStr = styleEntries
            .map(([k, v]) => `${k.startsWith("--") ? k : k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`)
            .join("; ");
          attrStr += ` style="${escapeHtml(styleStr)}"`;
        }
      }

      if (isVoid) {
        return `<${tag}${attrStr} />`;
      }

      const inner = (node.childNodes || []).map((c: any) => renderNodeToString(c)).join("");
      return `<${tag}${attrStr}>${inner}</${tag}>`;
    }

    if ("textContent" in node) {
      return escapeHtml(node.textContent || "");
    }
  }

  return escapeHtml(String(node));
}
