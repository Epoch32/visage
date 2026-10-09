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
  load?: (id: string, options?: any) => Promise<string | null | undefined> | string | null | undefined;
  transform?: (
    code: string,
    id: string,
    options?: { ssr?: boolean }
  ) => Promise<{ code: string; map?: any } | null> | { code: string; map?: any } | null;
  transformIndexHtml?: (html: string) => string | Promise<string>;
}
