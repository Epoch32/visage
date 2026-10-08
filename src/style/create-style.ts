import type * as CSS from "csstype";
import { onCleanup } from "../signals";
import { type ClassValue, cx } from "./cx";
import { getScopeId } from "./hash";
import { styleManager } from "./manager";
import { scopeCSS } from "./parser";

/**
 * Standard CSS Properties interface with full TypeScript & VS Code IntelliSense,
 * supporting nested pseudo-classes, descendant selectors, and custom CSS variables.
 */
export type CSSProperties = CSS.Properties<string | number> & {
  [key: `&${string}`]: CSSProperties | undefined;
  [key: `.${string}`]: CSSProperties | undefined;
  [key: `:${string}`]: CSSProperties | undefined;
  [key: `@media${string}`]: CSSProperties | undefined;
  [key: `@keyframes${string}`]: Record<string, CSSProperties> | undefined;
  [key: `${number}%`]: CSSProperties | undefined;
  from?: CSSProperties;
  to?: CSSProperties;
  [customProp: `--${string}`]: string | number | undefined;
};

export type StyleDefinition = Record<string, CSSProperties>;

export type StyleClasses<T extends string = string> = {
  [K in T]: string;
} & Record<string, any> & {
    scope: string;
    scopeAttr: string;
    css: string;
    cx: (...args: ClassValue[]) => string;
  };

const UNITLESS_PROPERTIES = new Set([
  "animationIterationCount",
  "aspectRatio",
  "borderImageSlice",
  "columnCount",
  "columns",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexOrder",
  "fontWeight",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tabSize",
  "widows",
  "zIndex",
  "zoom"
]);

function formatCSSValue(prop: string, val: any): string {
  if (typeof val === "number" && val !== 0 && !UNITLESS_PROPERTIES.has(prop)) {
    return `${val}px`;
  }
  return String(val);
}

/**
 * Convert a JavaScript object style dictionary into standard CSS
 */
export function objectToCSS(classes: Record<string, any>): string {
  let css = "";
  for (const [selector, rules] of Object.entries(classes)) {
    if (typeof rules !== "object" || rules === null) continue;
    const sel =
      selector.startsWith(".") ||
      selector.startsWith("@") ||
      selector.startsWith(":") ||
      selector.includes(" ") ||
      selector === "*"
        ? selector
        : `.${selector}`;

    let mainRules = "";
    let nestedRules = "";

    for (const [prop, val] of Object.entries(rules)) {
      if (typeof val === "object" && val !== null) {
        const nestedSel = prop.startsWith("&")
          ? prop.replace(/&/g, sel)
          : prop.startsWith(":")
            ? `${sel}${prop}`
            : `${sel} ${prop}`;

        nestedRules += `${nestedSel} {\n`;
        for (const [np, nv] of Object.entries(val as Record<string, any>)) {
          if (nv !== undefined && nv !== null) {
            const kebab = np.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
            nestedRules += `  ${kebab}: ${formatCSSValue(np, nv)};\n`;
          }
        }
        nestedRules += `}\n`;
      } else if (val !== undefined && val !== null) {
        const kebab = prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
        mainRules += `  ${kebab}: ${formatCSSValue(prop, val)};\n`;
      }
    }

    if (mainRules) {
      css += `${sel} {\n${mainRules}}\n`;
    }
    if (nestedRules) {
      css += nestedRules;
    }
  }
  return css;
}

/**
 * Define scoped CSS styles with type-safe class name mappings
 *
 * Supports tagged template literals, string CSS, or JavaScript style objects:
 *
 * 1. Object syntax with full VS Code CSS IntelliSense:
 * ```tsx
 * const styles = createStyle({
 *   card: { background: "var(--card-bg)", padding: "16px", display: "flex" },
 *   button: { background: "var(--primary)", "&:hover": { background: "var(--primary-hover)" } }
 * });
 * ```
 *
 * 2. Tagged template literal syntax:
 * ```tsx
 * const styles = createStyle`
 *   .card { padding: 16px; border-radius: 8px; }
 *   .active { color: var(--primary); }
 * `;
 * ```
 */
