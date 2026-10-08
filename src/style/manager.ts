export interface InjectedStyle {
  id: string;
  css: string;
  count: number;
  element?: HTMLStyleElement;
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
      this._ssrStyles.add(css);
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
   * Extract all styles collected during Server-Side Rendering (SSR)
   */
  extractSSRStyles(): string {
    return Array.from(this._ssrStyles).join("\n");
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
  }
}

export const styleManager = new StyleManager();

/**
 * Helper to get SSR style tag HTML
 */
export function extractStyleTags(): string {
  const css = styleManager.extractSSRStyles();
  return css ? `<style data-visage-ssr="true">${css}</style>` : "";
}
