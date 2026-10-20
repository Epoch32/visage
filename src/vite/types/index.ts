/**
 * Visage Vite Plugin Type Definitions Barrel
 */

export type {
  PageRoute,
  PageSpecialFiles,
  PagesOptions,
  RouteMatch
} from "../pages/types";
export type { VisageLucideOptions } from "../plugins/lucide";
export type { HeadersPluginOptions } from "./headers";
export type { WindowBorderOptions, ZigNativeOptions } from "./native";
export type {
  ExperimentalOptions,
  VisagePluginOptions,
  VisageVitePlugin
} from "./plugin";
export type { CSPOptions, SecureTransformsOptions } from "./security";
export type { StoragePrebootItem, StoragePrebootOptions } from "./storage";
