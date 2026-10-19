import { runInHydration } from "@dom/hydration";
import { type Child, insertChild } from "@dom/render";
import { createRoot, onCleanup } from "@signals";

/**
 * Hydrate server-rendered HTML by attaching fine-grained signal subscriptions and event listeners
 * without wiping or recreating the DOM tree.
 */
export function hydrate(fn: () => Child, container: HTMLElement | DocumentFragment): () => void {
  return createRoot((dispose) => {
    const hasExistingChildren = container.childNodes.length > 0;
    const node = runInHydration(container, () => fn());

    if (!hasExistingChildren || (node instanceof Node && node.parentNode !== container)) {
      if (!hasExistingChildren) {
        container.textContent = "";
      }
      insertChild(container, node);
    }

    onCleanup(() => {
      if (node && node instanceof Node && node.parentNode === container) {
        container.removeChild(node);
      }
    });

    return dispose;
  });
}
