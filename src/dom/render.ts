import {
  createRoot,
  effect,
  getActiveScope,
  isSignal,
  onCleanup,
  type ReadonlySignal,
  runInScope,
  Scope
} from "../signals";
import { hasReactiveClass, normalizeClass } from "../style/cx";

export type ReactiveValue<T> = T | ReadonlySignal<T> | (() => T);
export type Child =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlySignal<any>
  | (() => any)
  | Child[];

/**
 * Check if a property is a reactive getter or signal
 */
export function isReactive<T>(value: unknown): value is ReadonlySignal<T> | (() => T) {
  return isSignal(value) || typeof value === "function";
}

/**
 * Extract current value whether static, signal, or getter
 */
export function resolveValue<T>(val: ReactiveValue<T>): T {
  if (typeof val === "function") {
    return (val as () => T)();
  }
  return val;
}

/**
 * Mount a Visage component or element to a DOM container
 */
export function render(fn: () => Child, container: HTMLElement | DocumentFragment): () => void {
  return createRoot((dispose) => {
    container.textContent = "";
    const node = insertChild(container, fn());
    onCleanup(() => {
      if (node && node instanceof Node && node.parentNode === container) {
        container.removeChild(node);
      }
    });
    return dispose;
  });
}

/**
 * Bind dynamic or static attributes, properties, styles, and events to an Element
 */
export function setAttribute(el: HTMLElement | SVGElement, key: string, value: any): void {
  // Event listeners (e.g. onClick, onInput, onclick)
  if (key.startsWith("on") && typeof value === "function") {
    const eventName = key.startsWith("onCapture")
      ? key.slice(9).toLowerCase()
      : key.slice(2).toLowerCase();
    const useCapture = key.startsWith("onCapture");

    el.addEventListener(eventName, value as EventListener, useCapture);
    onCleanup(() => {
      el.removeEventListener(eventName, value as EventListener, useCapture);
    });
    return;
  }

  // Ref callback
  if (key === "ref" && typeof value === "function") {
    value(el);
    return;
  }

  // Reactive class / className with array or object support
  if (key === "class" || key === "className") {
    if (hasReactiveClass(value)) {
      effect(() => {
        const cls = normalizeClass(value);
        if (cls) el.setAttribute("class", cls);
        else el.removeAttribute("class");
      });
    } else {
      const cls = normalizeClass(value);
      if (cls) el.setAttribute("class", cls);
      else el.removeAttribute("class");
    }
    return;
  }

  // Reactive attributes
  if (isReactive(value)) {
    effect(() => {
      const resolved = resolveValue(value);
      applyProp(el, key, resolved);
    });
  } else {
    applyProp(el, key, value);
  }
}

function applyProp(el: HTMLElement | SVGElement, key: string, value: any) {
  if (value === null || value === undefined || value === false) {
    if (key === "className" || key === "class") {
      el.removeAttribute("class");
    } else if (key === "style" && typeof value === "string") {
      el.removeAttribute("style");
    } else if (key in el && !(el instanceof SVGElement)) {
      try {
        (el as any)[key] = typeof (el as any)[key] === "boolean" ? false : "";
      } catch {
        el.removeAttribute(key);
      }
    } else {
      el.removeAttribute(key);
    }
    return;
  }

  if (key === "className" || key === "class") {
    const cls = normalizeClass(value);
    if (cls) {
      el.setAttribute("class", cls);
    } else {
      el.removeAttribute("class");
    }
  } else if (key === "style") {
    if (typeof value === "string") {
      el.setAttribute("style", value);
    } else if (typeof value === "object" && value !== null) {
      for (const styleKey in value) {
        const styleVal = value[styleKey];
        if (isReactive(styleVal)) {
          effect(() => {
            (el.style as any)[styleKey] = resolveValue(styleVal) ?? "";
          });
        } else {
          (el.style as any)[styleKey] = styleVal ?? "";
        }
      }
    }
  } else if (key === "dangerouslySetInnerHTML" && value && typeof value.__html === "string") {
    el.innerHTML = value.__html;
  } else if (key in el && !(el instanceof SVGElement) && key !== "list" && key !== "form") {
    try {
      (el as any)[key] = value;
    } catch {
      el.setAttribute(key, String(value));
    }
  } else {
    if (value === true) {
      el.setAttribute(key, "");
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

/**
 * Insert a child node into a parent container with reactive fine-grained updates
 */
export function insertChild(parent: Node, child: Child, before: Node | null = null): Node | null {
  if (child === null || child === undefined || child === false || child === true) {
    return null;
  }

  if (child instanceof Node) {
    parent.insertBefore(child, before);
    return child;
  }

  if (Array.isArray(child)) {
    const fragment = document.createDocumentFragment();
    for (const item of child) {
      insertChild(fragment, item);
    }
    parent.insertBefore(fragment, before);
    return fragment;
  }

  if (isReactive(child)) {
    // Fine-grained reactive binding
    let currentMarker: Node = document.createTextNode("");
    parent.insertBefore(currentMarker, before);

    let childScope: Scope | null = null;

    effect(() => {
      if (childScope) {
        childScope.dispose();
      }
      childScope = new Scope(getActiveScope());

      runInScope(childScope, () => {
        const resolved = resolveValue(child as ReactiveValue<any>);

        if (resolved instanceof Node) {
          if (currentMarker.parentNode) {
            currentMarker.parentNode.replaceChild(resolved, currentMarker);
            currentMarker = resolved;
          }
        } else if (Array.isArray(resolved)) {
          const fragment = document.createDocumentFragment();
          for (const item of resolved) {
            insertChild(fragment, item);
          }
          if (currentMarker.parentNode) {
            const nextMarker = document.createTextNode("");
            currentMarker.parentNode.insertBefore(fragment, currentMarker);
            currentMarker.parentNode.replaceChild(nextMarker, currentMarker);
            currentMarker = nextMarker;
          }
        } else if (resolved === null || resolved === undefined || resolved === false) {
          const empty = document.createTextNode("");
          if (currentMarker.parentNode) {
            currentMarker.parentNode.replaceChild(empty, currentMarker);
            currentMarker = empty;
          }
        } else {
          // Direct text mutation when possible without recreating node!
          if (currentMarker.nodeType === Node.TEXT_NODE) {
            (currentMarker as Text).data = String(resolved);
          } else {
            const textNode = document.createTextNode(String(resolved));
            if (currentMarker.parentNode) {
              currentMarker.parentNode.replaceChild(textNode, currentMarker);
              currentMarker = textNode;
            }
          }
        }
      });
    });

    onCleanup(() => {
      if (childScope) {
        childScope.dispose();
      }
    });

    return currentMarker;
  }

  // Primitive static child
  const textNode = document.createTextNode(String(child));
  parent.insertBefore(textNode, before);
  return textNode;
}
