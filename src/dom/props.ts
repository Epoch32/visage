import { effect, getActiveScope, onCleanup, runInScope, Scope } from "@signals";
import { hasReactiveClass, normalizeClass } from "@style/cx";
import { formatStyleProp } from "@style/scale";
import { applyTwoWayBinding } from "./bind";
import { DELEGATED_EVENTS, delegateEvents } from "./events";
import { isReactive, resolveValue } from "./insert";

export function setStyleProperty(el: HTMLElement | SVGElement, prop: string, val: any): void {
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

export function applyProp(el: HTMLElement | SVGElement, key: string, value: any): void {
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
    if ((el as any).__styleScope) {
      (el as any).__styleScope.dispose();
      (el as any).__styleScope = null;
    }

    if (typeof value === "string") {
      el.setAttribute("style", value);
      (el as any).__styleKeys = null;
    } else if (typeof value === "object" && value !== null) {
      const prevKeys: Set<string> | null = (el as any).__styleKeys ?? null;
      const nextKeys = new Set<string>();

      const scope = new Scope(getActiveScope());
      (el as any).__styleScope = scope;

      onCleanup(() => {
        if ((el as any).__styleScope === scope) {
          scope.dispose();
          (el as any).__styleScope = null;
        }
      });

      runInScope(scope, () => {
        for (const styleKey in value) {
          nextKeys.add(styleKey);
          const styleVal = value[styleKey];
          if (isReactive(styleVal)) {
            effect(() => {
              setStyleProperty(el, styleKey, resolveValue(styleVal));
            });
          } else {
            setStyleProperty(el, styleKey, styleVal);
          }
        }
      });

      if (prevKeys) {
        for (const oldKey of prevKeys) {
          if (!nextKeys.has(oldKey)) {
            setStyleProperty(el, oldKey, "");
          }
        }
      }

      (el as any).__styleKeys = nextKeys;
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
 * Bind dynamic or static attributes, properties, styles, and events to an Element
 */
export function setAttribute(el: HTMLElement | SVGElement, key: string, value: any): void {
  // Event listeners (e.g. onClick, onInput, onScroll, onCaptureClick)
  const isCapture = key.startsWith("onCapture") && key.length > 9;
  const eventName = isCapture ? key.slice(9).toLowerCase() : key.slice(2).toLowerCase();
  const isFn =
    typeof value === "function" || (Array.isArray(value) && typeof value[0] === "function");
  const isEventProp =
    key.startsWith("on") &&
    key.length > 2 &&
    (isFn ||
      (el as any)[`__${eventName}`] !== undefined ||
      (el as any)[`__on_${eventName}`] !== undefined ||
      (el as any)[`__onCapture_${eventName}`] !== undefined ||
      (key.charAt(2) >= "A" && key.charAt(2) <= "Z") ||
      DELEGATED_EVENTS.has(eventName));

  if (isEventProp) {
    if (!isCapture && DELEGATED_EVENTS.has(eventName)) {
      if (isFn) {
        delegateEvents([eventName]);
        (el as any)[`__${eventName}`] = value;
      } else {
        (el as any)[`__${eventName}`] = null;
      }
      return;
    }

    // Non-delegated or capture event
    const propKey = isCapture ? `__onCapture_${eventName}` : `__on_${eventName}`;
    const listenerKey = isCapture ? `__onCapture_l_${eventName}` : `__on_l_${eventName}`;

    (el as any)[propKey] = isFn ? value : null;

    if (isFn) {
      if (!(el as any)[listenerKey]) {
        const listener: EventListener = (e: Event) => {
          const handler = (el as any)[propKey];
          if (typeof handler === "function") {
            handler(e);
          } else if (Array.isArray(handler) && typeof handler[0] === "function") {
            handler[0](handler[1], e);
          }
        };
        (el as any)[listenerKey] = listener;
        el.addEventListener(eventName, listener, isCapture);
      }
    } else if ((el as any)[listenerKey]) {
      el.removeEventListener(eventName, (el as any)[listenerKey], isCapture);
      (el as any)[listenerKey] = null;
    }
    return;
  }

  // Ref callback
  if (key === "ref" && typeof value === "function") {
    value(el);
    return;
  }

  // Two-way form binding (bind:value, bind:checked, bind)
  if (applyTwoWayBinding(el, key, value, applyProp)) {
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