export function createStyle<T extends string = string>(
  templateOrObject: string | TemplateStringsArray | StyleDefinition,
  ...valuesOrOptions: any[]
): StyleClasses<T> {
  let cssInput = "";
  let options: { passToChildren?: boolean; id?: string } | undefined;

  if (typeof templateOrObject === "object" && !Array.isArray(templateOrObject)) {
    // Object style definition
    cssInput = objectToCSS(templateOrObject);
    options = valuesOrOptions[0];
  } else if (typeof templateOrObject === "string") {
    cssInput = templateOrObject;
    options = valuesOrOptions[0];
  } else {
    const template = templateOrObject as TemplateStringsArray;
    for (let i = 0; i < template.length; i++) {
      cssInput += template[i];
      if (i < valuesOrOptions.length) {
        cssInput += String(valuesOrOptions[i]);
      }
    }
  }

  const scopeId = options?.id ?? getScopeId(cssInput);
  const scopeAttr = `data-${scopeId}`;
  const classMap: Record<string, string> = {};

  // Extract class names defined in the CSS
  const classRegex = /\.([a-zA-Z0-9_-]+)/g;
  let match: RegExpExecArray | null = classRegex.exec(cssInput);
  while (match !== null) {
    const className = match[1];
    if (className && !classMap[className]) {
      // Scoped class name
      classMap[className] = `${className}_${scopeId}`;
    }
    match = classRegex.exec(cssInput);
  }

  // Rewrite CSS classes to use scoped class names
  let transformedCSS = cssInput;
  for (const [orig, scoped] of Object.entries(classMap)) {
    const replaceRegex = new RegExp(`\\.${orig}\\b`, "g");
    transformedCSS = transformedCSS.replace(replaceRegex, `.${scoped}`);
  }

  const finalScopedCSS = scopeCSS(transformedCSS, {
    scopeId,
    passToChildren: options?.passToChildren ?? false
  });

  // Inject into StyleManager
  styleManager.inject(scopeId, finalScopedCSS);

  const result: any = {
    ...classMap,
    scope: scopeId,
    scopeAttr,
    css: finalScopedCSS,
    cx: (...args: ClassValue[]) => cx(...args)
  };

  return result as StyleClasses<T>;
}

/**
 * Tagged template for defining a single scoped CSS class
 */
export function css(strings: TemplateStringsArray, ...values: any[]): string {
  let rawCSS = "";
  for (let i = 0; i < strings.length; i++) {
    rawCSS += strings[i];
    if (i < values.length) {
      rawCSS += String(values[i]);
    }
  }

  const scopeId = getScopeId(rawCSS, "cls");
  const className = `visage_${scopeId}`;

  // Wrap inside class selector
  const fullCSS = rawCSS.includes("&")
    ? rawCSS.replace(/&/g, `.${className}`)
    : `.${className} { ${rawCSS} }`;

  const scoped = scopeCSS(fullCSS, { scopeId });
  styleManager.inject(scopeId, scoped);

  return className;
}

/**
 * Hook to inject dynamic or component-level CSS with automatic cleanup
 */
export function useStyle(
  cssInput: string | StyleDefinition | (() => string | StyleDefinition),
  options?: { passToChildren?: boolean; id?: string }
): string {
  const getRaw = () => {
    const val = typeof cssInput === "function" ? cssInput() : cssInput;
    return typeof val === "object" ? objectToCSS(val) : val;
  };

  const raw = getRaw();
  const scopeId = options?.id ?? getScopeId(raw);
  const scopedCSS = scopeCSS(raw, {
    scopeId,
    passToChildren: options?.passToChildren ?? false
  });

  const cleanup = styleManager.inject(scopeId, scopedCSS);
  onCleanup(() => {
    cleanup();
  });

  return scopeId;
}
