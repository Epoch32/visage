import type { PageRoute, RouteMatch } from "./types";

/**
 * Matches an incoming URL pathname against discovered page routes and extracts route parameters
 */
export function matchRoute(routes: PageRoute[], rawUrl: string): RouteMatch | null {
  // Strip query strings and hash anchors
  const cleanUrl = rawUrl.split(/[?#]/)[0] || "/";
  let pathname = cleanUrl.replace(/\/+/g, "/");
  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  for (const route of routes) {
    const match = route.pattern.exec(pathname);
    if (match) {
      const params: Record<string, string> = {};
      for (let i = 0; i < route.paramNames.length; i++) {
        const paramName = route.paramNames[i]!;
        const rawVal = match[i + 1];
        if (rawVal !== undefined) {
          try {
            params[paramName] = decodeURIComponent(rawVal);
          } catch {
            params[paramName] = rawVal;
          }
        }
      }

      return {
        route,
        params
      };
    }
  }

  return null;
}
