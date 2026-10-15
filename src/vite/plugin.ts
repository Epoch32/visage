import * as fs from "node:fs";
import * as path from "node:path";
import { compileJsx } from "./compiler";
import type { DetectedOrigins } from "./compiler/types";
import { buildCspString, extractOriginFromUrl, injectCspMetaTag } from "./csp";
import { transformHmr } from "./hmr";
import { scaffoldZigNative } from "./native-scaffold";
import { createViteRpcMiddleware } from "./rpc-middleware";
import type { CSPOptions, VisagePluginOptions, VisageVitePlugin } from "./types";

function extractOriginsFromHtml(html: string, detectedOrigins: DetectedOrigins): void {
  const matches = html.matchAll(/<(?:img|iframe|video|audio|source|link)\b[^>]+>/gi);
  for (const match of matches) {
    const tag = match[0];
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
    const hrefMatch = tag.match(/\bhref=["']([^"']+)["']/i);
    const url = srcMatch?.[1] || hrefMatch?.[1];
    if (url) {
      const origin = extractOriginFromUrl(url);
      if (origin) {
        if (/^<img\b/i.test(tag)) detectedOrigins.img.add(origin);
        else if (/^<iframe\b/i.test(tag)) detectedOrigins.frame.add(origin);
        else if (/^<(?:video|audio|source)\b/i.test(tag)) detectedOrigins.media.add(origin);
        else if (/^<link\b/i.test(tag)) {
          if (/rel=["']stylesheet["']/i.test(tag)) detectedOrigins.style.add(origin);
          else if (/as=["']font["']/i.test(tag)) detectedOrigins.font.add(origin);
        }
      }
    }
  }
}

function scanProjectOrigins(
  dir: string,
  cspOpts: boolean | CSPOptions,
  detectedOrigins: DetectedOrigins,
  compilerOpts: any
): void {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name.startsWith(".") ||
        entry.name === "zig-out" ||
        entry.name === "zig-pkg" ||
        entry.name === ".zig-cache"
      ) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanProjectOrigins(fullPath, cspOpts, detectedOrigins, compilerOpts);
      } else if (/\.[jt]sx$/.test(entry.name)) {
        try {
          const code = fs.readFileSync(fullPath, "utf8");
          compileJsx(code, {
            filename: fullPath,
            ...compilerOpts,
            csp: cspOpts,
            detectedOrigins
          });
        } catch {
          // Ignore parse errors on scratch files
        }
      }
    }
  } catch {
    // Ignore directory read errors
  }
}

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

function inlineSingleFileHtml(
  outDir: string,
  csp?: boolean | CSPOptions,
  detectedOrigins?: DetectedOrigins
): void {
  const htmlPath = path.join(outDir, "index.html");
  if (!fs.existsSync(htmlPath)) return;

  let html = fs.readFileSync(htmlPath, "utf8");

  if (csp) {
    const cspString = buildCspString(csp, detectedOrigins);
    html = injectCspMetaTag(html, cspString);
  }

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

  const isSecureTransforms = Boolean(options.experimental?.secureTransforms);
  const secureTransformsOpts =
    typeof options.experimental?.secureTransforms === "object"
      ? options.experimental.secureTransforms
      : true;

  const isCsp = Boolean(options.experimental?.csp);
  const cspOpts = typeof options.experimental?.csp === "object" ? options.experimental.csp : true;

  const detectedOrigins: DetectedOrigins = {
    connect: new Set<string>(),
    img: new Set<string>(),
    font: new Set<string>(),
    style: new Set<string>(),
    media: new Set<string>(),
    frame: new Set<string>()
  };

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
          inlineSingleFileHtml(
            path.resolve(process.cwd(), "dist"),
            options.experimental?.csp,
            detectedOrigins
          );
        }
        if (zigOpts.scaffold !== false && typeof process !== "undefined") {
          scaffoldZigNative(process.cwd(), zigOpts);
        }
      }
    });
  }

  const compilerOpts: any = typeof options.compiler === "object" ? { ...options.compiler } : {};
  if (isSecureTransforms) {
    compilerOpts.security = secureTransformsOpts;
  }
  if (isCsp) {
    compilerOpts.csp = cspOpts;
    compilerOpts.detectedOrigins = detectedOrigins;
  }

  if (options.compiler || isSecureTransforms || isCsp) {
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

  if (isCsp) {
    let hasPreScanned = false;
    let projectRoot = typeof process !== "undefined" ? process.cwd() : ".";

    plugins.push({
      name: "visage:csp",
      configResolved(config) {
        if (config?.root) {
          projectRoot = config.root;
        }
      },
      transformIndexHtml(html: string) {
        const shouldAutoDetect = typeof cspOpts !== "object" || cspOpts.autoDetectOrigins !== false;
        if (shouldAutoDetect && !hasPreScanned) {
          scanProjectOrigins(projectRoot, cspOpts, detectedOrigins, compilerOpts);
          hasPreScanned = true;
        }
        extractOriginsFromHtml(html, detectedOrigins);
        const cspString = buildCspString(cspOpts, detectedOrigins);
        return injectCspMetaTag(html, cspString);
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
