import { createVisageLogger } from "./logger";
import { createLucidePlugin, type VisageLucideOptions } from "./plugins/lucide";
import type { VisageVitePlugin } from "./types";

export type { VisageLucideOptions };

/**
 * Official Visage Lucide Vite Plugin
 *
 * Statically transforms `import { Icon } from "lucide-react"` at build time into
 * native, tree-shaken Visage SVG component instances using `createIcon` and `lucide`.
 *
 * @deprecated `visageLucide()` is deprecated. Lucide icon integration is now built directly into the main `visage()` plugin. You can safely remove `visageLucide()` from your Vite plugins array, or configure options via `visage({ lucide: ... })`.
 *
 * Example:
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from "vite";
 * import visage from "visage/vite";
 *
 * export default defineConfig({
 *   plugins: [visage()]
 * });
 * ```
 */
export function visageLucide(options: VisageLucideOptions = {}): VisageVitePlugin {
  const vLog = createVisageLogger();
  return createLucidePlugin(options, vLog, true);
}

export default visageLucide;
