export interface InjectedStyle {
  id: string;
  css: string;
  count: number;
  element?: HTMLStyleElement;
}

declare const require: any;

let ssrStorage: any = null;
try {
  if (typeof window === "undefined") {
    const nodeReq = typeof require === "function" ? require : null;
    if (nodeReq) {
      const asyncHooks = nodeReq("node:async_hooks");
      if (asyncHooks?.AsyncLocalStorage) {
        ssrStorage = new asyncHooks.AsyncLocalStorage();
      }
    }
  }
} catch {
  // Graceful fallback when node:async_hooks is unavailable
}

/**
 * Run an SSR render callback within an isolated style collection context.
 * In a multi-tenant server, concurrent requests each collect their own scoped CSS
 * without leaking into other requests or accumulating in the global singleton.
 */
export function runWithSSRStyles<T>(callback: () => T): { result: T; css: string; tags: string } {
  const store = new Set<string>();
  let result: T;

  if (ssrStorage) {
    result = ssrStorage.run(store, callback);
  } else {
    result = callback();
  }

  const css = Array.from(store).join("\n");
  const tags = css ? `<style data-visage-ssr="true">${css}</style>` : "";
  return { result, css, tags };
}

export class StyleManager {
  private _styles = new Map<string, InjectedStyle>();
  private _ssrStyles = new Set<string>();

  /**
   * Inject CSS into the document head or SSR registry
   */
  inject(id: string, css: string): () => void {
    let entry = this._styles.get(id);

    if (!entry) {
      entry = { id, css, count: 0 };
      this._styles.set(id, entry);

      if (typeof document !== "undefined") {
        const existing = document.getElementById(`visage-style-${id}`) as HTMLStyleElement | null;
        if (existing) {
          entry.element = existing;
        } else {
          const target = document.head || document.documentElement || document.body;
          if (target) {
            const styleEl = document.createElement("style");
            styleEl.id = `visage-style-${id}`;
            styleEl.setAttribute("data-visage-scope", id);
            styleEl.textContent = css;
            target.appendChild(styleEl);
            entry.element = styleEl;
          }
        }
      }

      // Collect into request-scoped store if running inside an active SSR context
      const contextStore: Set<string> | undefined = ssrStorage?.getStore();
      if (contextStore) {
        contextStore.add(css);
      } else {
        this._ssrStyles.add(css);
      }
    }

    entry.count++;

    // Return cleanup callback
    return () => {
      if (!entry) return;
      entry.count--;
      if (entry.count <= 0) {
        if (entry.element?.parentNode) {
          entry.element.parentNode.removeChild(entry.element);
        }
        this._styles.delete(id);
      }
    };
  }

  /**
   * Check if a style scope is currently registered
   */
  has(id: string): boolean {
    return this._styles.has(id);
  }

  /**
   * Extract all styles collected during Server-Side Rendering (SSR).
   * Respects request-scoped SSR storage when executing inside runWithSSRStyles().
   */
  extractSSRStyles(options?: { clear?: boolean } | boolean): string {
    const shouldClear = typeof options === "boolean" ? options : (options?.clear ?? false);
    const contextStore: Set<string> | undefined = ssrStorage?.getStore();

    if (contextStore) {
      const css = Array.from(contextStore).join("\n");
      if (shouldClear) {
        contextStore.clear();
      }
      return css;
    }

    const css = Array.from(this._ssrStyles).join("\n");
    if (shouldClear) {
      this._ssrStyles.clear();
    }
    return css;
  }

  /**
   * Clear all registered and SSR styles
   */
  clear() {
    for (const entry of this._styles.values()) {
      if (entry.element?.parentNode) {
        entry.element.parentNode.removeChild(entry.element);
      }
    }
    this._styles.clear();
    this._ssrStyles.clear();
    const contextStore: Set<string> | undefined = ssrStorage?.getStore();
    if (contextStore) {
      contextStore.clear();
    }
  }

  /**
   * Clear only SSR accumulated styles
   */
  clearSSR() {
    this._ssrStyles.clear();
    const contextStore: Set<string> | undefined = ssrStorage?.getStore();
    if (contextStore) {
      contextStore.clear();
    }
  }
}

export function createStyleManager(): StyleManager {
  return new StyleManager();
}

export const styleManager = new StyleManager();

/**
 * Helper to get SSR style tag HTML
 */
export function extractStyleTags(options?: { clear?: boolean } | boolean): string {
  const css = styleManager.extractSSRStyles(options);
  return css ? `<style data-visage-ssr="true">${css}</style>` : "";
}
