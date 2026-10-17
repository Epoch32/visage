import { transformHmr } from "../hmr";
import { pc, type VisageLogger } from "../logger";
import type { VisagePluginOptions, VisageVitePlugin } from "../types";

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
