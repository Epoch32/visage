import * as fs from "node:fs";
import * as path from "node:path";
import { generateETag, matchesETagHeader } from "../../http";
import { createVisageLogger, pc, type VisageLogger } from "../logger";
import {
  generateClientEntry,
  generateDefault404Html,
  generateHtmlShell,
  generateNotFoundEntry
} from "../pages/generator";
import { matchRoute } from "../pages/matcher";
import { normalizePath, resolvePagesDir, scanPages } from "../pages/scanner";
import type { PageRoute, PageSpecialFiles, PagesOptions } from "../pages/types";
import type { VisageVitePlugin } from "../types";
import { handlePreviewRouting } from "./pages/preview-middleware";
import { buildSsgAssets } from "./pages/ssg-builder";

declare const process: any;

export function createPagesPlugin(
  options: PagesOptions = {},
  customLogger?: VisageLogger
): VisageVitePlugin {
  const vLog = customLogger ?? createVisageLogger();
  let projectRoot = typeof process !== "undefined" ? process.cwd() : ".";
  let pagesDir: string | null = null;
  let routes: PageRoute[] = [];
  let special: PageSpecialFiles = {};
  let isDev = true;
  let basePrefix = "/";
  let outDir = path.resolve(projectRoot, "dist");

  function refreshRoutes() {
    if (pagesDir) {
      const res = scanPages(pagesDir);
      routes = res.routes;
      special = res.special;
    }
  }

  return {
    name: "visage:pages",

    config(config, env) {
      projectRoot = config.root || (typeof process !== "undefined" ? process.cwd() : ".");
      isDev = env.command === "serve";
      basePrefix = config.base || "/";
      pagesDir = resolvePagesDir(projectRoot, options.dir);

      if (options.layout && fs.existsSync(path.resolve(projectRoot, options.layout))) {
        special.layout = path.resolve(projectRoot, options.layout);
      }
      if (options.document && fs.existsSync(path.resolve(projectRoot, options.document))) {
        special.document = path.resolve(projectRoot, options.document);
      }
      if (options.notFound && fs.existsSync(path.resolve(projectRoot, options.notFound))) {
        special.notFound = path.resolve(projectRoot, options.notFound);
      }

      refreshRoutes();

      // Configure multi-page entry points for Rollup during production build
      if (!isDev && pagesDir && routes.length > 0 && options.ssg !== false) {
        const input: Record<string, string> = {};
        for (const route of routes) {
          if (route.isDynamic || route.isCatchAll) continue;
          const name =
            route.path === "/"
              ? "index"
              : route.path.replace(/^\/+/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
          input[`page-${name}`] = `virtual:visage-pages-entry:${route.path}`;
        }
        if (options.staticPaths && Array.isArray(options.staticPaths)) {
          for (const sp of options.staticPaths) {
            const cleanSp = sp.startsWith("/") ? sp : `/${sp}`;
            const name = cleanSp.replace(/^\/+/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
            input[`page-${name}`] = `virtual:visage-pages-entry:${cleanSp}`;
          }
        }
        if (special.notFound) {
          input["page-404"] = "virtual:visage-pages-entry:404";
        }

        const existingInput = config.build?.rollupOptions?.input;
        const mergedInput =
          existingInput && typeof existingInput === "object" && !Array.isArray(existingInput)
            ? { ...existingInput, ...input }
            : input;

        return {
          appType: "mpa",
          build: {
            rollupOptions: {
              input: mergedInput
            }
          }
        };
      }
    },

    configResolved(config) {
      projectRoot = config.root;
      isDev = config.command === "serve";
      basePrefix = config.base || "/";
      outDir = path.resolve(projectRoot, config.build?.outDir || "dist");
      pagesDir = resolvePagesDir(projectRoot, options.dir);

      if (options.layout && fs.existsSync(path.resolve(projectRoot, options.layout))) {
        special.layout = path.resolve(projectRoot, options.layout);
      }
      if (options.document && fs.existsSync(path.resolve(projectRoot, options.document))) {
        special.document = path.resolve(projectRoot, options.document);
      }
      if (options.notFound && fs.existsSync(path.resolve(projectRoot, options.notFound))) {
        special.notFound = path.resolve(projectRoot, options.notFound);
      }

      refreshRoutes();
    },

    buildStart() {
      if (!pagesDir) return;
      const count = routes.length;
      const sample = routes
        .slice(0, 4)
        .map((r) => r.path)
        .join(", ");
      const more = count > 4 ? `, +${count - 4} more` : "";
      vLog.info(
        "visage:pages",
        `File-system MPA router active ${pc.dim(`(${count} route${count === 1 ? "" : "s"}: [${sample}${more}])`)}`
      );
    },

    configureServer(server) {
      if (!pagesDir) return;

      const normalizedPagesDir = normalizePath(pagesDir);
      const isPageFile = (file: string) => {
        const normalizedFile = normalizePath(file);
        return normalizedFile.startsWith(normalizedPagesDir) && /\.[jt]sx$/.test(normalizedFile);
      };

      // Watch for added/deleted page files in dev
      server.watcher.on("add", (filePath: string) => {
        if (isPageFile(filePath)) {
          refreshRoutes();
          vLog.info(
            "visage:pages",
            `Discovered new route component ${pc.dim(path.basename(filePath))}`
          );
        }
      });
      server.watcher.on("unlink", (filePath: string) => {
        if (isPageFile(filePath)) {
          refreshRoutes();
          vLog.info("visage:pages", `Removed route component ${pc.dim(path.basename(filePath))}`);
        }
      });

      // HTTP request router middleware
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url || req.method !== "GET") return next();

        // Pass through Vite internals, node_modules, and files with static extensions
        const urlWithoutQuery = req.url.split("?")[0] || "/";
        if (
          urlWithoutQuery.startsWith("/@") ||
          urlWithoutQuery.startsWith("/node_modules") ||
          /\.[a-zA-Z0-9_-]+$/.test(urlWithoutQuery)
        ) {
          return next();
        }

        let routeUrl = req.url;
        if (basePrefix && basePrefix !== "/" && routeUrl.startsWith(basePrefix)) {
          routeUrl = routeUrl.slice(basePrefix.length - 1);
        }

        // Match against discovered page routes
        const match = matchRoute(routes, routeUrl);
        if (match) {
          const rootId = options.rootId || "visage-root";
          const clientEntryUrl = `/@visage-pages-entry?file=${encodeURIComponent(match.route.filePath)}&params=${encodeURIComponent(JSON.stringify(match.params))}`;

          const rawHtml = generateHtmlShell({
            title: options.title,
            rootId,
            clientEntryUrl,
            headTags: options.headTags,
            viewTransitions: options.viewTransitions !== false
          });

          try {
            const html = await server.transformIndexHtml(req.url, rawHtml);
            const etag = generateETag(html, { weak: true });
            const ifNoneMatch = req.headers ? req.headers["if-none-match"] : undefined;

            if (ifNoneMatch && matchesETagHeader(ifNoneMatch, etag)) {
              res.statusCode = 304;
              res.statusMessage = "Not Modified";
              res.setHeader("ETag", etag);
              res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
              res.end();
              return;
            }

            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("ETag", etag);
            res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
            res.end(html);
            return;
          } catch (err: any) {
            vLog.error("visage:pages", `Error rendering ${req.url}: ${err?.message || err}`);
            return next(err);
          }
        }

        // Route did not match: serve custom 404 or default 404
        if (special.notFound) {
          const rootId = options.rootId || "visage-root";
          const clientEntryUrl = `/@visage-pages-entry?file=${encodeURIComponent(special.notFound)}&notFound=true`;

          const rawHtml = generateHtmlShell({
            title: "404 - Not Found",
            rootId,
            clientEntryUrl,
            headTags: options.headTags,
            viewTransitions: options.viewTransitions !== false
          });

          const html = await server.transformIndexHtml(req.url, rawHtml);
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(html);
          return;
        }

        // Fallback default 404
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(generateDefault404Html());
      });
    },

    configurePreviewServer(server: any) {
      if (!pagesDir) return;

      server.middlewares.use((req: any, res: any, next: any) => {
        handlePreviewRouting(req, res, next, outDir, basePrefix);
      });
    },

    resolveId(id: string) {
      if (id.startsWith("/@visage-pages-entry") || id.startsWith("virtual:visage-pages-entry")) {
        return `\0${id}`;
      }
      return null;
    },

    load(id: string) {
      if (
        !id.startsWith("\0/@visage-pages-entry") &&
        !id.startsWith("\0virtual:visage-pages-entry")
      ) {
        return null;
      }

      const rootId = options.rootId || "visage-root";

      // 1. Build-time virtual module ID: "\0virtual:visage-pages-entry:<path>"
      if (id.startsWith("\0virtual:visage-pages-entry:")) {
        const routePath = id.slice("\0virtual:visage-pages-entry:".length);

        if (routePath === "404" && special.notFound) {
          return generateNotFoundEntry(special.notFound, rootId, special);
        }

        const match = matchRoute(routes, routePath);
        if (match) {
          return generateClientEntry(match.route, match.params, special, rootId);
        }
      }

      // 2. Dev-time virtual module ID query parameters
      const queryIndex = id.indexOf("?");
      const queryString = queryIndex !== -1 ? id.slice(queryIndex) : "";
      const searchParams = new URLSearchParams(queryString);

      const filePath = searchParams.get("file");
      const isNotFound = searchParams.get("notFound") === "true";
      const rawParams = searchParams.get("params");
      const params: Record<string, string> = rawParams ? JSON.parse(rawParams) : {};

      if (isNotFound && filePath) {
        return generateNotFoundEntry(filePath, rootId, special);
      }

      if (filePath) {
        const normalizedTarget = normalizePath(filePath);
        let matchedRoute = routes.find((r) => normalizePath(r.filePath) === normalizedTarget);
        if (!matchedRoute) {
          matchedRoute = {
            path: "/",
            pattern: /^\/?$/,
            paramNames: [],
            filePath,
            relativePath: path.basename(filePath),
            isDynamic: false,
            isCatchAll: false,
            isIndex: true
          };
        }

        return generateClientEntry(matchedRoute, params, special, rootId);
      }

      return null;
    },

    generateBundle(this: any, _outputOptions: any, bundle: Record<string, any>) {
      if (isDev || options.ssg === false || !pagesDir || routes.length === 0) {
        return;
      }

      const rootId = options.rootId || "visage-root";
      const base = basePrefix.replace(/\/$/, "");

      const entryChunks = new Map<string, any>();
      for (const item of Object.values(bundle)) {
        if (item.type === "chunk" && item.isEntry && item.name) {
          entryChunks.set(item.name, item);
        }
      }

      buildSsgAssets(this, entryChunks, {
        options,
        routes,
        special,
        base,
        rootId,
        vLog
      });
    }
  };
}

export { createPagesPlugin as visagePages };
