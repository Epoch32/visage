import { type Child, insertChild, resolveValue, setAttribute } from "../dom";
import { formatStyleProp } from "../style/scale";

export type { JSX } from "./jsx";

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set([
  "svg",
  "path",
  "circle",
  "rect",
  "g",
  "line",
  "polyline",
  "polygon",
  "text",
  "defs",
  "clipPath",
  "linearGradient",
  "radialGradient",
  "stop"
]);

export function Fragment(props: { children?: Child }): any {
  if (typeof document === "undefined") {
    return props.children !== undefined ? props.children : [];
  }
  const fragment = document.createDocumentFragment();
  if (props.children !== undefined) {
    insertChild(fragment, props.children);
  }
  return fragment;
}

export function jsx(type: any, props: Record<string, any> = {}, key?: any): any {
  // If it's a Component function
  if (typeof type === "function") {
    return type(props, key);
  }

  // If it's a DOM element tag
  if (typeof type === "string") {
    const { children, ...restProps } = props;

    // SSR Server Environment (Node / Bun / Cloudflare Workers without DOM)
    if (typeof document === "undefined") {
      const attributes = new Map<string, any>();
      for (const propName in restProps) {
        const val = restProps[propName];
        if (propName === "className" || propName === "class") {
          const resolved = typeof val === "function" ? val() : val;
          if (resolved) attributes.set("class", resolved);
        } else if (propName === "style") {
          const val = restProps[propName];
          const resolved = resolveValue(val);
          if (typeof resolved === "string") {
            attributes.set("style", resolved);
          } else if (typeof resolved === "object" && resolved !== null) {
            const styleStr = Object.entries(resolved)
              .map(([k, v]) => {
                const finalVal = resolveValue(v);
                const formatted = formatStyleProp(k, finalVal);
                if (!formatted) return "";
                const kebab = k.startsWith("--") ? k : k.replace(/([A-Z])/g, "-$1").toLowerCase();
                return `${kebab}: ${formatted}`;
              })
              .filter(Boolean)
              .join("; ");
            if (styleStr) attributes.set("style", styleStr);
          }
        } else if (!propName.startsWith("on")) {
          const resolved = typeof val === "function" ? val() : val;
          if (resolved === true) {
            attributes.set(propName, propName);
          } else if (resolved !== false && resolved !== null && resolved !== undefined) {
            attributes.set(propName, resolved);
          }
        }
      }

      const childNodes =
        children !== undefined ? (Array.isArray(children) ? children : [children]) : [];

      return {
        tagName: type,
        attributes,
        childNodes
      };
    }

    // Browser / JSDOM Environment
    const isSvg = SVG_TAGS.has(type);
    const element = isSvg ? document.createElementNS(SVG_NS, type) : document.createElement(type);

    // Apply attributes and event listeners
    for (const propName in restProps) {
      setAttribute(element as HTMLElement, propName, restProps[propName]);
    }

    // Insert children
    if (children !== undefined) {
      insertChild(element, children);
    }

    return element;
  }

  return type;
}

export const jsxs = jsx;
export const jsxDEV = jsx;
