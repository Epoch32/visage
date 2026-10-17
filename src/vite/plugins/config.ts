import { pc, type VisageLogger } from "../logger";
import type { VisagePluginOptions, VisageVitePlugin } from "../types";

export function createConfigPlugin(
  options: VisagePluginOptions,
  vLog: VisageLogger,
  isZigNative: boolean
): VisageVitePlugin {
  return {
    name: "visage:config",
    configResolved(config) {
      vLog.setViteLogger(config.logger);
      if (options.ssr) {
        vLog.info(
          "visage:ssr",
          `Server-Side Rendering pipeline active ${pc.dim("(streaming mode)")}`
        );
      }
      if (options.extractCss !== false) {
        vLog.debug(
          "visage:config",
          `Static CSS extraction active ${pc.dim("(CSS bundles enabled)")}`
        );
      }
    },
    config(_userConfig, { command }) {
      const baseConfig: any = {
        oxc: {
          jsx: {
            runtime: "automatic",
            importSource: "visage",
            development: command === "serve"
          }
        },
        optimizeDeps: {
          exclude: [
            "@epoch32/visage",
            "visage",
            "visage/signals",
            "visage/dom",
            "visage/query",
            "visage/rpc",
            "visage/style",
            "visage/router",
            "visage/form",
            "visage/virtual",
            "visage/devtools",
            "visage/api",
            "visage/charts",
            "visage/native"
          ]
        },
        resolve: {
          alias: [
            { find: /^visage\/(.*)/, replacement: "@epoch32/visage/$1" },
            { find: /^visage$/, replacement: "@epoch32/visage" }
          ],
          dedupe: ["@epoch32/visage", "visage"]
        }
      };

      if (isZigNative) {
        baseConfig.base = "./";
      }

      return baseConfig;
    }
  };
}
