/**
 * Visage HTTP Entity Tag (ETag) Utilities
 * Implements RFC 9110 §8.8.3 (Entity Tag) & §8.8.3.2 (Comparison)
 */

export interface ETagOptions {
  /**
   * Whether to generate a weak entity tag (prefixed with `W/`).
   * Defaults to `true` for optimal CDN, compression (Cloudflare gzip/brotli),
   * and semantic representation compatibility.
   */
  weak?: boolean;
}

export interface ParsedETag {
  /**
   * Whether the entity tag is weak.
   */
  weak: boolean;
  /**
   * The opaque entity tag value without surrounding quotes or `W/` prefix.
   */
  tag: string;
  /**
   * The canonical string representation formatted per RFC 9110 §8.8.3.
   */
  raw: string;
}

/**
 * Fast 64-bit FNV-1a non-cryptographic hash for string and byte buffers.
 * Zero external runtime dependencies.
 */
export function fnv1a64(input: string | Uint8Array | ArrayBuffer): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  if (typeof input === "string") {
    for (let i = 0; i < input.length; i++) {
      hash ^= BigInt(input.charCodeAt(i));
      hash = (hash * prime) & mask;
    }
  } else {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    for (let i = 0; i < bytes.length; i++) {
      hash ^= BigInt(bytes[i]!);
      hash = (hash * prime) & mask;
    }
  }

  return hash.toString(16).padStart(16, "0");
}

/**
 * Generate an RFC 9110 compliant Entity Tag (ETag) from string or binary content.
 *
 * @param content - String, Uint8Array, or ArrayBuffer content.
 * @param options - Options controlling weak vs strong tag generation.
 * @returns Formatted ETag string (e.g. `W/"2a-cbf29ce484222325"` or `"2a-cbf29ce484222325"`).
 */
export function generateETag(
  content: string | Uint8Array | ArrayBuffer,
  options: ETagOptions = {}
): string {
  const weak = options.weak ?? true;
  const len =
    typeof content === "string"
      ? typeof Buffer !== "undefined"
        ? Buffer.byteLength(content, "utf8")
        : content.length
      : content.byteLength;

  const lenHex = len.toString(16);
  const hashHex = fnv1a64(content);
  const opaqueTag = `${lenHex}-${hashHex}`;

  return weak ? `W/"${opaqueTag}"` : `"${opaqueTag}"`;
}

/**
 * Parse a raw ETag header string into its structured components.
 */
export function parseETag(rawTag: string): ParsedETag | null {
  const trimmed = rawTag.trim();
  if (!trimmed) return null;

  const isWeak = trimmed.startsWith("W/") || trimmed.startsWith("w/");
  const unweak = isWeak ? trimmed.slice(2).trim() : trimmed;

  if (unweak.startsWith('"') && unweak.endsWith('"') && unweak.length >= 2) {
    const tag = unweak.slice(1, -1);
    return {
      weak: isWeak,
      tag,
      raw: isWeak ? `W/"${tag}"` : `"${tag}"`
    };
  }

  // Handle unquoted entity tag defensively
  return {
    weak: isWeak,
    tag: unweak,
    raw: isWeak ? `W/"${unweak}"` : `"${unweak}"`
  };
}

/**
 * Parse a comma-separated list of entity tags from an `If-Match` or `If-None-Match` header.
 * Correctly handles quoted strings, whitespace, and `*` wildcard.
 */
export function parseETagList(headerValue: string): ParsedETag[] {
  const results: ParsedETag[] = [];
  const trimmed = headerValue.trim();
  if (!trimmed) return results;

  if (trimmed === "*") {
    results.push({ weak: false, tag: "*", raw: "*" });
    return results;
  }

  // Split by comma outside of quotes
  let start = 0;
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '"' && (i === 0 || trimmed[i - 1] !== "\\")) {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      const segment = trimmed.slice(start, i).trim();
      if (segment) {
        const parsed = parseETag(segment);
        if (parsed) results.push(parsed);
      }
      start = i + 1;
    }
  }

  const lastSegment = trimmed.slice(start).trim();
  if (lastSegment) {
    const parsed = parseETag(lastSegment);
    if (parsed) results.push(parsed);
  }

  return results;
}

/**
 * Compares two entity tags per RFC 9110 §8.8.3.2.
 *
 * - Weak comparison (RFC 9110 §8.8.3.2): Two entity tags are equivalent if their opaque-tags match,
 *   regardless of whether either or both are marked weak. Used for `If-None-Match` cache revalidation.
 *
 * - Strong comparison (RFC 9110 §8.8.3.2): Two entity tags are equivalent only if neither is marked weak
 *   and their opaque-tags match. Used for `If-Match` conditional state updates.
 *
 * @param candidate - Tag from incoming client header (e.g. `If-None-Match`).
 * @param target - Tag of current server resource.
 * @param weakComparison - Whether to use weak comparison (default true).
 */
export function compareETags(
  candidate: string | ParsedETag,
  target: string | ParsedETag,
  weakComparison = true
): boolean {
  const cand = typeof candidate === "string" ? parseETag(candidate) : candidate;
  const tgt = typeof target === "string" ? parseETag(target) : target;

  if (!cand || !tgt) return false;

  // Wildcard match
  if (cand.tag === "*" || tgt.tag === "*") {
    return true;
  }

  if (weakComparison) {
    return cand.tag === tgt.tag;
  }

  // Strong comparison requires neither to be weak
  return !cand.weak && !tgt.weak && cand.tag === tgt.tag;
}

/**
 * Checks whether an incoming header list (from `If-None-Match` or `If-Match`) matches the server's ETag.
 */
export function matchesETagHeader(
  headerValue: string | null | undefined,
  serverETag: string,
  weakComparison = true
): boolean {
  if (!headerValue) return false;

  const targetParsed = parseETag(serverETag);
  if (!targetParsed) return false;

  const list = parseETagList(headerValue);
  for (const item of list) {
    if (compareETags(item, targetParsed, weakComparison)) {
      return true;
    }
  }

  return false;
}
