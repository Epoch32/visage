import * as fs from "node:fs";
import * as path from "node:path";
import { createVisageLogger, pc, type VisageLogger } from "../logger";
import {
  generateClientEntry,
  generateDefault404Html,
  generateHtmlShell,
  generateNotFoundEntry
} from "../pages/generator";
import { matchRoute } from "../pages/matcher";
import { resolvePagesDir, scanPages } from "../pages/scanner";
import type { PageRoute, PageSpecialFiles, PagesOptions } from "../pages/types";
import type { VisageVitePlugin } from "../types";

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
  let outDir = "dist";
  let isDev = true;

  function refreshRoutes() {
    if (pagesDir) {
      const res = scanPages(pagesDir);
      routes = res.routes;
      special = res.special;
    }
  }

  return {
    name: "visage:pages",
    configResolved(config) {
      projectRoot = config.root;
      isDev = config.command === "serve";
      outDir = config.build?.outDir || "dist";
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

      // Watch for added/deleted page files in dev
      server.watcher.on("add", (filePath: string) => {
        if (filePath.startsWith(pagesDir!) && /\.[jt]sx$/.test(filePath)) {
          refreshRoutes();
          vLog.info(
            "visage:pages",
            `Discovered new route component ${pc.dim(path.basename(filePath))}`
          );
        }
      });
      server.watcher.on("unlink", (filePath: string) => {
        if (filePath.startsWith(pagesDir!) && /\.[jt]sx$/.test(filePath)) {
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

        // Match against discovered page routes
        const match = matchRoute(routes, req.url);
        if (match) {
          const rootId = options.rootId || "visage-root";
          const clientEntryUrl = `/@visage-pages-entry?file=${encodeURIComponent(match.route.filePath)}&params=${encodeURIComponent(JSON.stringify(match.params))}`;

          const rawHtml = generateHtmlShell({
            title: options.title,
            rootId,
            clientEntryUrl
          });

          try {
            const html = await server.transformIndexHtml(req.url, rawHtml);
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
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
            clientEntryUrl
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

      // Parse query parameters from the virtual module ID
      const queryIndex = id.indexOf("?");
      const queryString = queryIndex !== -1 ? id.slice(queryIndex) : "";
      const searchParams = new URLSearchParams(queryString);

      const filePath = searchParams.get("file");
      const isNotFound = searchParams.get("notFound") === "true";
      const rawParams = searchParams.get("params");
      const params: Record<string, string> = rawParams ? JSON.parse(rawParams) : {};
      const rootId = options.rootId || "visage-root";

      if (isNotFound && filePath) {
        return generateNotFoundEntry(filePath, rootId);
      }

      if (filePath) {
        // Find matching route or synthesize Route metadata
        let matchedRoute = routes.find((r) => r.filePath === filePath);
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

    closeBundle() {
      // Build-time Static Site Generation (SSG)
      if (isDev || options.ssg === false || !pagesDir || routes.length === 0) {
        return;
      }

      const distPath = path.isAbsolute(outDir) ? outDir : path.resolve(projectRoot, outDir);
      if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true });
      }

      let generatedCount = 0;
      const rootId = options.rootId || "visage-root";

      for (const route of routes) {
        if (route.isDynamic || route.isCatchAll) {
          // Dynamic routes require explicit static paths or server rendering
          continue;
        }

        const targetHtmlPath =
          route.path === "/"
            ? path.join(distPath, "index.html")
            : path.join(distPath, route.path.replace(/^\/+/, ""), "index.html");

        fs.mkdirSync(path.dirname(targetHtmlPath), { recursive: true });

        const clientEntryUrl = `/@visage-pages-entry?file=${encodeURIComponent(route.filePath)}`;
        const html = generateHtmlShell({
          title: options.title,
          rootId,
          clientEntryUrl
        });

        fs.writeFileSync(targetHtmlPath, html, "utf8");
        generatedCount++;
      }

      // If custom 404 page exists, emit 404.html
      if (special.notFound) {
        const notFoundPath = path.join(distPath, "404.html");
        const clientEntryUrl = `/@visage-pages-entry?file=${encodeURIComponent(special.notFound)}&notFound=true`;
        const html = generateHtmlShell({
          title: "404 - Not Found",
          rootId,
          clientEntryUrl
        });
        fs.writeFileSync(notFoundPath, html, "utf8");
        generatedCount++;
      }

      if (generatedCount > 0) {
        vLog.info(
          "visage:pages",
          `SSG static site generation complete ${pc.dim(`(${generatedCount} static HTML file${generatedCount === 1 ? "" : "s"} emitted to ${path.relative(projectRoot, distPath)})`)}`
        );
      }
    }
  };
}

export { createPagesPlugin as visagePages };
