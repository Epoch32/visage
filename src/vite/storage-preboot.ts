import * as fs from "node:fs";
import * as path from "node:path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import type { StoragePrebootItem } from "./types";

const babelTraverse = (traverse as any).default || traverse;

/**
 * Scans JavaScript / TypeScript / JSX code for persistent signals:
 * signal("system", { persist: "theme" }) or createSignal("system", { persist: { key: "theme" } })
 */
export function scanCodeForPersistentSignals(code: string): StoragePrebootItem[] {
  if (!code.includes("persist")) {
    return [];
  }

  const items: StoragePrebootItem[] = [];

  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"]
    });

    babelTraverse(ast, {
      CallExpression(pathNode: any) {
        const callee = pathNode.node.callee;
        const isSignalCall =
          (t.isIdentifier(callee) &&
            (callee.name === "signal" || callee.name === "createSignal")) ||
          (t.isMemberExpression(callee) &&
            t.isIdentifier(callee.property) &&
            (callee.property.name === "signal" || callee.property.name === "createSignal"));

        if (!isSignalCall) return;

        const args = pathNode.node.arguments;
        if (args.length < 2) return;

        const initialArg = args[0];
        let defaultVal: string | undefined;
        if (t.isStringLiteral(initialArg)) {
          defaultVal = initialArg.value;
        }

        const optionsArg = args[1];
        if (!t.isObjectExpression(optionsArg)) return;

        for (const prop of optionsArg.properties) {
          if (!t.isObjectProperty(prop)) continue;

          let propName = "";
          if (t.isIdentifier(prop.key)) {
            propName = prop.key.name;
          } else if (t.isStringLiteral(prop.key)) {
            propName = prop.key.value;
          }

          if (propName !== "persist") continue;

          // Case 1: persist: "theme-key"
          if (t.isStringLiteral(prop.value)) {
            const key = prop.value.value;
            items.push(createDefaultItem(key, defaultVal));
          }
          // Case 2: persist: { key: "theme-key", storage: "local", ... }
          else if (t.isObjectExpression(prop.value)) {
            let key = "";
            let storage: "local" | "session" = "local";
            let attribute: string | undefined;
            let targetElement: "html" | "body" = "html";

            for (const subProp of prop.value.properties) {
              if (!t.isObjectProperty(subProp)) continue;
              const subKey = t.isIdentifier(subProp.key)
                ? subProp.key.name
                : t.isStringLiteral(subProp.key)
                  ? subProp.key.value
                  : "";

              if (subKey === "key" && t.isStringLiteral(subProp.value)) {
                key = subProp.value.value;
              } else if (subKey === "storage" && t.isStringLiteral(subProp.value)) {
                storage = subProp.value.value === "session" ? "session" : "local";
              } else if (subKey === "attribute" && t.isStringLiteral(subProp.value)) {
                attribute = subProp.value.value;
              } else if (subKey === "targetElement" && t.isStringLiteral(subProp.value)) {
                targetElement = subProp.value.value === "body" ? "body" : "html";
              }
            }

            if (key) {
              const item = createDefaultItem(key, defaultVal);
              item.storage = storage;
              item.targetElement = targetElement;
              if (attribute) {
                item.attribute = attribute;
              }
              items.push(item);
            }
          }
        }
      }
    });
  } catch {
    // If parse fails on incomplete syntax, return whatever was found
  }

  return items;
}

function createDefaultItem(key: string, defaultValue?: string): StoragePrebootItem {
  const lowerKey = key.toLowerCase();
  const isTheme = lowerKey.includes("theme");

  let attribute = `data-${key}`;
  let colorSchemeQuery = false;
  let fallback = defaultValue ?? "";

  if (isTheme) {
    attribute = "data-theme";
    colorSchemeQuery = true;
    fallback = defaultValue ?? "system";
  } else if (lowerKey.includes("mode")) {
    attribute = "data-mode";
  } else if (
    lowerKey.includes("layout") ||
    lowerKey.includes("density") ||
    lowerKey.includes("sidebar")
  ) {
    attribute = `data-${key}`;
  }

  return {
    key,
    attribute,
    storage: "local",
    fallback,
    colorSchemeQuery,
    targetElement: "html"
  };
}

