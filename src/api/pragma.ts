/**
 * Visage API Pragma Parser & Path Pattern Matcher
 * Parses `// @visage-middleware` pragmas at the top of middleware files.
 */
import type { MiddlewarePragma } from "./types";

const PRAGMA_REGEX =
  /(?:\/\/\s*@visage-middleware\s+([^\r\n]+))|(?:\/\*\s*@visage-middleware\s+([\s\S]*?)\*\/)/i;

/**
 * Parse top-level `// @visage-middleware` pragma from file source code
 */
export function parsePragma(sourceCode: string): MiddlewarePragma {
  if (!sourceCode || typeof sourceCode !== "string") {
    return { cascade: true, match: ["*"], exclude: [], priority: 0 };
  }

  const match = sourceCode.match(PRAGMA_REGEX);
  if (!match) {
    return { cascade: true, match: ["*"], exclude: [], priority: 0 };
  }

  const rawDirective = (match[1] || match[2] || "").trim();
  const pragma: MiddlewarePragma = {
    cascade: true,
    match: ["*"],
    exclude: [],
    priority: 0
  };

  // Parse comma-separated or key-value options: cascade: true, match: ["..."], exclude: ["..."]
  const pairs = rawDirective.split(/,(?![^[]*\])/);
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;

    const key = pair.slice(0, colonIdx).trim().toLowerCase();
    const valStr = pair.slice(colonIdx + 1).trim();

    if (key === "cascade") {
      pragma.cascade = valStr === "true" || valStr === "1";
    } else if (key === "priority") {
      const num = Number.parseInt(valStr, 10);
      if (!Number.isNaN(num)) pragma.priority = num;
    } else if (key === "match" || key === "exclude") {
      let items: string[] = [];
      if (valStr.startsWith("[") && valStr.endsWith("]")) {
        try {
          items = JSON.parse(valStr.replace(/'/g, '"'));
        } catch {
          items = valStr
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
            .filter(Boolean);
        }
      } else {
        items = [valStr.replace(/^['"]|['"]$/g, "")];
      }

      if (key === "match") pragma.match = items;
      if (key === "exclude") pragma.exclude = items;
    }
  }

  return pragma;
}

/**
 * Convert a glob-like pattern (e.g. `admin/*`, `users/**`, `stats`) into a RegExp
 */
export function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.trim().replace(/^\/+|\/+$/g, "");
  if (normalized === "*" || normalized === "**" || normalized === "") {
    return /^.*$/;
  }

  const escaped = normalized
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "___DOUBLE_STAR___")
    .replace(/\*/g, "[^/]+")
    .replace(/___DOUBLE_STAR___/g, ".*");

  return new RegExp(`^(?:/)?${escaped}(?:/)?$`);
}

/**
 * Test whether a normalized route path matches any glob pattern in a list
 */
export function matchesAnyPattern(routePath: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) return false;
  const cleanPath = routePath.replace(/^\/+|\/+$/g, "");

  for (const pat of patterns) {
    const cleanPat = pat.replace(/^\/+|\/+$/g, "");
    if (cleanPat === "*" || cleanPat === "**") return true;
    if (cleanPat === cleanPath) return true;
    if (globToRegExp(cleanPat).test(cleanPath)) return true;
  }

  return false;
}

/**
 * Evaluate if a middleware definition should apply to a specific route
 */
export function shouldApplyMiddleware(
  pragma: MiddlewarePragma,
  routePath: string,
  routeDir: string,
  middlewareDir: string
): boolean {
  const normRouteDir = routeDir.replace(/^\/+|\/+$/g, "");
  const normMwDir = middlewareDir.replace(/^\/+|\/+$/g, "");

  // 1. Ancestor check: routeDir must be equal to or a subfolder of middlewareDir
  const isDirectDir = normRouteDir === normMwDir;
  const isSubDir =
    normMwDir === "" ? normRouteDir !== "" : normRouteDir.startsWith(`${normMwDir}/`);

  if (!isDirectDir && !isSubDir) {
    return false;
  }

  // 2. Cascading check: if route is in a subfolder and cascade is false, do not apply
  const isCascade = pragma.cascade ?? true;
  if (isSubDir && !isCascade) {
    return false;
  }

  // 3. Relative route path within the middleware's domain
  let relativePath = routePath.replace(/^\/+|\/+$/g, "");
  if (normMwDir && relativePath.startsWith(normMwDir)) {
    relativePath = relativePath.slice(normMwDir.length).replace(/^\/+/, "");
  }

  // 4. Exclude rule takes immediate precedence
  if (pragma.exclude && pragma.exclude.length > 0) {
    if (
      matchesAnyPattern(routePath, pragma.exclude) ||
      matchesAnyPattern(relativePath, pragma.exclude)
    ) {
      return false;
    }
  }

  // 5. Match rule
  if (!pragma.match || pragma.match.length === 0 || pragma.match.includes("*")) {
    return true;
  }

  return (
    matchesAnyPattern(routePath, pragma.match) || matchesAnyPattern(relativePath, pragma.match)
  );
}
