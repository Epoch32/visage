/**
 * Match a URL path or procedure path against a glob / wildcard / exact rule pattern.
 */
export function matchesRulePattern(
  pattern: string,
  urlPath: string,
  procedurePath: string
): boolean {
  if (pattern === "*") return true;

  const cleanUrl = urlPath.replace(/^\/+|\/+$/g, "");
  const cleanPattern = pattern.replace(/^\/+|\/+$/g, "");
  const cleanProc = procedurePath.replace(/^\/+|\/+$/g, "");

  if (
    cleanUrl === cleanPattern ||
    cleanProc === cleanPattern ||
    cleanProc === cleanPattern.replace(/\//g, ".")
  ) {
    return true;
  }

  if (cleanPattern.endsWith("*")) {
    const prefix = cleanPattern.slice(0, -1);
    if (cleanUrl.startsWith(prefix) || cleanProc.startsWith(prefix)) {
      return true;
    }
    const dotPrefix = prefix.replace(/\//g, ".");
    if (cleanProc.startsWith(dotPrefix)) {
      return true;
    }
  }

  try {
    const regexStr = cleanPattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(cleanUrl) || regex.test(cleanProc);
  } catch {
    return false;
  }
}
