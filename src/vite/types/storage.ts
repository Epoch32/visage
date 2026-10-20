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
