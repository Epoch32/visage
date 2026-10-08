import { type Child, insertChild } from "../dom/render";
import { createRoot, onCleanup } from "../signals";

/**
 * Hydrate server-rendered HTML by attaching fine-grained signal subscriptions and event listeners
 */
export function hydrate(fn: () => Child, container: HTMLElement | DocumentFragment): () => void {
  return createRoot((dispose) => {
    // Adopt / mount fine-grained reactive tree into container
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
