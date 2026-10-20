/**
 * Visage HTTP Cache-Control Utilities
 * Implements RFC 9111 §5.2 (Cache-Control Directives)
 */

export interface CacheControlDirectives {
  /**
   * `public`: Indicates that any cache may store the response (RFC 9111 §5.2.2.9).
   */
  public?: boolean;

  /**
   * `private`: Indicates that the response is intended for a single user and MUST NOT
   * be stored by a shared cache (e.g. Cloudflare edge / CDN) (RFC 9111 §5.2.2.7).
   * Can optionally specify field-names.
   */
  private?: boolean | string[];

  /**
   * `no-cache`: Forces caches to submit the request to the origin server for validation
   * before releasing a cached copy (RFC 9111 §5.2.2.4).
   * Can optionally specify field-names.
   */
  noCache?: boolean | string[];

  /**
   * `no-store`: Instructs caches not to store any part of the request or response (RFC 9111 §5.2.2.5).
   */
  noStore?: boolean;

  /**
   * `no-transform`: Forbids intermediaries from converting or transforming representation (RFC 9111 §5.2.2.6).
   */
  noTransform?: boolean;

  /**
   * `must-revalidate`: Once a response has become stale, a cache MUST NOT use it without
   * successful validation with origin (RFC 9111 §5.2.2.2).
   */
  mustRevalidate?: boolean;

  /**
   * `proxy-revalidate`: Same as `must-revalidate`, but applies only to shared caches (RFC 9111 §5.2.2.8).
   */
  proxyRevalidate?: boolean;

  /**
   * `must-understand`: Cache must not store unless it understands status code requirements (RFC 9111 §5.2.2.3).
   */
  mustUnderstand?: boolean;

  /**
   * `max-age=<seconds>`: Maximum amount of time in seconds a response is considered fresh (RFC 9111 §5.2.2.1).
   */
  maxAge?: number;

  /**
   * `s-maxage=<seconds>`: Overrides max-age for shared/CDN caches (e.g. Cloudflare) (RFC 9111 §5.2.2.10).
   */
  sMaxAge?: number;

  /**
   * `stale-while-revalidate=<seconds>`: Allows serving stale responses while revalidating asynchronously in background (RFC 5861 / RFC 9111).
   */
  staleWhileRevalidate?: number;

  /**
   * `stale-if-error=<seconds>`: Allows serving stale response if origin returns error (RFC 5861 / RFC 9111).
   */
  staleIfError?: number;

  /**
   * `immutable`: Indicates the response body will not change over time (RFC 8246).
   */
  immutable?: boolean;
}

/**
 * Serialize structured cache directives into an RFC 9111 Cache-Control header string.
 */
export function formatCacheControl(
  directives: CacheControlDirectives | string | null | undefined
): string {
  if (!directives) return "";
  if (typeof directives === "string") return directives;

  const parts: string[] = [];

  if (directives.noStore) {
    parts.push("no-store");
  }

  if (directives.noCache) {
    if (Array.isArray(directives.noCache) && directives.noCache.length > 0) {
      parts.push(`no-cache="${directives.noCache.join(", ")}"`);
    } else {
      parts.push("no-cache");
    }
  }

  if (directives.private) {
    if (Array.isArray(directives.private) && directives.private.length > 0) {
      parts.push(`private="${directives.private.join(", ")}"`);
    } else {
      parts.push("private");
    }
  } else if (directives.public) {
    parts.push("public");
  }

  if (directives.maxAge !== undefined && directives.maxAge >= 0) {
    parts.push(`max-age=${Math.floor(directives.maxAge)}`);
  }

  if (directives.sMaxAge !== undefined && directives.sMaxAge >= 0) {
    parts.push(`s-maxage=${Math.floor(directives.sMaxAge)}`);
  }

  if (directives.mustRevalidate) {
    parts.push("must-revalidate");
  }

  if (directives.proxyRevalidate) {
    parts.push("proxy-revalidate");
  }

  if (directives.noTransform) {
    parts.push("no-transform");
  }

  if (directives.mustUnderstand) {
    parts.push("must-understand");
  }

  if (directives.immutable) {
    parts.push("immutable");
  }

  if (directives.staleWhileRevalidate !== undefined && directives.staleWhileRevalidate >= 0) {
    parts.push(`stale-while-revalidate=${Math.floor(directives.staleWhileRevalidate)}`);
  }

  if (directives.staleIfError !== undefined && directives.staleIfError >= 0) {
    parts.push(`stale-if-error=${Math.floor(directives.staleIfError)}`);
  }

  return parts.join(", ");
}

/**
 * Parse an incoming RFC 9111 Cache-Control header string into structured directives.
 */
export function parseCacheControl(header: string | null | undefined): CacheControlDirectives {
  const result: CacheControlDirectives = {};
  if (!header || typeof header !== "string") return result;

  const directives = header
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  for (const dir of directives) {
    const eqIdx = dir.indexOf("=");
    const name = (eqIdx === -1 ? dir : dir.slice(0, eqIdx)).trim().toLowerCase();
    const rawVal = eqIdx === -1 ? "" : dir.slice(eqIdx + 1).trim();
    const val = rawVal.replace(/^"|"$/g, "");

    switch (name) {
      case "public":
        result.public = true;
        break;
      case "private":
        if (val) {
          result.private = val.split(",").map((s) => s.trim());
        } else {
          result.private = true;
        }
        break;
      case "no-cache":
        if (val) {
          result.noCache = val.split(",").map((s) => s.trim());
        } else {
          result.noCache = true;
        }
        break;
      case "no-store":
        result.noStore = true;
        break;
      case "no-transform":
        result.noTransform = true;
        break;
      case "must-revalidate":
        result.mustRevalidate = true;
        break;
      case "proxy-revalidate":
        result.proxyRevalidate = true;
        break;
      case "must-understand":
        result.mustUnderstand = true;
        break;
      case "immutable":
        result.immutable = true;
        break;
      case "max-age": {
        const num = Number.parseInt(val, 10);
        if (!Number.isNaN(num)) result.maxAge = num;
        break;
      }
      case "s-maxage": {
        const num = Number.parseInt(val, 10);
        if (!Number.isNaN(num)) result.sMaxAge = num;
        break;
      }
      case "stale-while-revalidate": {
        const num = Number.parseInt(val, 10);
        if (!Number.isNaN(num)) result.staleWhileRevalidate = num;
        break;
      }
      case "stale-if-error": {
        const num = Number.parseInt(val, 10);
        if (!Number.isNaN(num)) result.staleIfError = num;
        break;
      }
    }
  }

  return result;
}
