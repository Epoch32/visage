import { effect, getActiveScope, onCleanup, runInScope, Scope, untrack } from "@signals";
import { type Child, insertChild, removeNodes } from "../render";

export interface PortalProps {
  mount?: HTMLElement | null;
  children: Child | (() => Child);
}

/**
 * Portal renders children into a different DOM container while preserving reactive context
 */
export function Portal(props: PortalProps): any {
  if (typeof document === "undefined") {
    return null;
  }

  const marker = document.createTextNode("");
  let currentScope: Scope | null = null;
  let nodes: Node[] = [];

  effect(() => {
    const target = props.mount ?? document.body;
    if (!target) return;

    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }
    removeNodes(nodes);
    nodes = [];

    currentScope = new Scope(getActiveScope());
    untrack(() => {
      runInScope(currentScope, () => {
        const childRes =
          typeof props.children === "function" ? (props.children as () => Child)() : props.children;
        const frag = document.createDocumentFragment();
        insertChild(frag, childRes);
        nodes = Array.from(frag.childNodes);
        target.appendChild(frag);
      });
    });
  });

  onCleanup(() => {
    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }
    removeNodes(nodes);
    nodes = [];
  });

  return marker;
}
