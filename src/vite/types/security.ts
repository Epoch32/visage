/**
 * Options for experimental security transforms suite
 */
export interface SecureTransformsOptions {
  /**
   * Shield href, src, action, and formAction against dangerous script execution protocols
   * @default true
   */
  urlShield?: boolean;

  /**
   * Automatically ensure rel="noopener noreferrer" on target="_blank" links
   * @default true
   */
  relShield?: boolean;

  /**
   * Disallow string literals or string expressions on event handlers
   * @default true
   */
  eventShield?: boolean;

  /**
   * Guard dynamic id and name attributes against DOM clobbering collisions
   * @default true
   */
  clobberShield?: boolean;

  /**
   * Guard innerHTML and dangerouslySetInnerHTML bindings against script injection
   * @default true
   */
  htmlShield?: boolean;

  /**
   * Clean props spread onto native HTML elements
   * @default true
   */
  spreadSanitizer?: boolean;
}

/**
 * Options for Content Security Policy generation and injection
 */
export interface CSPOptions {
  /**
   * Explicitly enable or disable Content Security Policy generation
   * @default true
   */
  enabled?: boolean;

  /**
   * Allowed connection origins for fetch, WebSocket, etc. (connect-src)
   * @default ["'self'"]
   */
  connectSrc?: string[];

  /**
   * Allowed image origins (img-src)
   * @default ["'self'", "data:"]
   */
  imgSrc?: string[];

  /**
   * Allowed font origins (font-src)
   * @default ["'self'", "data:"]
   */
  fontSrc?: string[];

  /**
   * Allowed style origins (style-src)
   * @default ["'self'", "'unsafe-inline'"]
   */
  styleSrc?: string[];

  /**
   * Allowed script origins (script-src)
   * @default ["'self'"]
   */
  scriptSrc?: string[];

  /**
   * Allowed media origins (media-src)
   * @default ["'self'"]
   */
  mediaSrc?: string[];

  /**
   * Allowed frame/iframe origins (frame-src)
   * @default ["'self'"]
   */
  frameSrc?: string[];

  /**
   * Automatically scan JSX static attributes for external origins and merge them into CSP
   * @default true
   */
  autoDetectOrigins?: boolean;

  /**
   * Automatically compute SHA-256 hashes for inline scripts in HTML (such as storagePreboot)
   * and whitelist them in script-src without requiring 'unsafe-inline'.
   * @default true
   */
  hashInlineScripts?: boolean;

  /**
   * Set Content-Security-Policy HTTP response headers in Vite dev server and preview server
   * to enforce header-only directives like frame-ancestors, report-uri, and form-action.
   * @default true
   */
  headers?: boolean;

  /**
   * Enforce HTTPS for all resource requests
   * @default false
   */
  upgradeInsecureRequests?: boolean;

  /**
   * URI where the browser sends reports of policy violations
   */
  reportUri?: string;

  /**
   * Custom raw directives to append or override
   */
  directives?: Record<string, string[]>;

  /**
   * Explicit virtual origin scheme and host for embedded webviews and desktop targets
   * (e.g. "visage://localhost", "app://localhost", or "https://app.localhost")
   */
  virtualOrigin?: string;
}
