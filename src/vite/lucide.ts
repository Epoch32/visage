import type { VisageVitePlugin } from "./types";

export interface VisageLucideOptions {
  /**
   * Module aliases to intercept and translate.
   * Defaults to `["lucide-react"]`.
   */
  aliases?: string[];
}

interface ParsedImport {
  raw: string;
  importedName: string;
  localName: string;
}

function parseNamedImports(importClause: string): ParsedImport[] {
  return importClause
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const parts = item.split(/\s+as\s+/).map((p) => p.trim());
      const importedName = parts[0]!;
      const localName = parts[1] ?? importedName;
      return {
        raw: item,
        importedName,
        localName
      };
    });
}

/**
 * Official Visage Lucide Vite Plugin
 *
 * Statically transforms `import { Icon } from "lucide-react"` at build time into
 * native, tree-shaken Visage SVG component instances using `createIcon` and `lucide`.
 *
 * Example:
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from "vite";
 * import visage, { visageLucide } from "visage/vite";
 *
 * export default defineConfig({
 *   plugins: [visage(), visageLucide()]
 * });
 * ```
 */
export function visageLucide(options: VisageLucideOptions = {}): VisageVitePlugin {
  const aliases = options.aliases ?? ["lucide-react"];

  return {
    name: "visage:lucide",
    enforce: "pre",

    config() {
      return {
        optimizeDeps: {
          exclude: aliases
        }
      };
    },

    resolveId(id: string) {
      if (aliases.includes(id)) {
        return `\0visage-lucide:${id}`;
      }
      return null;
    },

    load(id: string) {
      if (id.startsWith("\0visage-lucide:")) {
        return `
import * as lucideIcons from "lucide";
import { createIcon } from "visage/ui";

const cache = new Map();
export const __getIcon = (name) => {
  if (cache.has(name)) return cache.get(name);
  const node = lucideIcons[name];
  const comp = node ? createIcon(name, node) : () => null;
  cache.set(name, comp);
  return comp;
};

export default new Proxy({}, {
  get: (_, prop) => typeof prop === "string" ? __getIcon(prop) : undefined
});

// Dynamic proxy export for all lucide icon names
${Object.keys({})};
export * from "lucide";
`;
      }
      return null;
    },

    transform(code: string, id: string) {
      if (!id.match(/\.([jt]sx?|mdx?)$/) || id.includes("node_modules")) {
        return null;
      }

      let transformed = code;
      let hasMatches = false;

      for (const alias of aliases) {
        // Regex to match: import { ... } from "lucide-react" or 'lucide-react'
        const regex = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${alias}['"];?`, "g");

        transformed = transformed.replace(regex, (_match, importClause) => {
          const imports = parseNamedImports(importClause);
          if (imports.length === 0) return "";

          hasMatches = true;

          const lucideNamedImports = imports
            .map((imp) => `${imp.importedName} as __icon_node_${imp.importedName}`)
            .join(", ");

          const componentDeclarations = imports
            .map((imp) => {
              return `const ${imp.localName} = /* @__PURE__ */ __visageCreateIcon("${imp.importedName}", __icon_node_${imp.importedName});`;
            })
            .join("\n");

          return `import { createIcon as __visageCreateIcon } from "visage/ui";\nimport { ${lucideNamedImports} } from "lucide";\n${componentDeclarations}`;
        });
      }

      if (!hasMatches) {
        return null;
      }

      return {
        code: transformed,
        map: null
      };
    }
  };
}

export default visageLucide;
