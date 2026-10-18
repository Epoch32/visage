import type { DetectedOrigins } from "./compiler/types";
import type { CSPOptions } from "./types";

/**
 * Extracts the origin (protocol + host + port) from an absolute URL string.
 * Returns null for relative paths, data URIs, anchors, and non-web protocols.
 */
export function extractOriginFromUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Protocol-relative URLs (e.g. //cdn.example.com/asset)
  if (trimmed.startsWith("//")) {
    if (trimmed.length <= 2 || trimmed[2] === "/" || trimmed[2] === "?" || trimmed[2] === "#") {
      return null;
    }
    try {
      const u = new URL(`https:${trimmed}`);
      return u.origin && u.origin !== "null" ? u.origin : null;
    } catch {
      return null;
    }
  }

  // Absolute HTTP/HTTPS/WebSocket URLs
  if (/^(?:https?|wss?):\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      return u.origin && u.origin !== "null" ? u.origin : null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Directives forbidden or ignored by browsers in HTML <meta> tags per W3C CSP specification.
 */
export const META_UNSUPPORTED_DIRECTIVES = new Set([
  "frame-ancestors",
  "report-uri",
  "form-action"
]);

/**
 * Builds a strict, standards-compliant Content Security Policy string.
 */
export function buildCspString(
  options: boolean | CSPOptions,
  detectedOrigins?: DetectedOrigins,
  inlineScriptHashes?: string[],
  target?: "meta" | "header"
): string {
  const opts = typeof options === "object" ? options : {};
  const shouldAutoDetect = opts.autoDetectOrigins !== false;

  const directives: Record<string, Set<string>> = {
    "default-src": new Set(["'self'"]),
    "script-src": new Set(["'self'"]),
    "style-src": new Set(["'self'", "'unsafe-inline'"]),
    "img-src": new Set(["'self'", "data:"]),
    "font-src": new Set(["'self'", "data:"]),
    "connect-src": new Set(["'self'"]),
    "media-src": new Set(["'self'"]),
    "frame-src": new Set(["'self'"]),
    "object-src": new Set(["'none'"]),
    "base-uri": new Set(["'none'"]),
    "form-action": new Set(["'self'"]),
    "frame-ancestors": new Set(["'none'"])
  };

  const addSource = (directive: string, source: string) => {
    let set = directives[directive];
    if (!set) {
      set = new Set<string>();
      directives[directive] = set;
    }
    set.add(source);
  };

  // Merge virtual origin if explicitly configured
  if (opts.virtualOrigin) {
    const vo = opts.virtualOrigin.replace(/\/+$/, "");
    addSource("default-src", vo);
    addSource("script-src", vo);
    addSource("style-src", vo);
    addSource("img-src", vo);
    addSource("font-src", vo);
    addSource("connect-src", vo);
    addSource("media-src", vo);
    addSource("frame-src", vo);
    directives["base-uri"] = new Set(["'self'", vo]);
  }

  // Merge configured origin lists
  if (opts.connectSrc) {
    for (const src of opts.connectSrc) addSource("connect-src", src);
  }
  if (opts.imgSrc) {
    for (const src of opts.imgSrc) addSource("img-src", src);
  }
  if (opts.fontSrc) {
    for (const src of opts.fontSrc) addSource("font-src", src);
  }
  if (opts.styleSrc) {
    for (const src of opts.styleSrc) addSource("style-src", src);
  }
  if (opts.scriptSrc) {
    for (const src of opts.scriptSrc) addSource("script-src", src);
  }
  if (inlineScriptHashes) {
    for (const h of inlineScriptHashes) addSource("script-src", h);
  }
  if (opts.mediaSrc) {
    for (const src of opts.mediaSrc) addSource("media-src", src);
  }
  if (opts.frameSrc) {
    for (const src of opts.frameSrc) addSource("frame-src", src);
  }

  // Merge automatically detected origins from static JSX scanning
  if (shouldAutoDetect && detectedOrigins) {
    for (const origin of detectedOrigins.connect) addSource("connect-src", origin);
    for (const origin of detectedOrigins.img) addSource("img-src", origin);
    for (const origin of detectedOrigins.font) addSource("font-src", origin);
    for (const origin of detectedOrigins.style) addSource("style-src", origin);
    for (const origin of detectedOrigins.media) addSource("media-src", origin);
    for (const origin of detectedOrigins.frame) addSource("frame-src", origin);
  }

  if (opts.upgradeInsecureRequests) {
    directives["upgrade-insecure-requests"] = new Set();
  }
  if (opts.reportUri) {
    directives["report-uri"] = new Set([opts.reportUri]);
  }

  // Merge custom directive overrides
  if (opts.directives) {
    for (const [dir, sources] of Object.entries(opts.directives)) {
      directives[dir] = new Set(sources);
    }
  }

  const parts: string[] = [];
  for (const [name, sources] of Object.entries(directives)) {
    if (target === "meta" && META_UNSUPPORTED_DIRECTIVES.has(name) && !opts.directives?.[name]) {
      continue;
    }
    if (sources.size > 0) {
      parts.push(`${name} ${Array.from(sources).join(" ")}`);
    } else {
      parts.push(name);
    }
  }

  return `${parts.join("; ")};`;
}

/**
 * Injects a Content-Security-Policy meta tag into an HTML document string.
 */
export function injectCspMetaTag(html: string, cspString: string): string {
  const escapedCsp = cspString.replace(/"/g, "&quot;");
  const metaTag = `<meta http-equiv="Content-Security-Policy" content="${escapedCsp}">`;

  // 1. Replace existing CSP meta tag if present
  if (/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i.test(html)) {
    return html.replace(
      /<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i,
      () => metaTag
    );
  }

  // 2. Insert into <head> directly after opening tag
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/(<head\b[^>]*>)/i, (_match, p1) => `${p1}\n    ${metaTag}`);
  }

  // 3. Fallback: prepend to document
  return `${metaTag}\n${html}`;
}
