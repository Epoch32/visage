import * as fs from "node:fs";
import * as path from "node:path";
import type { PageRoute, PageSpecialFiles } from "./types";

/**
 * Normalizes Windows backslashes to standard forward slashes
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Resolves the pages directory based on configuration and conventional locations
 */
export function resolvePagesDir(root: string, configuredDir?: string): string | null {
  if (configuredDir) {
    const customPath = path.isAbsolute(configuredDir)
      ? configuredDir
      : path.resolve(root, configuredDir);
    return fs.existsSync(customPath) ? customPath : null;
  }

  const srcPages = path.resolve(root, "src/pages");
  if (fs.existsSync(srcPages)) return srcPages;

  const rootPages = path.resolve(root, "pages");
  if (fs.existsSync(rootPages)) return rootPages;

  return null;
}

/**
 * Recursively scans the pages directory to discover routes and special layout/document files
 */
export function scanPages(pagesDir: string): { routes: PageRoute[]; special: PageSpecialFiles } {
  const routes: PageRoute[] = [];
  const special: PageSpecialFiles = {};

  if (!fs.existsSync(pagesDir)) {
    return { routes, special };
  }

  function walk(currentDir: string, relativePrefix: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "__tests__"
      ) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.join(relativePrefix, entry.name).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        walk(fullPath, relativePath);
        continue;
      }

      // Filter for valid page component extensions
      if (!/\.[jt]sx$/.test(entry.name) || entry.name.endsWith(".d.ts")) {
        continue;
      }
      if (/\.(test|spec)\.[jt]sx$/.test(entry.name)) {
        continue;
      }

      // Check special root convention files
      const baseName = entry.name.replace(/\.[jt]sx$/, "");
      if (relativePrefix === "" || relativePrefix === ".") {
        if (baseName === "_layout") {
          special.layout = fullPath;
          continue;
        }
        if (baseName === "_document") {
          special.document = fullPath;
          continue;
        }
        if (baseName === "404" || baseName === "_404") {
          special.notFound = fullPath;
          continue;
        }
      }

      // Skip private or non-route files starting with _
      if (baseName.startsWith("_")) {
        continue;
      }

      // Process standard page route
      const route = createRouteFromFile(pagesDir, fullPath, relativePath);
      if (route) {
        routes.push(route);
      }
    }
  }

  walk(pagesDir, "");

  // Sort routes by specificity: static > dynamic > catch-all
  routes.sort(compareRoutes);

  return { routes, special };
}

/**
 * Converts a page file path into a URL route definition with regex matching
 */
export function createRouteFromFile(
  pagesDir: string,
  filePath: string,
  relativePath: string
): PageRoute | null {
  void pagesDir;
  // Normalize path without extension
  const cleanPath = relativePath.replace(/\.[jt]sx$/, "").replace(/\\/g, "/");
  const segments = cleanPath.split("/").filter(Boolean);

  const isIndex =
    segments.length === 0 ||
    (segments.length === 1 && segments[0] === "index") ||
    segments[segments.length - 1] === "index";

  // Remove trailing "index" for route URL construction
  const routeSegments = isIndex && segments.length > 0 ? segments.slice(0, -1) : segments;

  const paramNames: string[] = [];
  let isDynamic = false;
  let isCatchAll = false;

  const regexParts: string[] = [];
  const displayParts: string[] = [];

  for (const seg of routeSegments) {
    // Catch-all segment: [...slug]
    const catchAllMatch = seg.match(/^\[\.\.\.([a-zA-Z0-9_-]+)\]$/);
    if (catchAllMatch) {
      isCatchAll = true;
      const paramName = catchAllMatch[1]!;
      paramNames.push(paramName);
      regexParts.push("(.+)");
      displayParts.push("*");
      continue;
    }

    // Dynamic segment: [id]
    const dynamicMatch = seg.match(/^\[([a-zA-Z0-9_-]+)\]$/);
    if (dynamicMatch) {
      isDynamic = true;
      const paramName = dynamicMatch[1]!;
      paramNames.push(paramName);
      regexParts.push("([^/]+)");
      displayParts.push(`:${paramName}`);
      continue;
    }

    // Static segment: escape regex characters
    const escaped = seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regexParts.push(escaped);
    displayParts.push(seg);
  }

  let urlPath = `/${displayParts.join("/")}`;
  if (urlPath !== "/" && urlPath.endsWith("/")) {
    urlPath = urlPath.slice(0, -1);
  }

  const patternStr = regexParts.length === 0 ? "^/?$" : `^/${regexParts.join("/")}/?$`;
  const pattern = new RegExp(patternStr);

  return {
    path: urlPath,
    pattern,
    paramNames,
    filePath,
    relativePath,
    isDynamic,
    isCatchAll,
    isIndex
  };
}

/**
 * Route sorting comparator:
 * 1. Static routes come before dynamic routes
 * 2. Dynamic routes come before catch-all routes
 * 3. Deeper routes come before shallow routes
 */
function compareRoutes(a: PageRoute, b: PageRoute): number {
  if (a.isCatchAll !== b.isCatchAll) {
    return a.isCatchAll ? 1 : -1;
  }
  if (a.isDynamic !== b.isDynamic) {
    return a.isDynamic ? 1 : -1;
  }
  const aSegs = a.path.split("/").filter(Boolean).length;
  const bSegs = b.path.split("/").filter(Boolean).length;
  if (aSegs !== bSegs) {
    return bSegs - aSegs;
  }
  return a.path.localeCompare(b.path);
}
