/**
 * Visage HTTP Conditional Requests & 304 Validation
 * Implements RFC 9110 §13.1 (Preconditions), §13.2.2 (Precedence), and §15.4.5 (304 Not Modified)
 */
import { type CacheControlDirectives, formatCacheControl } from "./cache-control";
import { generateETag, matchesETagHeader } from "./etag";

export interface PreconditionResult {
  /**
   * Whether the resource representation is not modified (eligible for 304 Not Modified).
   */
  isNotModified: boolean;
  /**
   * Whether a precondition evaluated to false (RFC 9110 §13.1.1 / §13.1.2), requiring 412 Precondition Failed.
   */
  isPreconditionFailed: boolean;
  /**
   * Recommended status code (304 or 412) if preconditions trigger early exit.
   */
  status?: 304 | 412;
  /**
   * Reason for the precondition outcome.
   */
  reason?: string;
}

export interface PreconditionOptions {
  /**
   * The current entity tag of the server resource.
   */
  etag?: string;
  /**
   * Last-Modified date of the resource.
   */
  lastModified?: Date | string | number;
}

/**
 * Headers to preserve in a 304 Not Modified response per RFC 9110 §15.4.5.
 * Representation-specific headers (Content-Type, Content-Length, Content-Encoding) are excluded.
 */
const RFC9110_304_ALLOWED_HEADERS = new Set([
  "date",
  "etag",
  "cache-control",
  "content-location",
  "vary",
  "expires",
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "access-control-max-age"
]);

/**
 * Filter headers for a 304 Not Modified response according to RFC 9110 §15.4.5.
 */
export function filter304Headers(sourceHeaders: Headers): Headers {
  const headers = new Headers();

  sourceHeaders.forEach((val, key) => {
    const lower = key.toLowerCase();
    if (RFC9110_304_ALLOWED_HEADERS.has(lower)) {
      headers.set(key, val);
    }
  });

  return headers;
}

/**
 * Create an RFC 9110 compliant 304 Not Modified response with no body.
 */
export function create304Response(sourceHeaders: Headers, overrides?: HeadersInit): Response {
  const headers = filter304Headers(sourceHeaders);

  if (overrides) {
    const overrideHeaders = new Headers(overrides);
    overrideHeaders.forEach((val, key) => {
      headers.set(key, val);
    });
  }

  return new Response(null, {
    status: 304,
    statusText: "Not Modified",
    headers
  });
}

/**
 * Evaluate HTTP preconditions according to RFC 9110 §13.2.2 precedence rules.
 *
 * Evaluation order:
 * 1. If-Match
 * 2. If-Unmodified-Since
 * 3. If-None-Match
 * 4. If-Modified-Since
 */
export function evaluatePreconditions(
  req: Request,
  options: PreconditionOptions
): PreconditionResult {
  const method = req.method.toUpperCase();
  const isGetOrHead = method === "GET" || method === "HEAD";

  const ifMatch = req.headers.get("if-match");
  const ifUnmodifiedSince = req.headers.get("if-unmodified-since");
  const ifNoneMatch = req.headers.get("if-none-match");
  const ifModifiedSince = req.headers.get("if-modified-since");

  const serverETag = options.etag;
  const lastModified = options.lastModified ? new Date(options.lastModified) : null;

  // Step 1: When If-Match is present, evaluate with STRONG comparison (RFC 9110 §13.1.1)
  if (ifMatch && serverETag) {
    const matches = matchesETagHeader(ifMatch, serverETag, false);
    if (!matches) {
      return {
        isNotModified: false,
        isPreconditionFailed: true,
        status: 412,
        reason: "If-Match condition failed"
      };
    }
  }

  // Step 2: When If-Unmodified-Since is present (and no If-Match), evaluate (RFC 9110 §13.1.4)
  if (!ifMatch && ifUnmodifiedSince && lastModified && !Number.isNaN(lastModified.getTime())) {
    const unmodifiedDate = new Date(ifUnmodifiedSince);
    if (!Number.isNaN(unmodifiedDate.getTime())) {
      // If resource was modified after unmod date, fail with 412
      if (Math.floor(lastModified.getTime() / 1000) > Math.floor(unmodifiedDate.getTime() / 1000)) {
        return {
          isNotModified: false,
          isPreconditionFailed: true,
          status: 412,
          reason: "If-Unmodified-Since condition failed"
        };
      }
    }
  }

  // Step 3: When If-None-Match is present, evaluate with WEAK comparison (RFC 9110 §13.1.2)
  if (ifNoneMatch && serverETag) {
    const matches = matchesETagHeader(ifNoneMatch, serverETag, true);
    if (matches) {
      if (isGetOrHead) {
        return {
          isNotModified: true,
          isPreconditionFailed: false,
          status: 304,
          reason: "If-None-Match matched (304 Not Modified)"
        };
      }
      return {
        isNotModified: false,
        isPreconditionFailed: true,
        status: 412,
        reason: "If-None-Match matched on modifying method"
      };
    }
  }

  // Step 4: When If-Modified-Since is present (and NO If-None-Match per RFC 9110 §13.1.3)
  if (
    !ifNoneMatch &&
    ifModifiedSince &&
    isGetOrHead &&
    lastModified &&
    !Number.isNaN(lastModified.getTime())
  ) {
    const modifiedSinceDate = new Date(ifModifiedSince);
    if (!Number.isNaN(modifiedSinceDate.getTime())) {
      // If resource has NOT been modified since the given date, return 304
      if (
        Math.floor(lastModified.getTime() / 1000) <= Math.floor(modifiedSinceDate.getTime() / 1000)
      ) {
        return {
          isNotModified: true,
          isPreconditionFailed: false,
          status: 304,
          reason: "If-Modified-Since condition matched (304 Not Modified)"
        };
      }
    }
  }

  return {
    isNotModified: false,
    isPreconditionFailed: false
  };
}

