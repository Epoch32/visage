import { transformHmr } from "./hmr";
import { createViteRpcMiddleware } from "./rpc-middleware";
import type { VisagePluginOptions, VisageVitePlugin } from "./types";

/**
 * Official Visage Vite Plugin
 *
 * Provides zero-configuration JSX compilation, Hot Module Replacement (HMR),
 * DevTools auto-injection, and full-stack RPC development server middleware.
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
declare const process: any;

export function visage(options: VisagePluginOptions = {}): VisageVitePlugin[] {
  const isDev = typeof process !== "undefined" ? process.env?.NODE_ENV !== "production" : true;

  const configPlugin: VisageVitePlugin = {
    name: "visage:config",
    config(_userConfig, { command }) {
      return {
        esbuild: {
          jsx: "automatic",
          jsxImportSource: "visage",
          jsxDev: command === "serve"
        },
        optimizeDeps: {
          include: [
            "visage",
            "visage/signals",
            "visage/dom",
            "visage/query",
            "visage/rpc",
            "visage/style",
            "visage/router",
            "visage/form",
            "visage/virtual",
            "visage/devtools"
          ]
        },
        resolve: {
          dedupe: ["visage"]
        }
      };
    }
  };

  const transformPlugin: VisageVitePlugin = {
    name: "visage:transform",
    transform(code: string, id: string) {
      if (options.hmr !== false && isDev) {
        return transformHmr(code, id);
      }
      return null;
    }
  };

  const devServerPlugin: VisageVitePlugin = {
    name: "visage:server",
    apply: "serve",
    configureServer(server) {
      if (options.rpc) {
        server.middlewares.use(createViteRpcMiddleware(options.rpc));
      }
    },
    transformIndexHtml(html: string) {
      if (options.devtools === false || !isDev) {
        return html;
      }
      // Inject DevTools hint meta
      if (!html.includes('name="visage-devtools"')) {
        return html.replace(
          "<head>",
          '<head>\n    <meta name="visage-devtools" content="enabled" />'
        );
      }
      return html;
    }
  };

  return [configPlugin, transformPlugin, devServerPlugin];
}

export default visage;
