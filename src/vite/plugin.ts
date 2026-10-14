import * as fs from "node:fs";
import * as path from "node:path";
import { compileJsx } from "./compiler";
import { transformHmr } from "./hmr";
import { scaffoldZigNative } from "./native-scaffold";
import { createViteRpcMiddleware } from "./rpc-middleware";
import type { VisagePluginOptions, VisageVitePlugin } from "./types";

/**
 * Official Visage Vite Plugin
 *
 * Provides zero-configuration JSX compilation, Hot Module Replacement (HMR),
 * DevTools auto-injection, full-stack RPC development server middleware, and
 * experimental native desktop packaging via Zig.
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

function inlineSingleFileHtml(outDir: string): void {
  const htmlPath = path.join(outDir, "index.html");
  if (!fs.existsSync(htmlPath)) return;

  let html = fs.readFileSync(htmlPath, "utf8");

  // Remove modulepreload links to prevent failed fetches on data / memory origins
  html = html.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, "");

  // Inline stylesheet links
  html = html.replace(
    /<link\b[^>]*href=["'](?:\.\/)?assets\/([^"']+)["'][^>]*>/gi,
    (match, file) => {
      const assetPath = path.join(outDir, "assets", file);
      if (fs.existsSync(assetPath)) {
        const content = fs.readFileSync(assetPath, "utf8");
        return `<style>\n${content}\n</style>`;
      }
      return match;
    }
  );

  // Inline script tags
  html = html.replace(
    /<script\b[^>]*src=["'](?:\.\/)?assets\/([^"']+)["'][^>]*><\/script>/gi,
    (match, file) => {
      const assetPath = path.join(outDir, "assets", file);
      if (fs.existsSync(assetPath)) {
        const content = fs.readFileSync(assetPath, "utf8");
        return `<script type="module">\n${content}\n</script>`;
      }
      return match;
    }
  );

  fs.writeFileSync(htmlPath, html, "utf8");
}

export function visage(options: VisagePluginOptions = {}): VisageVitePlugin[] {
  const isDev = typeof process !== "undefined" ? process.env?.NODE_ENV !== "production" : true;
  const isZigNative = Boolean(options.experimental?.zigNative);
  const zigOpts =
    typeof options.experimental?.zigNative === "object" ? options.experimental.zigNative : {};

  const configPlugin: VisageVitePlugin = {
    name: "visage:config",
    config(_userConfig, { command }) {
      const baseConfig: any = {
        esbuild: {
          jsx: "automatic",
          jsxImportSource: "visage"
        },
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
        // Embedded webviews in native desktop binaries require relative asset paths
        baseConfig.base = "./";
      }

      return baseConfig;
    }
  };

  const plugins: VisageVitePlugin[] = [configPlugin];

  if (isZigNative) {
    plugins.push({
      name: "visage:experimental-native",
      apply: "build",
      buildStart() {
        console.log(
          `[visage:experimental] Zig native compilation target active (window: "${zigOpts.title ?? "Visage Native"}").`
        );
      },
      closeBundle() {
        if (typeof process !== "undefined") {
          inlineSingleFileHtml(path.resolve(process.cwd(), "dist"));
        }
        if (zigOpts.scaffold !== false && typeof process !== "undefined") {
          scaffoldZigNative(process.cwd(), zigOpts);
        }
      }
    });
  }

  if (options.compiler) {
    const compilerOpts = typeof options.compiler === "object" ? options.compiler : {};
    plugins.push({
      name: "visage:compiler",
      enforce: "pre",
      transform(code: string, id: string) {
        if (!/\.[jt]sx($|\?)/.test(id) || id.includes("node_modules")) {
          return null;
        }
        try {
          const res = compileJsx(code, {
            filename: id,
            ...compilerOpts
          });
          return {
            code: res.code
          };
        } catch {
          return null;
        }
      }
    });
  }

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

  plugins.push(transformPlugin, devServerPlugin);
  return plugins;
}

export default visage;
