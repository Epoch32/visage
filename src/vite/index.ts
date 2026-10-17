export { colors, createVisageLogger, formatTag, pc, type VisageLogger } from "./logger";
export { type VisageLucideOptions, visageLucide } from "./lucide";
export { autoSyncZigFingerprint, scaffoldZigNative } from "./native-scaffold";
export { default, visage } from "./plugin";
export {
  generateStoragePrebootScript,
  injectStoragePrebootScript,
  scanCodeForPersistentSignals,
  scanProjectStoragePreboot
} from "./storage-preboot";
export type {
  ExperimentalOptions,
  StoragePrebootItem,
  StoragePrebootOptions,
  VisagePluginOptions,
  VisageVitePlugin,
  ZigNativeOptions
} from "./types";
