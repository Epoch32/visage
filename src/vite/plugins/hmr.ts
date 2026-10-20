import { pc, type VisageLogger } from "../logger";
import type { VisagePluginOptions, VisageVitePlugin } from "../types";

/**
 * Transform JSX/TSX modules to attach Hot Module Replacement (HMR) acceptance
 */
export function transformHmr(code: string, id: string): { code: string; map?: any } | null {
  // Only target user code JSX/TSX files
  if (!/\.[jt]sx$/.test(id) || id.includes("node_modules")) {
    return null;
  }

  // Check if file exports any functions or components
  const hasExports =
    /\bexport\s+(?:default\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*)/.test(code) ||
    /\bexport\s+\{\s*([A-Za-z0-9_,\s]+)\s*\}/.test(code);

  if (!hasExports) {
    return null;
  }

  // Append lightweight HMR boundary
  const hmrFooter = `
/* @visage/vite-hmr */
if (import.meta.hot) {
  import.meta.hot.accept((newMod) => {
    if (newMod) {
      // Re-trigger reactive components without wiping signal stores
      if (typeof window !== "undefined" && window.__VISAGE_DEVTOOLS__) {
        window.__VISAGE_DEVTOOLS__.refresh?.();
      }
    }
  });
}
`;

  return {
    code: `${code}\n;${hmrFooter}`,
    map: null
  };
}

export function createHmrPlugin(
  options: VisagePluginOptions,
  vLog: VisageLogger,
  isDev: boolean
): VisageVitePlugin {
  return {
    name: "visage:transform",
    buildStart() {
      if (options.hmr !== false && isDev) {
        vLog.info(
          "visage:hmr",
          `Signal-preserving HMR boundary transformer active ${pc.dim("(fast refresh)")}`
        );
      }
    },
    transform(code: string, id: string) {
      if (options.hmr !== false && isDev) {
        return transformHmr(code, id);
      }
      return null;
    }
  };
}