export interface HandleConditionalOptions {
  /**
   * Pre-computed or custom ETag. If omitted and response has string/buffer body, will be auto-generated.
   */
  etag?: string;
  /**
   * Last-Modified timestamp or Date.
   */
  lastModified?: Date | string | number;
  /**
   * Optional Cache-Control directives or header string to attach.
   */
  cacheControl?: CacheControlDirectives | string;
  /**
   * Generate weak ETag (default true).
   */
  weak?: boolean;
}

/**
 * Handle conditional requests and HTTP caching for standard Web Fetch Request/Response.
 *
 * Automatically:
 * - Computes weak ETag if not provided
 * - Evaluates RFC 9110 preconditions (If-None-Match, If-Match, If-Modified-Since)
 * - Returns 304 Not Modified with compliant headers when valid
 * - Returns 412 Precondition Failed when state preconditions fail
 * - Empties response body on HEAD requests while preserving headers (RFC 9110 §9.3.2)
 * - Attaches Cache-Control and ETag headers
 */
export async function handleConditionalResponse(
  req: Request,
  res: Response,
  options: HandleConditionalOptions = {}
): Promise<Response> {
  const method = req.method.toUpperCase();
  let serverETag = options.etag || res.headers.get("etag") || undefined;
  let bodyBuffer: string | ArrayBuffer | null = null;

  // Auto-generate ETag if not present and response is a successful 200 OK
  if (!serverETag && res.status === 200 && res.body) {
    try {
      const cloned = res.clone();
      const text = await cloned.text();
      serverETag = generateETag(text, { weak: options.weak ?? true });
      bodyBuffer = text;
    } catch {
      // Streamed or opaque body that cannot be read
    }
  }

  // Precondition evaluation
  const precondition = evaluatePreconditions(req, {
    etag: serverETag,
    lastModified: options.lastModified
  });

  if (precondition.isNotModified && precondition.status === 304) {
    const finalHeaders = new Headers(res.headers);
    if (serverETag && !finalHeaders.has("etag")) {
      finalHeaders.set("ETag", serverETag);
    }
    if (options.cacheControl && !finalHeaders.has("cache-control")) {
      finalHeaders.set("Cache-Control", formatCacheControl(options.cacheControl));
    }
    return create304Response(finalHeaders);
  }

  if (precondition.isPreconditionFailed && precondition.status === 412) {
    return new Response(null, {
      status: 412,
      statusText: "Precondition Failed",
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  // Construct updated response headers
  const newHeaders = new Headers(res.headers);
  if (serverETag && !newHeaders.has("etag")) {
    newHeaders.set("ETag", serverETag);
  }
  if (options.cacheControl && !newHeaders.has("cache-control")) {
    newHeaders.set("Cache-Control", formatCacheControl(options.cacheControl));
  }
  if (options.lastModified && !newHeaders.has("last-modified")) {
    const d = new Date(options.lastModified);
    if (!Number.isNaN(d.getTime())) {
      newHeaders.set("Last-Modified", d.toUTCString());
    }
  }

  // RFC 9110 §9.3.2: HEAD method handling (same headers, null body)
  if (method === "HEAD") {
    return new Response(null, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders
    });
  }

  // If we consumed the body to calculate ETag, return response with that body
  if (bodyBuffer !== null) {
    return new Response(bodyBuffer, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders
    });
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders
  });
}