/**
 * Scans a project directory recursively for persistent signals in source files
 */
export function scanProjectStoragePreboot(
  dir: string,
  stateMap: Map<string, StoragePrebootItem>
): void {
  if (!fs.existsSync(dir)) return;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name.startsWith(".") ||
        entry.name === "zig-out" ||
        entry.name === ".zig-cache"
      ) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanProjectStoragePreboot(fullPath, stateMap);
      } else if (/\.[jt]sx?$/.test(entry.name)) {
        try {
          const code = fs.readFileSync(fullPath, "utf8");
          if (!code.includes("persist")) continue;
          const found = scanCodeForPersistentSignals(code);
          for (const item of found) {
            stateMap.set(item.key, item);
          }
        } catch {
          // Ignore read errors
        }
      }
    }
  } catch {
    // Ignore directory read errors
  }
}

/**
 * Generates an ultra-compact, synchronous blocking inline script for the HTML <head>
 */
export function generateStoragePrebootScript(items: StoragePrebootItem[]): string {
  if (items.length === 0) return "";

  const lines: string[] = [];
  lines.push("(function(){");
  lines.push("try{");
  lines.push("var d=document.documentElement;");
  lines.push("var w=window;");
  lines.push("w.__VISAGE_PREBOOT__=w.__VISAGE_PREBOOT__||{};");
  lines.push(
    "var g=function(k,s){try{var v=(s==='session'?sessionStorage:localStorage).getItem(k);" +
      "if(v&&(v[0]==='\"'||v[0]===\"'\")){try{return JSON.parse(v)}catch(e){}}" +
      "return v}catch(e){return null}};"
  );

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const varName = `v${i}`;
    const keyEscaped = JSON.stringify(item.key);
    const storageEscaped = JSON.stringify(item.storage ?? "local");
    const fallbackEscaped = JSON.stringify(item.fallback ?? "");

    lines.push(`var ${varName}=g(${keyEscaped},${storageEscaped})||${fallbackEscaped};`);

    if (item.colorSchemeQuery) {
      lines.push(
        `if(${varName}==='system'&&w.matchMedia){` +
          `${varName}=w.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}`
      );
    }

    // Expose in window.__VISAGE_PREBOOT__ for instant runtime access
    lines.push(`w.__VISAGE_PREBOOT__[${keyEscaped}]=${varName};`);

    // Apply attribute or class to target DOM element
    if (item.targetElement === "body") {
      if (item.attribute === "class") {
        lines.push(
          `if(${varName}){if(document.body){document.body.classList.add(${varName});}else{d.classList.add(${varName});` +
            `d.addEventListener('DOMContentLoaded',function(){if(document.body)document.body.classList.add(${varName});});}}`
        );
      } else {
        const attrEscaped = JSON.stringify(item.attribute ?? `data-${item.key}`);
        lines.push(
          `if(${varName}){if(document.body){document.body.setAttribute(${attrEscaped},${varName});}else{d.setAttribute(${attrEscaped},${varName});` +
            `d.addEventListener('DOMContentLoaded',function(){if(document.body)document.body.setAttribute(${attrEscaped},${varName});});}}`
        );
      }
    } else if (item.attribute === "class") {
      lines.push(`if(${varName}){d.classList.add(${varName});}`);
    } else {
      const attrEscaped = JSON.stringify(item.attribute ?? `data-${item.key}`);
      lines.push(`if(${varName}){d.setAttribute(${attrEscaped},${varName});}`);
    }
  }

  lines.push("}catch(e){}");
  lines.push("})();");

  const minifiedScript = lines.join("");
  return `<script data-visage-preboot="true">${minifiedScript}</script>`;
}

/**
 * Injects the storage-preboot blocking script into the HTML shell's <head>
 */
export function injectStoragePrebootScript(html: string, scriptTag: string): string {
  if (!scriptTag) return html;

  // Prevent duplicate injections
  if (html.includes("data-visage-preboot")) {
    return html;
  }

  // Inject immediately after opening <head> tag
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/(<head\b[^>]*>)/i, `$1\n    ${scriptTag}`);
  }

  // Fallback: prepend if no head tag present
  return `${scriptTag}\n${html}`;
}
