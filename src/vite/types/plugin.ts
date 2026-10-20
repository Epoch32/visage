import type { createRouter } from "@rpc/router";
import type { PagesOptions } from "../pages/types";
import type { VisageLucideOptions } from "../plugins/lucide";
import type { ZigNativeOptions } from "./native";
import type { CSPOptions, SecureTransformsOptions } from "./security";
import type { StoragePrebootOptions } from "./storage";

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
   * Enable AOT JSX Template Compiler (compiles JSX into hoisted cloneNode templates).
   * Enabled by default (`true`) with safe AST security transforms. Set to `false` to disable.
   * @default true
   */
  compiler?: boolean | import("../compiler/types").CompilerOptions;

  /**
   * Enable verbose transform diagnostics.
   * When true, prints per-file compiler transforms (templates hoisted, delegated events, security shields).
   * @default false
   */
  verbose?: boolean;

  /**
   * File-system driven Multi-Page Application (MPA) pages router.
   * Automatically discovers pages in src/pages (or configured dir),
   * synthesizes virtual HTML entry points, shared layouts, and dynamic routes.
   * @default false
   */
  pages?: boolean | PagesOptions;

  /**
   * Automatic build-time Lucide icon tree-shaking and translation.
   * Statically transforms `lucide-react` and `lucide` imports into pure Visage SVG components.
   * Enabled by default (`true`). Set to `false` to disable, or provide custom options.
   * @default true
   */
  lucide?: boolean | VisageLucideOptions;

  /**
   * Native desktop application compiler and host for Linux WebView via Zig.
   *
   * When enabled:
   * - Configures relative asset paths (`base: "./"`) for embedded webviews
   * - Enables the `visage/native` IPC bridge and native runtime
   * - Scaffolds native Zig host files (`src-native/main.zig`, `build.zig`, `platform.zig`)
   *
   * @default false
   */
  native?: boolean | ZigNativeOptions;

  /**
   * Content Security Policy (CSP) generator and injector.
   * Auto-detects external origins across JSX code and injects strict CSP meta tags into HTML.
   * Disabled by default (`false`). Set to `true` or provide options to enable.
   * @default false
   */
  csp?: boolean | CSPOptions;

  /**
   * Storage Preboot compiler transform and HTML injector.
   *
   * Detects persistent signals in source code (`signal(..., { persist: "..." })`)
   * and auto-injects an ultra-compact, synchronous blocking script into HTML `<head>`.
   * Preboots storage-backed state (theme, layout, flags) onto DOM attributes/classes
   * and populates `window.__VISAGE_PREBOOT__` before the first frame paints (zero FOUC).
   *
   * Enabled by default (`true`). Set to `false` to disable.
   * @default true
   */
  storagePreboot?: boolean | StoragePrebootOptions;

  /**
   * Static hosting headers generator and injector for Cloudflare Pages and Netlify.
   * Automatically synthesizes RFC 8246 immutable caching for hashed /assets/* and RFC 9111 revalidation for HTML.
   * Enabled by default (`true`). Set to `false` to disable, or provide options.
   * @default true
   */
  headers?: boolean | import("./headers").HeadersPluginOptions;

  /**
   * Opt-in experimental compiler and packager options
   */
  experimental?: ExperimentalOptions;
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
  configurePreviewServer?: (server: any) => void | Promise<void>;
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
  generateBundle?: (this: any, options: any, bundle: any) => void | Promise<void>;
  closeBundle?: () => void | Promise<void>;
  transformIndexHtml?: (html: string) => string | Promise<string>;
}
