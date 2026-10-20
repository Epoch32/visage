import type { MatchedRoute, RouteDefinition } from "./types";

const pathCache = new Map<string, { matcher: RegExp; paramNames: string[] }>();

export function compilePath(path: string): { matcher: RegExp; paramNames: string[] } {
  const cached = pathCache.get(path);
  if (cached) return cached;

  const paramNames: string[] = [];
  const normalized = path.replace(/\/+$/, "") || "/";

  // Escape special regex characters except : and *
  const escaped = normalized.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

  const regexStr = escaped
    .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    })
    .replace(/\*/g, "(.*)");

  const matcher = new RegExp(`^${regexStr}(?:/)?$`);
  const result = { matcher, paramNames };
  pathCache.set(path, result);
  return result;
}

export function matchRoute(
  routes: RouteDefinition[],
  pathname: string,
  base = ""
): MatchedRoute | null {
  const cleanPath =
    base && pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;

  for (const route of routes) {
    const match = cleanPath.match(route.matcher);
    if (match) {
      const params: Record<string, string> = {};
      const captures = match.slice(1);
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(captures[i] ?? "");
      });

      return {
        path: route.path,
        params,
        component: route.component,
        children: route.children
      };
    }
  }

  return null;
}
