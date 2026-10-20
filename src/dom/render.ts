import { createRoot, onCleanup } from "@signals";
import { type Child, insertChild } from "./insert";

/**
 * Mount a Visage component or element to a DOM container
 */
export function render(fn: () => Child, container: HTMLElement | DocumentFragment): () => void {
  if (!container) {
    if (typeof document !== "undefined" && document.readyState === "loading") {
      let dispose: (() => void) | undefined;
      const onReady = () => {
        const el =
          document.getElementById("app") || document.getElementById("root") || document.body;
        if (el) {
          dispose = render(fn, el);
        }
      };
      document.addEventListener("DOMContentLoaded", onReady, { once: true });
      return () => {
        document.removeEventListener("DOMContentLoaded", onReady);
        dispose?.();
      };
    }
    console.error("[visage] render(..., container): Target container is null or undefined.");
    return () => {};
  }
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

export { applyTwoWayBinding } from "./bind";
export {
  type Child,
  insertChild,
  isReactive,
  type ReactiveValue,
  resolveValue
} from "./insert";
export {
  applyProp,
  setAttribute,
  setStyleProperty
} from "./props";
