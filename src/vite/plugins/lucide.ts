import { createVisageLogger, pc, type VisageLogger } from "../logger";
import type { VisageVitePlugin } from "../types";

export interface VisageLucideOptions {
  /**
   * Module aliases to intercept and translate.
   * Defaults to `["lucide-react", "lucide"]`.
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

const VIRTUAL_PREFIX = "virtual:visage-icons";
const RESOLVED_PREFIX = `\0${VIRTUAL_PREFIX}`;

/**
 * Creates the Visage Lucide Vite Plugin instance.
 *
 * Statically transforms `import { Icon } from "lucide-react"` at build time into
 * native, tree-shaken Visage SVG component instances using `createIcon` and `lucide`.
 */
export function createLucidePlugin(
  options: VisageLucideOptions = {},
  customLogger?: VisageLogger,
  isDeprecatedWrapper = false
): VisageVitePlugin {
  const aliases = options.aliases ?? ["lucide-react", "lucide"];
  const vLog = customLogger ?? createVisageLogger();
  let isDuplicate = false;

  return {
    name: "visage:lucide",
    enforce: "pre",

    configResolved(config) {
      vLog.setViteLogger(config.logger);
      if ((config as any).__visage_lucide_registered) {
        isDuplicate = true;
      } else {
        (config as any).__visage_lucide_registered = true;
      }
    },

    buildStart() {
      if (isDeprecatedWrapper) {
        vLog.warn(
          "visage:lucide",
          "visageLucide() is deprecated in Version 2 and will be fully removed in Version 3. Lucide icon integration is now built directly into the main visage() plugin. You can safely remove visageLucide() from your Vite plugins array."
        );
      }
      if (!isDuplicate) {
        vLog.info(
          "visage:lucide",
          `Statically tree-shaken Lucide icons active ${pc.dim(`(aliases: ${aliases.join(", ")})`)}`
        );
      }
    },

    config() {
      return {
        optimizeDeps: {
          exclude: [...aliases, VIRTUAL_PREFIX]
        }
      };
    },

    resolveId(id: string, importer?: string) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return `\0${id}`;
      }
      // Do not intercept internal imports originating from the virtual icon module itself
      if (
        id === "lucide" &&
        importer &&
        (importer.startsWith("\0") || importer.includes(VIRTUAL_PREFIX))
      ) {
        return null;
      }
      if (aliases.includes(id)) {
        return `\0visage-lucide:${id}`;
      }
      return null;
    },

    load(id: string) {
      if (id.startsWith(RESOLVED_PREFIX)) {
        const query = id.slice(RESOLVED_PREFIX.length);
        const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : "");
        const names = (params.get("icons") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        if (names.length > 0) {
          vLog.info(
            "visage:lucide",
            `Compiled ${names.length} icon${names.length > 1 ? "s" : ""} into virtual module ${pc.dim(`(${names.join(", ")})`)}`
          );
        }

        const imports = names.map((n) => `${n} as __icon_node_${n}`).join(", ");
        const exports = names
          .map((n) => `export const ${n} = /* @__PURE__ */ createIcon("${n}", __icon_node_${n});`)
          .join("\n");

        return `import { createIcon } from "visage/ui";\nimport { ${imports} } from "lucide";\n\n${exports}\n`;
      }

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
        // Match: import { ... } from "alias"
        const importRegex = new RegExp(
          `import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${alias}['"];?`,
          "g"
        );
        transformed = transformed.replace(importRegex, (_match, importClause) => {
          const imports = parseNamedImports(importClause);
          if (imports.length === 0) return "";
          hasMatches = true;

          const queryIcons = Array.from(new Set(imports.map((i) => i.importedName))).join(",");
          const specifiers = imports
            .map((i) =>
              i.importedName === i.localName
                ? i.importedName
                : `${i.importedName} as ${i.localName}`
            )
            .join(", ");

          return `import { ${specifiers} } from "${VIRTUAL_PREFIX}?icons=${queryIcons}";`;
        });

        // Match: export { ... } from "alias"
        const exportRegex = new RegExp(
          `export\\s*\\{([^}]+)\\}\\s*from\\s*['"]${alias}['"];?`,
          "g"
        );
        transformed = transformed.replace(exportRegex, (_match, exportClause) => {
          const exports = parseNamedImports(exportClause);
          if (exports.length === 0) return "";
          hasMatches = true;

          const queryIcons = Array.from(new Set(exports.map((i) => i.importedName))).join(",");
          const specifiers = exports
            .map((i) =>
              i.importedName === i.localName
                ? i.importedName
                : `${i.importedName} as ${i.localName}`
            )
            .join(", ");

          return `export { ${specifiers} } from "${VIRTUAL_PREFIX}?icons=${queryIcons}";`;
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

/**
 * Official Visage Lucide Vite Plugin
 *
 * Statically transforms `import { Icon } from "lucide-react"` at build time into
 * native, tree-shaken Visage SVG component instances using `createIcon` and `lucide`.
 *
 * @deprecated `visageLucide()` is deprecated in Version 2 and will be fully removed in Version 3.
 * Lucide icon integration is now built directly into the main `visage()` plugin.
 */
export function visageLucide(options: VisageLucideOptions = {}): VisageVitePlugin {
  const vLog = createVisageLogger();
  return createLucidePlugin(options, vLog, true);
}
