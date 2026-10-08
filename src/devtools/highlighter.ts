import { effect, onCleanup } from "../signals";

/**
 * Visual DOM element mutation highlighter for Visage DevTools
 */
let styleInjected = false;
const activeTimeouts = new WeakMap<Element, ReturnType<typeof setTimeout>>();

function injectHighlighterStyles() {
  if (styleInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.id = "visage-devtools-highlighter";
  style.textContent = `
    @keyframes visage-devtools-flash {
      0% {
        outline: 2px solid rgba(56, 189, 248, 0.9);
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.45);
      }
      100% {
        outline: 2px solid transparent;
        box-shadow: none;
      }
    }
    .visage-dev-highlight {
      outline-offset: -1px;
      animation: visage-devtools-flash 0.5s ease-out !important;
    }
  `;
  document.head.appendChild(style);
  styleInjected = true;
}

export function highlightElement(element: Element | null) {
  if (!element || typeof document === "undefined" || !(element instanceof Element)) return;
  injectHighlighterStyles();

  const prevTimeout = activeTimeouts.get(element);
  if (prevTimeout) {
    clearTimeout(prevTimeout);
  }

  element.classList.remove("visage-dev-highlight");
  // Force reflow
  void (element as HTMLElement).offsetWidth;
  element.classList.add("visage-dev-highlight");

  const timeout = setTimeout(() => {
    element.classList.remove("visage-dev-highlight");
    activeTimeouts.delete(element);
  }, 500);

  activeTimeouts.set(element, timeout);
}

let observer: MutationObserver | null = null;

export function setupDomMutationHighlighter(enabledGetter: () => boolean) {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") return;

  const startObserver = () => {
    if (observer) return;
    injectHighlighterStyles();
    observer = new MutationObserver((mutations) => {
      if (!enabledGetter()) return;
      const seen = new Set<Element>();
      for (const mutation of mutations) {
        const target = mutation.target as Node;
        let el: Element | null = null;
        if (target instanceof Element) {
          el = target;
        } else if (target.parentElement) {
          el = target.parentElement;
        }

        if (!el) continue;

        // Skip DevTools UI itself
        if (el.closest?.(".visage-devtools-root") || el.closest?.("#visage-devtools-highlighter")) {
          continue;
        }

        // Avoid infinite loops when adding/removing the highlight class
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          const oldCls = (mutation.oldValue || "")
            .replace(/\bvisage-dev-highlight\b/g, "")
            .replace(/\s+/g, " ")
            .trim();
          const newCls = (el.getAttribute("class") || "")
            .replace(/\bvisage-dev-highlight\b/g, "")
            .replace(/\s+/g, " ")
            .trim();
          if (oldCls === newCls) {
            continue;
          }
        }

        if (!seen.has(el)) {
          seen.add(el);
          highlightElement(el);
        }
      }
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        subtree: true
      });
    }
  };

  const stopObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  effect(() => {
    if (enabledGetter()) {
      startObserver();
    } else {
      stopObserver();
    }
  });

  onCleanup(() => {
    stopObserver();
  });
}
