import type { ReadonlySignal } from "@signals/types";

export type Accessor<T> = ReadonlySignal<T> | (() => T);

export type TranslationValue = string | number | boolean | TranslationRecord | PluralForms;

export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export type TranslationRecord = {
  [key: string]: TranslationValue;
};

export type TranslationsDict = Record<string, TranslationRecord>;

export type TranslationParams = Record<string, any> | { count?: number; [key: string]: any };

export type TranslationLoader = (
  locale: string
) => Promise<TranslationRecord | { default: TranslationRecord }>;

export interface CreateI18nOptions {
  /**
   * The initial active locale (e.g., 'en', 'es', 'ja-JP').
   * Defaults to 'en', or navigator.language if detectBrowser is true.
   */
  defaultLocale?: string;

  /**
   * Fallback locale when a key is not found in the active locale dictionary.
   * Defaults to 'en'.
   */
  fallbackLocale?: string;

  /**
   * Static preloaded translation dictionaries by locale.
   */
  translations?: TranslationsDict;

  /**
   * Dynamic asynchronous dictionary loader (e.g. for Crowdin OTA, CDN, or dynamic import).
   */
  loader?: TranslationLoader;

  /**
   * Automatically detect language from navigator.language or html lang attribute in browser.
   * Defaults to false.
   */
  detectBrowser?: boolean;

  /**
   * Custom interpolation delimiters.
   * Defaults to `["{{", "}}"]`.
   */
  delimiters?: [string, string];

  /**
   * Optional formatting callback or in-context translation wrapper for community tools (Crowdin / Weblate in-context).
   */
  inContext?: boolean | ((key: string, translated: string) => string);

  /**
   * Missing key handler. By default returns the raw key.
   */
  onMissingKey?: (key: string, locale: string) => string;
}

export interface I18nInstance {
  /**
   * Active locale reactive signal accessor.
   */
  locale: Accessor<string>;

  /**
   * Sets the active locale, asynchronously loading dictionary if a loader is configured.
   */
  setLocale: (nextLocale: string) => Promise<void>;

  /**
   * Reactive translation function.
   * Subscribes to the active locale signal so return values update fine-grained.
   */
  t: (key: string, params?: TranslationParams) => string;

  /**
   * Returns a reactive Accessor for fine-grained binding inside templates/JSX attributes.
   */
  accessor: (
    key: string,
    params?: TranslationParams | (() => TranslationParams)
  ) => Accessor<string>;

  /**
   * Merges translations dynamically into a locale dictionary.
   */
  addTranslations: (locale: string, translations: TranslationRecord) => void;

  /**
   * Checks if a translation key exists for the current or specified locale.
   */
  has: (key: string, targetLocale?: string) => boolean;

  /**
   * Formats numbers according to the active locale using Intl.NumberFormat.
   */
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;

  /**
   * Formats dates according to the active locale using Intl.DateTimeFormat.
   */
  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => string;

  /**
   * Formats relative time (e.g. '3 days ago') using Intl.RelativeTimeFormat.
   */
  formatRelativeTime: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions
  ) => string;

  /**
   * List of available loaded locales.
   */
  locales: Accessor<string[]>;

  /**
   * Signal indicating if a dynamic dictionary is currently loading.
   */
  isLoading: Accessor<boolean>;
}
