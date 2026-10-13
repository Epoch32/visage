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
import { formatStyleProp } from "../style/scale";

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
    return;
  }

  // Ref callback
  if (key === "ref" && typeof value === "function") {
    value(el);
    return;
  }

  // Two-way form binding (bind:value, bind:checked, bind)
  if (
    (key === "bind:value" || key === "bind:checked" || key === "bind") &&
    value !== null &&
    value !== undefined
  ) {
    let get: () => any;
    let set: (val: any) => void;

    if (isSignal(value) && typeof (value as any).set === "function") {
      get = () => (value as any)();
      set = (v: any) => (value as any).set(v);
    } else if (
      Array.isArray(value) &&
      typeof value[0] === "function" &&
      typeof value[1] === "function"
    ) {
      get = value[0];
      set = value[1];
    } else if (
      typeof value === "object" &&
      typeof value.get === "function" &&
      typeof value.set === "function"
    ) {
      get = value.get;
      set = value.set;
    } else {
      return;
    }

    const isCheckbox = (el as any).type === "checkbox";
    const isRadio = (el as any).type === "radio";
    const bindChecked = key === "bind:checked" || (key === "bind" && (isCheckbox || isRadio));

    if (bindChecked) {
      effect(() => {
        const checkedVal = Boolean(get());
        if ((el as any).checked !== checkedVal) {
          (el as any).checked = checkedVal;
        }
      });
      el.addEventListener("change", (e: any) => {
        const val = e?.target ? e.target.checked : (el as any).checked;
        set(val);
      });
    } else {
      effect(() => {
        const val = get();
        applyProp(el, "value", val);
      });
      const updateValue = (e: any) => {
        const val = e?.target ? e.target.value : (el as any).value;
        set(val);
      };
      el.addEventListener("input", updateValue);
      el.addEventListener("change", updateValue);
    }
    return;
  }

  // Reactive class / className with array or object support
  if (key === "class" || key === "className") {
    const isSvg = typeof SVGElement !== "undefined" && el instanceof SVGElement;
    if (hasReactiveClass(value)) {
      effect(() => {
        const cls = normalizeClass(value);
        if (cls) {
          el.setAttribute("class", cls);
          if (!isSvg) (el as HTMLElement).className = cls;
        } else {
          el.removeAttribute("class");
          if (!isSvg) (el as HTMLElement).className = "";
        }
      });
    } else {
      const cls = normalizeClass(value);
      if (cls) {
        el.setAttribute("class", cls);
        if (!isSvg) (el as HTMLElement).className = cls;
      } else {
        el.removeAttribute("class");
        if (!isSvg) (el as HTMLElement).className = "";
      }
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

function setStyleProperty(el: HTMLElement | SVGElement, prop: string, val: any): void {
  const formatted = formatStyleProp(prop, val);
  if (prop.startsWith("--") || prop.includes("-")) {
    if (formatted === "") {
      el.style.removeProperty(prop);
    } else {
      el.style.setProperty(prop, formatted);
    }
  } else {
    (el.style as any)[prop] = formatted;
  }
}

function applyProp(el: HTMLElement | SVGElement, key: string, value: any) {
  if (
    value === null ||
    value === undefined ||
    (value === false && !key.startsWith("aria-") && !key.startsWith("data-"))
  ) {
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
    const isSvg = typeof SVGElement !== "undefined" && el instanceof SVGElement;
    if (cls) {
      el.setAttribute("class", cls);
      if (!isSvg) (el as HTMLElement).className = cls;
    } else {
      el.removeAttribute("class");
      if (!isSvg) (el as HTMLElement).className = "";
    }
  } else if (key === "style") {
    if (typeof value === "string") {
      el.setAttribute("style", value);
    } else if (typeof value === "object" && value !== null) {
      for (const styleKey in value) {
        const styleVal = value[styleKey];
        if (isReactive(styleVal)) {
          effect(() => {
            setStyleProperty(el, styleKey, resolveValue(styleVal));
          });
        } else {
          setStyleProperty(el, styleKey, styleVal);
        }
      }
    }
  } else if (key === "dangerouslySetInnerHTML" && value && typeof value.__html === "string") {
    el.innerHTML = value.__html;
  } else if (key === "value" && typeof el === "object" && el !== null && "value" in el) {
    const stringVal = value !== null && value !== undefined ? String(value) : "";
    if ((el as any).value !== stringVal) {
      const isFocused =
        typeof document !== "undefined" &&
        document.activeElement === (el as any) &&
        typeof (el as any).selectionStart === "number" &&
        typeof (el as any).selectionEnd === "number";

      if (isFocused) {
        const start = (el as any).selectionStart;
        const end = (el as any).selectionEnd;
        (el as any).value = stringVal;
        if (start !== null && end !== null && typeof (el as any).setSelectionRange === "function") {
          try {
            (el as any).setSelectionRange(start, end);
          } catch {}
        }
      } else {
        (el as any).value = stringVal;
      }
    }
  } else if (key in el && !(el instanceof SVGElement) && key !== "list" && key !== "form") {
    try {
      (el as any)[key] = value;
    } catch {
      el.setAttribute(key, String(value));
    }
  } else {
    if (key.startsWith("aria-") || key.startsWith("data-")) {
      el.setAttribute(key, String(value));
    } else if (value === true) {
      el.setAttribute(key, "");
    } else if (value === false) {
      el.removeAttribute(key);
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
    const marker = document.createTextNode("");
    parent.insertBefore(marker, before);

    let childScope: Scope | null = null;
    let currentNodes: Node[] = [];

    effect(() => {
      const resolved = resolveValue(child as ReactiveValue<any>);

      // Ultra-fast path: mutate existing single text node without recreating DOM
      if (
        (typeof resolved === "string" || typeof resolved === "number") &&
        currentNodes.length === 1 &&
        currentNodes[0]!.nodeType === Node.TEXT_NODE
      ) {
        (currentNodes[0] as Text).data = String(resolved);
        return;
      }

      if (childScope) {
        childScope.dispose();
      }
      childScope = new Scope(getActiveScope());

      runInScope(childScope, () => {
        // Clean up previous rendered nodes from DOM
        for (const node of currentNodes) {
          if (node.parentNode) {
            node.parentNode.removeChild(node);
          }
        }
        currentNodes = [];

        if (resolved === null || resolved === undefined || resolved === false) {
          return;
        }

        const frag = document.createDocumentFragment();
        if (
          typeof resolved === "string" ||
          typeof resolved === "number" ||
          typeof resolved === "boolean"
        ) {
          frag.appendChild(document.createTextNode(String(resolved)));
        } else {
          insertChild(frag, resolved);
        }

        currentNodes = Array.from(frag.childNodes);
        if (marker.parentNode) {
          marker.parentNode.insertBefore(frag, marker);
        }
      });
    });

    onCleanup(() => {
      if (childScope) {
        childScope.dispose();
      }
      for (const node of currentNodes) {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
      if (marker.parentNode) {
        marker.parentNode.removeChild(marker);
      }
    });

    return marker;
  }

  // Primitive static child
  const textNode = document.createTextNode(String(child));
  parent.insertBefore(textNode, before);
  return textNode;
}
