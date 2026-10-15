import type { createRouter } from "../rpc/router";

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
