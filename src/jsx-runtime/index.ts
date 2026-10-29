import {
  type Child,
  getNextHydrationElement,
  insertChild,
  isHydrating,
  isReactive,
  resolveValue,
  setAttribute
} from "@dom";
import { formatStyleProp } from "@style/scale";

export type { JSX } from "./jsx";

export const SVG_NS = "http://www.w3.org/2000/svg";
export const SVG_TAGS = new Set([
  "svg",
  "animate",
  "animateMotion",
  "animateTransform",
  "circle",
  "clipPath",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "set",
  "stop",
  "switch",
  "symbol",
  "text",
  "textPath",
  "tspan",
  "use",
  "view"
]);

const UPPERCASE_RE = /[A-Z]/;

let ssrDepth = 0;

export function isSSR(): boolean {
  return (
    ssrDepth > 0 || typeof document === "undefined" || ((globalThis as any).__visage_ssr || 0) > 0
  );
}

export function runInSSRMode<T>(fn: () => T): T {
  ssrDepth++;
  (globalThis as any).__visage_ssr = ((globalThis as any).__visage_ssr || 0) + 1;
  try {
    return fn();
  } finally {
    ssrDepth--;
    (globalThis as any).__visage_ssr = Math.max(0, ((globalThis as any).__visage_ssr || 1) - 1);
  }
}

export function Fragment(props: { children?: Child }): any {
  if (isSSR()) {
    return props?.children !== undefined ? props.children : [];
  }
  const fragment = document.createDocumentFragment();
  if (props?.children !== undefined) {
    insertChild(fragment, props.children);
  }
  return fragment;
}

/**
 * Resolves the unwrapped value of a two-way binding target (signal, getter tuple, or getter object).
 */
export function resolveBoundValue(val: any): any {
  if (typeof val === "function") {
    return val();
  }
  if (Array.isArray(val)) {
    return typeof val[0] === "function" ? val[0]() : val[0];
  }
  if (typeof val?.get === "function") {
    return val.get();
  }
  return val;
}

export function jsx(type: any, props: Record<string, any> = {}, key?: any): any {
  // If it's a Component function
  if (typeof type === "function") {
    return type(props, key);
  }

  // If it's a DOM element tag
  if (typeof type === "string") {
    const p = props || {};
    const children = p.children;

    // SSR Server Environment (Node / Bun / Cloudflare Workers without DOM, or explicit SSR render)
    if (isSSR()) {
      const attributes = new Map<string, any>();
      for (const propName in p) {
        if (propName === "children" || propName === "key") continue;
        const val = p[propName];

        if (propName === "className" || propName === "class") {
          const resolved = typeof val === "function" ? val() : val;
          if (resolved) attributes.set("class", resolved);
        } else if (propName === "style") {
          const resolved = resolveValue(val);
          if (typeof resolved === "string") {
            attributes.set("style", resolved);
          } else if (typeof resolved === "object" && resolved !== null) {
            let styleStr = "";
            for (const k in resolved) {
              const finalVal = resolveValue(resolved[k]);
              const formatted = formatStyleProp(k, finalVal);
              if (!formatted) continue;
              const kebab = k.startsWith("--") ? k : k.replace(/([A-Z])/g, "-$1").toLowerCase();
              if (styleStr) styleStr += "; ";
              styleStr += `${kebab}: ${formatted}`;
            }
            if (styleStr) attributes.set("style", styleStr);
          }
        } else if (propName === "bind:value" || propName === "bind") {
          const resolved = resolveBoundValue(val);
          if (resolved !== null && resolved !== undefined) {
            attributes.set("value", resolved);
          }
        } else if (propName === "bind:checked") {
          const resolved = resolveBoundValue(val);
          if (resolved) {
            attributes.set("checked", "checked");
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

      let childNodes: any[];
      if (children === undefined) {
        childNodes = [];
      } else if (Array.isArray(children)) {
        const len = children.length;
        childNodes = new Array(len);
        for (let i = 0; i < len; i++) {
          const c = children[i];
          childNodes[i] = typeof c === "function" ? c() : c;
        }
      } else {
        childNodes = [typeof children === "function" ? children() : children];
      }

      return {
        tagName: type,
        attributes,
        childNodes
      };
    }

    // Browser / JSDOM Environment
    const isSvg =
      SVG_TAGS.has(type) || (UPPERCASE_RE.test(type) && SVG_TAGS.has(type.toLowerCase()));
    let element: HTMLElement | SVGElement | null = null;
    if (isHydrating()) {
      element = getNextHydrationElement(type) as HTMLElement | SVGElement | null;
    }
    const isAdopted = element !== null;
    if (!element) {
      element = isSvg ? document.createElementNS(SVG_NS, type) : document.createElement(type);
    }

    // Apply attributes and event listeners
    for (const propName in p) {
      if (propName === "children" || propName === "key") continue;
      setAttribute(element, propName, p[propName]);
    }

    // Insert children
    if (children !== undefined && (!isAdopted || isReactive(children))) {
      insertChild(element, children);
    }

    return element;
  }

  return type;
}

export const jsxs = jsx;
export const jsxDEV = jsx;
