import type { createRouter } from "../rpc/router";
import type { PagesOptions } from "./pages/types";

/**
 * Options for the Visage Vite Plugin
 */
export interface VisagePluginOptions {
  /**
   * Automatically auto-inject Visage DevTools in development mode
   * @default true
   */
  devtools?: boolean;

  /**
   * Enable Hot Module Replacement (HMR) with signal state preservation
   * @default true
   */
  hmr?: boolean;

  /**
   * Extract static <Style> blocks into production CSS bundle
   * @default true
   */
  extractCss?: boolean;

  /**
   * Enable Server-Side Rendering (SSR) pipeline
   * @default false
   */
  ssr?: boolean;

  /**
   * Optional full-stack RPC router configuration for Vite dev server middleware
   */
  rpc?: {
    router: ReturnType<typeof createRouter<any>>;
    endpoint?: string;
  };

  /**
   * Enable AOT JSX Template Compiler (compiles JSX into hoisted cloneNode templates)
   * @default false
   */
  compiler?: boolean | import("./compiler/types").CompilerOptions;

  /**
   * File-system driven Multi-Page Application (MPA) pages router.
   * Automatically discovers pages in src/pages (or configured dir),
   * synthesizes virtual HTML entry points, shared layouts, and dynamic routes.
   * @default false
   */
  pages?: boolean | PagesOptions;

  /**
   * Opt-in experimental compiler and packager options
   */
  experimental?: ExperimentalOptions;
}

/**
 * Configuration options for the experimental Zig native compiler target
 */
export interface ZigNativeOptions {
  /**
   * Title of the native OS application window
   * @default "Visage App"
   */
  title?: string;

  /**
   * Initial window width in pixels
   * @default 1024
   */
  width?: number;

  /**
   * Initial window height in pixels
   * @default 768
   */
  height?: number;

  /**
   * Allow window resizing
   * @default true
   */
  resizable?: boolean;

  /**
   * Enable browser developer tools in the native window
   * @default false
   */
  debug?: boolean;

  /**
   * Target directory for generated Zig host code and build.zig
   * @default "src-native"
   */
  outputDir?: string;

  /**
   * Automatically scaffold build.zig and main.zig if not present
   * @default true
   */
  scaffold?: boolean;

  /**
   * Explicit virtual origin scheme and host for embedded webviews
   * @default "visage://localhost"
   */
  virtualOrigin?: string;
}

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

/**
 * Opt-in experimental compiler flags
 */
export interface ExperimentalOptions {
  /**
   * Experimental Zig native desktop application compiler and packager.
   *
   * Must be explicitly set to true or a configuration object to enable.
   * When enabled:
   * - Configures relative asset paths (base: "./") for embedded webviews
   * - Enables the visage/native IPC bridge
   * - Scaffolds native Zig host files (main.zig, build.zig)
   * @default false
   */
  zigNative?: boolean | ZigNativeOptions;

  /**
   * Experimental security transforms suite (strictly disabled by default, even if compiler is enabled).
   * @default false
   */
  secureTransforms?: boolean | SecureTransformsOptions;

  /**
   * Experimental Content Security Policy generator and injector (strictly disabled by default).
   * @default false
   */
  csp?: boolean | CSPOptions;

  /**
   * Experimental Storage Preboot transform (strictly disabled by default).
   *
   * Detects persistent signals in source code (e.g. signal("system", { persist: "theme" }))
   * and auto-injects an ultra-compact, synchronous blocking script into the HTML <head>.
   * Preboots storage-backed state (themes, layout, locale, feature flags) onto DOM attributes/classes
   * and populates window.__VISAGE_PREBOOT__ before the first frame paints.
   * @default false
   */
  storagePreboot?: boolean | StoragePrebootOptions;
}

/**
 * Item specification for Storage Preboot
 */
export interface StoragePrebootItem {
  /**
   * Storage key in localStorage (or sessionStorage)
   */
  key: string;

  /**
   * Target DOM attribute to set on documentElement (e.g. "data-theme", "data-layout")
   * If set to "class", the value is added to documentElement.classList
   * @default "data-" + key (or "data-theme" if key contains "theme")
   */
  attribute?: string;

  /**
   * Storage mechanism
   * @default "local"
   */
  storage?: "local" | "session";

  /**
   * Fallback value if storage is empty
   * @default "system" for themes, or empty string
   */
  fallback?: string;

  /**
   * Automatically resolve "system" to "dark" or "light" using CSS prefers-color-scheme media query
   * @default true for theme keys, false otherwise
   */
  colorSchemeQuery?: boolean;

  /**
   * Target DOM element
   * @default "html"
   */
  targetElement?: "html" | "body";
}

/**
 * Configuration options for the experimental Storage Preboot compiler transform
 */
export interface StoragePrebootOptions {
  /**
   * Explicitly enable or disable the transform
   * @default true
   */
  enabled?: boolean;

  /**
   * Explicit state definitions to inline into the HTML shell
   */
  states?: StoragePrebootItem[];

  /**
   * Automatically scan project source files for persistent signals:
   * signal(..., { persist: "..." }) or createSignal(..., { persist: "..." })
   * @default true
   */
  autoDetect?: boolean;
}

/**
 * Minimal interface representation of Vite Plugin to ensure zero hard runtime dependencies
 */
export interface VisageVitePlugin {
  name: string;
  enforce?: "pre" | "post";
  apply?: "serve" | "build" | ((config: any, env: { command: string; mode: string }) => boolean);
  config?: (config: any, env: any) => any;
  configResolved?: (config: any) => void;
  configureServer?: (server: any) => void | Promise<void>;
  resolveId?: (
    source: string,
    importer?: string,
    options?: any
  ) => Promise<string | null | undefined> | string | null | undefined;
  load?: (
    id: string,
    options?: any
  ) => Promise<string | null | undefined> | string | null | undefined;
  transform?: (
    code: string,
    id: string,
    options?: { ssr?: boolean }
  ) => Promise<{ code: string; map?: any } | null> | { code: string; map?: any } | null;
  buildStart?: () => void | Promise<void>;
  closeBundle?: () => void | Promise<void>;
  transformIndexHtml?: (html: string) => string | Promise<string>;
}

export type {
  PageRoute,
  PageSpecialFiles,
  PagesOptions,
  RouteMatch
} from "./pages/types";
