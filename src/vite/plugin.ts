import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { compileJsx } from "./compiler";
import type { DetectedOrigins } from "./compiler/types";
import { buildCspString, extractOriginFromUrl, injectCspMetaTag } from "./csp";
import { transformHmr } from "./hmr";
import { createVisageLogger, pc } from "./logger";
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
  detectedOrigins?: DetectedOrigins,
  virtualOrigin?: string
): void {
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

  // Inline script tags and capture SHA-256 hashes for CSP
  const scriptHashes: string[] = [];
  html = html.replace(
    /<script\b[^>]*src=["'](?:\.\/)?assets\/([^"']+)["'][^>]*><\/script>/gi,
    (match, file) => {
      const assetPath = path.join(outDir, "assets", file);
      if (fs.existsSync(assetPath)) {
        const content = fs.readFileSync(assetPath, "utf8");
        const scriptCode = content.trim();
        try {
          const hash = crypto.createHash("sha256").update(scriptCode).digest("base64");
          scriptHashes.push(`'sha256-${hash}'`);
        } catch {
          // Ignore hash failure if crypto unavailable
        }
        return `<script type="module">${scriptCode}</script>`;
      }
      return match;
    }
  );

  // If virtualOrigin is set, ensure <base href="${virtualOrigin}/"> is present
  if (virtualOrigin && !/<base\b/i.test(html)) {
    const voBase = virtualOrigin.endsWith("/") ? virtualOrigin : `${virtualOrigin}/`;
    html = html.replace(/(<head\b[^>]*>)/i, `$1\n    <base href="${voBase}">`);
  }

  if (csp) {
    const mergedCspOpts: CSPOptions = typeof csp === "object" ? { ...csp } : {};
    if (virtualOrigin) {
      mergedCspOpts.virtualOrigin = virtualOrigin;
    }
    if (scriptHashes.length > 0) {
      const scriptSrc = new Set(mergedCspOpts.scriptSrc ?? ["'self'"]);
      for (const h of scriptHashes) scriptSrc.add(h);
      if (virtualOrigin) scriptSrc.add(virtualOrigin.replace(/\/+$/, ""));
      mergedCspOpts.scriptSrc = Array.from(scriptSrc);
    }
    const cspString = buildCspString(mergedCspOpts, detectedOrigins);
    html = injectCspMetaTag(html, cspString);
  }

  fs.writeFileSync(htmlPath, html, "utf8");
}

