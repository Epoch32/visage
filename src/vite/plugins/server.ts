import { pc, type VisageLogger } from "../logger";
import { createViteRpcMiddleware } from "../rpc-middleware";
import type { VisagePluginOptions, VisageVitePlugin } from "../types";

export function createServerPlugin(
  options: VisagePluginOptions,
  vLog: VisageLogger,
  isDev: boolean
): VisageVitePlugin {
  return {
    name: "visage:server",
    apply: "serve",
    configureServer(server) {
      if (options.rpc) {
        const endpoint = options.rpc.endpoint ?? "/api/rpc";
        server.middlewares.use(createViteRpcMiddleware(options.rpc));
        vLog.info(
          "visage:rpc",
          `Type-safe full-stack RPC middleware mounted ${pc.dim(`(${endpoint})`)}`
        );
      }
      if (options.devtools !== false && isDev) {
        vLog.info(
          "visage:devtools",
          `DevTools instrumentation active ${pc.dim("(DOM inspector enabled)")}`
        );
      }
    },
    transformIndexHtml(html: string) {
      if (options.devtools === false || !isDev) {
        return html;
      }
      // Inject DevTools hint meta
      if (!html.includes('name="visage-devtools"')) {
        vLog.info("visage:devtools", "Injected DevTools runtime marker into HTML shell");
        return html.replace(
          "<head>",
          '<head>\n    <meta name="visage-devtools" content="enabled" />'
        );
      }
      return html;
    }
  };
}
