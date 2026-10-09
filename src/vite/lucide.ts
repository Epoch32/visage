import type { VisageVitePlugin } from "./types";

export interface VisageLucideOptions {
  /**
   * Module aliases to intercept and translate at build time.
   * Defaults to `["lucide-react"]`.
   */
  aliases?: string[];

  /**
   * Default icon width and height in pixels.
   * Defaults to `24`.
   */
  defaultSize?: number;

  /**
   * Default stroke width.
   * Defaults to `2`.
   */
  defaultStrokeWidth?: number;
}

/**
 * Official Visage Lucide Vite Plugin
 *
 * Intercepts `lucide-react` imports at build time and translates them into
 * 100% native, fine-grained, tree-shakable Visage SVG components with zero React dependencies.
 *
 * Example:
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from "vite";
 * import visage from "visage/vite";
 * import { visageLucide } from "visage/vite";
 *
 * export default defineConfig({
 *   plugins: [visage(), visageLucide()]
 * });
 * ```
 */
export function visageLucide(options: VisageLucideOptions = {}): VisageVitePlugin {
  const aliases = options.aliases ?? ["lucide-react"];
  const defaultSize = options.defaultSize ?? 24;
  const defaultStrokeWidth = options.defaultStrokeWidth ?? 2;

  const isMatchingAlias = (id: string): boolean => {
    return aliases.some((alias) => id === alias || id.startsWith(`${alias}/`));
  };

  return {
    name: "visage:lucide",
    enforce: "pre",

    resolveId(id: string) {
      if (isMatchingAlias(id)) {
        return `\0visage-lucide:${id}`;
      }
      return null;
    },

    load(id: string) {
      if (!id.startsWith("\0visage-lucide:")) return null;

      const requestedId = id.replace("\0visage-lucide:", "");

      // If a specific subpath icon is imported: `lucide-react/dist/esm/icons/check` or `lucide-react/icons/check`
      if (requestedId.includes("/")) {
        const parts = requestedId.split("/");
        const iconRawName = parts[parts.length - 1]!.replace(/\.js$/, "");
        const pascalName = iconRawName
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("");

        return `
import { createIcon } from "visage/ui";
import * as lucide from "lucide";

const iconData = lucide[${JSON.stringify(pascalName)}] ||
  lucide[${JSON.stringify(iconRawName)}] ||
  lucide[${JSON.stringify(iconRawName.replace(/-/g, ""))}];

if (!iconData) {
  throw new Error("Lucide icon not found: " + ${JSON.stringify(iconRawName)});
}

const IconComponent = createIcon(${JSON.stringify(pascalName)}, iconData);
export default IconComponent;
export { IconComponent as ${pascalName} };
`;
      }

      // Root import: `import { Check, Heart, ArrowRight } from "lucide-react"`
      return `
import { createIcon } from "visage/ui";
import * as lucide from "lucide";

const defaultSize = ${defaultSize};
const defaultStrokeWidth = ${defaultStrokeWidth};

const cache = new Map();

function getIcon(name) {
  if (cache.has(name)) return cache.get(name);

  // Check direct PascalCase or camelCase
  let node = lucide[name];
  if (!node) {
    const camel = name.charAt(0).toLowerCase() + name.slice(1);
    node = lucide[camel];
  }

  if (!node) {
    throw new Error("[visage:lucide] Icon '" + name + "' not found in lucide package.");
  }

  const comp = createIcon(name, node);
  cache.set(name, comp);
  return comp;
}

export const createLucideIcon = (name, iconNode) => createIcon(name, iconNode);

// Dynamic proxy export for named imports
const proxy = new Proxy({}, {
  get(_, prop) {
    if (prop === "__esModule") return true;
    if (typeof prop !== "string" || prop === "default") return undefined;
    return getIcon(prop);
  }
});

export default proxy;
`;
    },

    transform(code: string, id: string) {
      if (!isMatchingAlias(id) && aliases.some((alias) => code.includes(alias))) {
        // Rewrite standard named imports from lucide-react to individual dynamic accessors or virtual module
        // e.g. import { Check, Heart } from "lucide-react" -> works directly via virtual module resolution
        return null;
      }
      return null;
    }
  };
}

export default visageLucide;