export function visage(options: VisagePluginOptions = {}): VisageVitePlugin[] {
  const isDev = typeof process !== "undefined" ? process.env?.NODE_ENV !== "production" : true;
  const isZigNative = Boolean(options.experimental?.zigNative);
  const zigOpts =
    typeof options.experimental?.zigNative === "object" ? options.experimental.zigNative : {};
  const vLog = createVisageLogger();

  const configPlugin: VisageVitePlugin = {
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

  const isCsp =
    Boolean(options.experimental?.csp) &&
    (typeof options.experimental?.csp !== "object" ||
      (options.experimental.csp as any).enabled !== false);
  const cspOpts: any =
    typeof options.experimental?.csp === "object"
      ? { ...options.experimental.csp }
      : isCsp
        ? {}
        : false;

  const virtualOrigin =
    (typeof cspOpts === "object" ? cspOpts.virtualOrigin : undefined) ||
    (typeof zigOpts === "object" ? zigOpts.virtualOrigin : undefined) ||
    (isZigNative ? "visage://localhost" : undefined);

  if (virtualOrigin && typeof cspOpts === "object") {
    cspOpts.virtualOrigin = virtualOrigin;
  }

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
        vLog.info(
          "visage:native",
          `Zig native desktop compilation target active ${pc.dim(`(window: "${zigOpts.title ?? "Visage Native"}", origin: ${virtualOrigin})`)}`
        );
      },
      closeBundle() {
        if (typeof process !== "undefined") {
          inlineSingleFileHtml(
            path.resolve(process.cwd(), "dist"),
            cspOpts,
            detectedOrigins,
            virtualOrigin
          );
          vLog.info(
            "visage:native",
            `Inlined single-file HTML bundle for embedded webview distribution ${pc.dim("(dist/index.html)")}`
          );
        }
        if (zigOpts.scaffold !== false && typeof process !== "undefined") {
          scaffoldZigNative(process.cwd(), { ...zigOpts, virtualOrigin });
          vLog.info("visage:native", "Synchronized native Zig scaffold and build configuration");
        }
      }
    });
  }

  const compilerOpts: any = typeof options.compiler === "object" ? { ...options.compiler } : {};
  compilerOpts.logger = vLog;
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
      buildStart() {
        if (options.compiler) {
          const target = options.ssr ? "ssr" : "client";
          vLog.info(
            "visage:compiler",
            `AOT JSX template compiler armed ${pc.dim(`(target: ${target})`)}`
          );
        }
        if (isSecureTransforms) {
          vLog.info(
            "visage:security",
            `AST security transforms active ${pc.dim("(6 shields armed: URL, rel, clobber, HTML, events, spreads)")}`
          );
        }
      },
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
        } catch (err: any) {
          if (err?.message?.includes("[visage:security]")) {
            vLog.error("visage:security", `${path.basename(id)}: ${err.message}`);
          }
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
      buildStart() {
        const voDetail = virtualOrigin ? `, origin: ${virtualOrigin}` : "";
        vLog.info(
          "visage:csp",
          `Content Security Policy generator armed ${pc.dim(`(strict zero-trust${voDetail})`)}`
        );
        const shouldAutoDetect = typeof cspOpts !== "object" || cspOpts.autoDetectOrigins !== false;
        if (shouldAutoDetect && !hasPreScanned) {
          scanProjectOrigins(projectRoot, cspOpts, detectedOrigins, compilerOpts);
          hasPreScanned = true;
          const originCount =
            detectedOrigins.connect.size +
            detectedOrigins.img.size +
            detectedOrigins.font.size +
            detectedOrigins.style.size +
            detectedOrigins.media.size +
            detectedOrigins.frame.size;
          if (originCount > 0) {
            const originsSample = [
              ...detectedOrigins.connect,
              ...detectedOrigins.img,
              ...detectedOrigins.font,
              ...detectedOrigins.style,
              ...detectedOrigins.media,
              ...detectedOrigins.frame
            ];
            vLog.info(
              "visage:csp",
              `Auto-whitelisted ${originCount} external origin${originCount > 1 ? "s" : ""} from project scan ${pc.dim(`(${originsSample.slice(0, 3).join(", ")}${originCount > 3 ? ", ..." : ""})`)}`
            );
          }
        }
      },
      transformIndexHtml(html: string) {
        const shouldAutoDetect = typeof cspOpts !== "object" || cspOpts.autoDetectOrigins !== false;
        if (shouldAutoDetect && !hasPreScanned) {
          scanProjectOrigins(projectRoot, cspOpts, detectedOrigins, compilerOpts);
          hasPreScanned = true;
        }
        extractOriginsFromHtml(html, detectedOrigins);
        let transformedHtml = html;
        if (virtualOrigin && !/<base\b/i.test(transformedHtml)) {
          const voBase = virtualOrigin.endsWith("/") ? virtualOrigin : `${virtualOrigin}/`;
          transformedHtml = transformedHtml.replace(
            /(<head\b[^>]*>)/i,
            `$1\n    <base href="${voBase}">`
          );
        }
        const cspString = buildCspString(cspOpts, detectedOrigins);
        vLog.debug(
          "visage:csp",
          `Injected CSP meta tag into HTML shell ${pc.dim(`(${cspString.slice(0, 45)}...)`)}`
        );
        return injectCspMetaTag(transformedHtml, cspString);
      }
    });
  }

  const transformPlugin: VisageVitePlugin = {
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

  const devServerPlugin: VisageVitePlugin = {
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

  plugins.push(transformPlugin, devServerPlugin);
  return plugins;
}

export default visage;
