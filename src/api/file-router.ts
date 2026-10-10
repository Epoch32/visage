/**
 * Visage File-Based Router & Middleware Discovery
 */
import { parsePragma, shouldApplyMiddleware } from "./pragma";
import type { ApiProcedure, FileRouteModule, MiddlewareDefinition, RouteMatch } from "./types";

export interface FileRouteEntry {
  filePath: string;
  module: FileRouteModule;
  sourceCode?: string;
}

/**
 * Compile a route path pattern into a regex and parameter list
 * e.g. `/admin/users/:id` or `/admin/files/*slug`
 */
export function compileRoutePattern(path: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const normalized = path.replace(/\/+$/, "") || "/";

  const regexStr = normalized
    .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    })
    .replace(/\*([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return "(.*)";
    });

  const pattern = new RegExp(`^${regexStr}(?:/)?$`);
  return { pattern, paramNames };
}

/**
 * Normalize a file path to an API URL route path and directory
 */
export function normalizeFilePath(rawPath: string): {
  isMiddleware: boolean;
  routePath: string;
  directory: string;
} {
  // Strip relative dots and common root folder prefixes
  const cleaned = rawPath
    .replace(/^\.\//, "")
    .replace(/\.(ts|tsx|js|jsx)$/, "")
    .replace(/^(src\/)?(routes|api)\//, "");

  const parts = cleaned.split("/").filter(Boolean);
  const fileName = parts.pop() || "";
  const isMiddleware = fileName === "_middleware";

  const dirParts = [...parts];
  const directory = `/${dirParts.join("/")}`.replace(/\/+$/, "") || "/";

  if (isMiddleware) {
    return {
      isMiddleware: true,
      routePath: directory,
      directory
    };
  }

  // Handle index files
  if (fileName !== "index") {
    // Transform [id] -> :id and [...slug] -> *slug
    const transformedFile = fileName
      .replace(/\[\.\.\.([a-zA-Z0-9_]+)\]/g, "*$1")
      .replace(/\[([a-zA-Z0-9_]+)\]/g, ":$1");
    parts.push(transformedFile);
  }

  const routePath = `/${parts.join("/")}`.replace(/\/+$/, "") || "/";

  return {
    isMiddleware: false,
    routePath,
    directory
  };
}

/**
 * Build a file-based routing manifest with hierarchical middleware cascades
 */
export function buildFileRouter(
  files: Record<string, FileRouteModule | { default?: any; [key: string]: any }>,
  sourceMap: Record<string, string> = {}
): RouteMatch[] {
  const middlewaresByDir: MiddlewareDefinition[] = [];
  const rawRoutes: Array<{
    filePath: string;
    routePath: string;
    directory: string;
    module: FileRouteModule;
  }> = [];

  // 1. Separate middlewares and route handlers
  for (const [filePath, mod] of Object.entries(files)) {
    const { isMiddleware, routePath, directory } = normalizeFilePath(filePath);
    const sourceCode = sourceMap[filePath] || "";
    const pragma = mod.pragma || parsePragma(sourceCode);

    if (isMiddleware) {
      const mwFn = typeof mod === "function" ? (mod as any) : mod.middleware || mod.default;

      if (typeof mwFn === "function") {
        middlewaresByDir.push({
          fn: mwFn,
          pragma,
          filePath,
          directory
        });
      }
    } else {
      rawRoutes.push({
        filePath,
        routePath,
        directory,
        module: mod as FileRouteModule
      });
    }
  }

  // 2. Sort middlewares by directory depth & priority
  middlewaresByDir.sort((a, b) => {
    const dirA = a.directory || "/";
    const dirB = b.directory || "/";
    const depthA = dirA.split("/").filter(Boolean).length;
    const depthB = dirB.split("/").filter(Boolean).length;
    if (depthA !== depthB) return depthA - depthB;
    return (b.pragma.priority ?? 0) - (a.pragma.priority ?? 0);
  });

  // 3. Assemble routes with applicable cascading middlewares
  const routes: RouteMatch[] = [];

  for (const raw of rawRoutes) {
    const applicableMiddlewares = middlewaresByDir.filter((mw) =>
      shouldApplyMiddleware(mw.pragma, raw.routePath, raw.directory, mw.directory || "/")
    );

    const { pattern, paramNames } = compileRoutePattern(raw.routePath);
    const procedures: Record<string, ApiProcedure> = {};

    // Extract procedures or standard export
    const mod = raw.module;
    if (mod.default && typeof mod.default === "object" && "type" in mod.default) {
      procedures.default = mod.default as ApiProcedure;
    }

    for (const [key, val] of Object.entries(mod)) {
      if (val && typeof val === "object" && "type" in val && "options" in val) {
        procedures[key] = val as ApiProcedure;
      }
    }

    const handler =
      typeof mod.default === "function" && !("type" in mod.default)
        ? (mod.default as (req: Request, ctx: any) => Promise<Response> | Response)
        : undefined;

    routes.push({
      pattern,
      paramNames,
      routePath: raw.routePath,
      filePath: raw.filePath,
      directory: raw.directory,
      procedures,
      middlewares: applicableMiddlewares,
      handler
    });
  }

  // 4. Sort routes: static paths before parameterized paths
  routes.sort((a, b) => {
    const isParamA = a.routePath.includes(":") || a.routePath.includes("*");
    const isParamB = b.routePath.includes(":") || b.routePath.includes("*");
    if (isParamA !== isParamB) return isParamA ? 1 : -1;
    return b.routePath.length - a.routePath.length;
  });

  return routes;
}
