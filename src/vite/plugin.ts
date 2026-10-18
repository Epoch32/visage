import type { DetectedOrigins } from "./compiler/types";
import { createVisageLogger } from "./logger";
import { createCompilerPlugin } from "./plugins/compiler";
import { createConfigPlugin } from "./plugins/config";
import { createCspPlugin } from "./plugins/csp";
import { createHmrPlugin } from "./plugins/hmr";
import { createLucidePlugin } from "./plugins/lucide";
import { createNativePlugin } from "./plugins/native";
import { createPagesPlugin } from "./plugins/pages";
import { createServerPlugin } from "./plugins/server";
import { createStoragePrebootPlugin } from "./plugins/storage-preboot";
import type { StoragePrebootOptions, VisagePluginOptions, VisageVitePlugin } from "./types";

declare const process: any;

/**
 * Official Visage Vite Plugin
 *
 * Provides zero-configuration JSX compilation, Hot Module Replacement (HMR),
 * built-in Lucide icon tree-shaking, DevTools auto-injection, full-stack RPC development server middleware, and
 * experimental transforms (Storage Preboot, Native Desktop, CSP, Security).
 *
 * Example:
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from "vite";
 * import visage from "visage/vite";
 *
 * export default defineConfig({
 *   plugins: [visage()]
 * });
 * ```
 */
export function visage(options: VisagePluginOptions = {}): VisageVitePlugin[] {
  const isDev = typeof process !== "undefined" ? process.env?.NODE_ENV !== "production" : true;
  const vLog = createVisageLogger();

  // 1. Experimental Native Zig Desktop Options
  const isZigNative = Boolean(options.experimental?.zigNative);
  const zigOpts =
    typeof options.experimental?.zigNative === "object" ? options.experimental.zigNative : {};

  // 2. Experimental Security Transforms Options
  const isSecureTransforms = Boolean(options.experimental?.secureTransforms);
  const secureTransformsOpts =
    typeof options.experimental?.secureTransforms === "object"
      ? options.experimental.secureTransforms
      : true;

  // 3. Experimental Content Security Policy (CSP) Options
  const isCsp =
    Boolean(options.experimental?.csp) &&
    (typeof options.experimental?.csp !== "object" ||
      (options.experimental.csp as any).enabled !== false);
  const cspOpts: any =
    typeof options.experimental?.csp === "object"
      ? { ...options.experimental.csp }
      : isCsp
        ? {}
        : false;

  // 4. Experimental Storage Preboot Options
  const isStoragePreboot =
    Boolean(options.experimental?.storagePreboot) &&
    (typeof options.experimental?.storagePreboot !== "object" ||
      options.experimental.storagePreboot.enabled !== false);
  const storagePrebootOpts: StoragePrebootOptions =
    typeof options.experimental?.storagePreboot === "object"
      ? { ...options.experimental.storagePreboot }
      : { enabled: isStoragePreboot };

  const virtualOrigin =
    (typeof cspOpts === "object" ? cspOpts.virtualOrigin : undefined) ||
    (typeof zigOpts === "object" ? zigOpts.virtualOrigin : undefined) ||
    (isZigNative ? "visage://localhost" : undefined);

  if (virtualOrigin && typeof cspOpts === "object") {
    cspOpts.virtualOrigin = virtualOrigin;
  }

  const detectedOrigins: DetectedOrigins = {
    connect: new Set<string>(),
    img: new Set<string>(),
    font: new Set<string>(),
    style: new Set<string>(),
    media: new Set<string>(),
    frame: new Set<string>()
  };

  const compilerOpts: any = typeof options.compiler === "object" ? { ...options.compiler } : {};
  compilerOpts.logger = vLog;
  if (isSecureTransforms) {
    compilerOpts.security = secureTransformsOpts;
  }
  if (isCsp) {
    compilerOpts.csp = cspOpts;
    compilerOpts.detectedOrigins = detectedOrigins;
  }

  // Assemble modular plugin pipeline
  const plugins: VisageVitePlugin[] = [createConfigPlugin(options, vLog, isZigNative)];

  if (isZigNative) {
    plugins.push(createNativePlugin(zigOpts, vLog, virtualOrigin, cspOpts, detectedOrigins));
  }

  if (options.lucide !== false) {
    const lucideOpts = typeof options.lucide === "object" ? options.lucide : {};
    plugins.push(createLucidePlugin(lucideOpts, vLog, false));
  }

  if (options.compiler || isSecureTransforms || isCsp) {
    plugins.push(createCompilerPlugin(options, vLog, compilerOpts, isSecureTransforms));
  }

  if (isCsp) {
    plugins.push(createCspPlugin(cspOpts, detectedOrigins, vLog, virtualOrigin, compilerOpts));
  }

  if (isStoragePreboot) {
    plugins.push(createStoragePrebootPlugin(storagePrebootOpts, vLog));
  }

  if (options.pages) {
    const pagesOpts = typeof options.pages === "object" ? options.pages : {};
    plugins.push(createPagesPlugin(pagesOpts, vLog));
  }

  plugins.push(createHmrPlugin(options, vLog, isDev), createServerPlugin(options, vLog, isDev));

  return plugins;
}

export default visage;
