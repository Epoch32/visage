import { matchesRulePattern } from "./pattern";

/**
 * Resolve client headers with path-matching pattern rules and async resolvers
 */
export async function resolveHeaders(
  headers?:
    | Record<string, string>
    | Record<string, any>
    | (() => Promise<Record<string, string>> | Record<string, string>),
  fullPath = "",
  matcher: (pattern: string, path: string, fullPath: string) => boolean = matchesRulePattern
): Promise<Record<string, string>> {
  if (!headers) return {};
  if (typeof headers === "function") {
    return await headers();
  }

  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    if (typeof val === "object" || typeof val === "function") {
      const isMatch = matcher ? matcher(key, fullPath, fullPath) : false;
      if (isMatch) {
        const resolved = typeof val === "function" ? await val() : val;
        if (resolved && typeof resolved === "object") {
          Object.assign(result, resolved);
        }
      }
    } else if (typeof val === "string") {
      result[key] = val;
    }
  }
  return result;
}
