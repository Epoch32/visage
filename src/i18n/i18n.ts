import { createMemo, createSignal } from "@signals";
import type {
  CreateI18nOptions,
  I18nInstance,
  PluralForms,
  TranslationParams,
  TranslationRecord,
  TranslationsDict
} from "./types";

/**
 * Traverses nested object path like "nav.header.title"
 */
function getPath(obj: any, path: string): any {
  if (!obj || typeof obj !== "object") return undefined;
  if (path in obj) return obj[path];

  const parts = path.split(".");
  let curr = obj;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (curr === null || curr === undefined || typeof curr !== "object") {
      return undefined;
    }
    curr = curr[part];
  }
  return curr;
}

/**
 * Deep merges translation dictionaries
 */
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = output[key];
    if (
      srcVal &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      output[key] = deepMerge(tgtVal, srcVal);
    } else {
      output[key] = srcVal;
    }
  }
  return output;
}

/**
 * Resolves browser locale or fallback
 */
function detectBrowserLocale(fallback: string): string {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  if (typeof document !== "undefined" && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return fallback;
}

/**
 * Evaluates plural rules for count
 */
function resolvePlural(pluralMap: PluralForms, count: number, locale: string): string {
  try {
    const pr = new Intl.PluralRules(locale);
    const rule = pr.select(count); // 'zero', 'one', 'two', 'few', 'many', 'other'

    if (count === 0 && pluralMap.zero !== undefined) {
      return pluralMap.zero;
    }

    if (rule in pluralMap && (pluralMap as any)[rule] !== undefined) {
      return (pluralMap as any)[rule];
    }
  } catch {
    // Fallback if Intl.PluralRules unavailable
    if (count === 1 && pluralMap.one) return pluralMap.one;
  }

  return pluralMap.other ?? Object.values(pluralMap)[0] ?? "";
}

const delimiterRegexCache = new Map<string, RegExp>();

/**
 * Interpolates variables like {{name}} or {name}
 */
function interpolate(
  template: string,
  params: TranslationParams,
  [startDelim, endDelim]: [string, string]
): string {
  if (!params || typeof template !== "string") return template;

  const cacheKey = `${startDelim}:::${endDelim}`;
  let regex = delimiterRegexCache.get(cacheKey);
  if (!regex) {
    const escStart = startDelim.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const escEnd = endDelim.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    regex = new RegExp(`${escStart}\\s*([\\w.-]+)\\s*${escEnd}`, "g");
    delimiterRegexCache.set(cacheKey, regex);
  }

  // Reset lastIndex because regex has global flag "g"
  regex.lastIndex = 0;

  return template.replace(regex, (match, paramKey) => {
    const val = getPath(params, paramKey);
    return val !== undefined ? String(val) : match;
  });
}

/**
 * Creates a lightweight, fine-grained reactive I18n translation system.
 */
export function createI18n(options: CreateI18nOptions = {}): I18nInstance {
  const fallback = options.fallbackLocale ?? "en";
  const initial = options.detectBrowser
    ? detectBrowserLocale(options.defaultLocale ?? fallback)
    : (options.defaultLocale ?? fallback);

  const [activeLocale, setActiveLocaleSignal] = createSignal<string>(initial);
  const [store, setStore] = createSignal<TranslationsDict>(options.translations ?? {});
  const [isLoading, setIsLoading] = createSignal<boolean>(false);

  const delimiters: [string, string] = options.delimiters ?? ["{{", "}}"];

  // Cache Intl formatters to avoid re-instantiation
  const numberFormatCache = new Map<string, Intl.NumberFormat>();
  const dateFormatCache = new Map<string, Intl.DateTimeFormat>();
  const relativeFormatCache = new Map<string, Intl.RelativeTimeFormat>();

  // Add loaded translations
  const addTranslations = (locale: string, translations: TranslationRecord) => {
    setStore((prev) => {
      const existing = prev[locale] ?? {};
      return {
        ...prev,
        [locale]: deepMerge(existing, translations)
      };
    });
  };

  // Set locale with optional dynamic async loader
  const setLocale = async (nextLocale: string): Promise<void> => {
    if (!nextLocale) return;

    // Check if dictionary needs loading
    const currentDict = store()[nextLocale];
    if (!currentDict && options.loader) {
      setIsLoading(true);
      try {
        const loaded = await options.loader(nextLocale);
        const dict = ("default" in loaded ? loaded.default : loaded) as TranslationRecord;
        addTranslations(nextLocale, dict);
      } catch (err) {
        console.error(`[visage/i18n] Failed to load locale "${nextLocale}":`, err);
      } finally {
        setIsLoading(false);
      }
    }

    setActiveLocaleSignal(nextLocale);

    // Update document <html lang="..."> if in DOM
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = nextLocale;
    }
  };

  // Check if key exists
  const has = (key: string, targetLocale?: string): boolean => {
    if (targetLocale) {
      const dict = store()[targetLocale];
      return dict !== undefined && getPath(dict, key) !== undefined;
    }

    const loc = activeLocale();
    const dict = store()[loc];
    if (dict && getPath(dict, key) !== undefined) return true;

    // Fallback locale check
    if (loc !== fallback) {
      const fbDict = store()[fallback];
      return fbDict !== undefined && getPath(fbDict, key) !== undefined;
    }
    return false;
  };

  // Translate function subscribing to activeLocale & store
  const t = (key: string, params?: TranslationParams): string => {
    const currentLocale = activeLocale();
    const dicts = store();

    let rawVal: any;

    // 1. Look in active locale
    const activeDict = dicts[currentLocale];
    if (activeDict) {
      rawVal = getPath(activeDict, key);
    }

    // 2. Fall back to language-only prefix (e.g. 'en' from 'en-US')
    if (rawVal === undefined && currentLocale.includes("-")) {
      const langPrefix = currentLocale.split("-")[0]!;
      const prefixDict = dicts[langPrefix];
      if (prefixDict) {
        rawVal = getPath(prefixDict, key);
      }
    }

    // 3. Look in fallback locale
    if (rawVal === undefined && currentLocale !== fallback) {
      const fallbackDict = dicts[fallback];
      if (fallbackDict) {
        rawVal = getPath(fallbackDict, key);
      }
    }

    // 4. Missing key handling
    if (rawVal === undefined) {
      if (options.onMissingKey) {
        return options.onMissingKey(key, currentLocale);
      }
      return key;
    }

    // Handle plural resolution
    let resolvedString: string;
    if (typeof rawVal === "object" && rawVal !== null && "other" in rawVal) {
      const count = params?.count !== undefined ? Number(params.count) : 1;
      resolvedString = resolvePlural(rawVal as PluralForms, count, currentLocale);
    } else {
      resolvedString = String(rawVal);
    }

    // Variable interpolation
    const interpolated = params ? interpolate(resolvedString, params, delimiters) : resolvedString;

    // In-context translation wrapper for community tools (Crowdin / Weblate in-context mode)
    if (options.inContext) {
      if (typeof options.inContext === "function") {
        return options.inContext(key, interpolated);
      }
      // Standard Crowdin/Weblate in-context tag wrapper
      return `<!-- crwdns:${key} -->${interpolated}<!-- /crwdns -->`;
    }

    return interpolated;
  };

  // Fine-grained reactive accessor helper
  const accessor = (key: string, params?: TranslationParams | (() => TranslationParams)) => {
    return createMemo(() => {
      const resolvedParams = typeof params === "function" ? params() : params;
      return t(key, resolvedParams);
    });
  };

  // Number formatting
  const formatNumber = (value: number, opts?: Intl.NumberFormatOptions): string => {
    const loc = activeLocale();
    const cacheKey = `${loc}:${JSON.stringify(opts ?? {})}`;
    let fmt = numberFormatCache.get(cacheKey);
    if (!fmt) {
      fmt = new Intl.NumberFormat(loc, opts);
      numberFormatCache.set(cacheKey, fmt);
    }
    return fmt.format(value);
  };

  // Date formatting
  const formatDate = (date: Date | number, opts?: Intl.DateTimeFormatOptions): string => {
    const loc = activeLocale();
    const cacheKey = `${loc}:${JSON.stringify(opts ?? {})}`;
    let fmt = dateFormatCache.get(cacheKey);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat(loc, opts);
      dateFormatCache.set(cacheKey, fmt);
    }
    return fmt.format(date);
  };

  // Relative time formatting
  const formatRelativeTime = (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    opts?: Intl.RelativeTimeFormatOptions
  ): string => {
    const loc = activeLocale();
    const cacheKey = `${loc}:${JSON.stringify(opts ?? {})}`;
    let fmt = relativeFormatCache.get(cacheKey);
    if (!fmt) {
      fmt = new Intl.RelativeTimeFormat(loc, opts);
      relativeFormatCache.set(cacheKey, fmt);
    }
    return fmt.format(value, unit);
  };

  const locales = createMemo(() => Object.keys(store()));

  return {
    locale: activeLocale,
    setLocale,
    t,
    accessor,
    addTranslations,
    has,
    formatNumber,
    formatDate,
    formatRelativeTime,
    locales,
    isLoading
  };
}
