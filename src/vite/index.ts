export { colors, createVisageLogger, formatTag, pc, type VisageLogger } from "./logger";
export { autoSyncZigFingerprint, scaffoldZigNative } from "./native-scaffold";
export { matchRoute } from "./pages/matcher";
export { resolvePagesDir, scanPages } from "./pages/scanner";
export { default, visage } from "./plugin";
export { createCspPlugin } from "./plugins/csp";
export {
  createHeadersPlugin,
  formatHeadersFile,
  parseHeadersFile
} from "./plugins/headers";
export { createLucidePlugin, type VisageLucideOptions, visageLucide } from "./plugins/lucide";
export { createNoScriptPlugin } from "./plugins/noscript";
export { createPagesPlugin, visagePages } from "./plugins/pages";
export {
  generateStoragePrebootScript,
  injectStoragePrebootScript,
  scanCodeForPersistentSignals,
  scanProjectStoragePreboot
} from "./storage-preboot";
export type {
  CSPOptions,
  ExperimentalOptions,
  HeadersPluginOptions,
  NoScriptPluginOptions,
  PageRoute,
  PageSpecialFiles,
  PagesOptions,
  RouteMatch,
  StoragePrebootItem,
  StoragePrebootOptions,
  VisagePluginOptions,
  VisageVitePlugin,
  ZigNativeOptions
} from "./types";
