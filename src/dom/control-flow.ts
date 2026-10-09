import { effect, getActiveScope, onCleanup, runInScope, Scope, untrack } from "../signals";
import { type Child, insertChild, type ReactiveValue, resolveValue } from "./render";

export interface ShowProps<T> {
  when: ReactiveValue<T | false | null | undefined>;
  fallback?: Child;
  children: Child | ((item: () => T) => Child);
}

/**
 * Show conditionally renders children when condition is truthy, with fine-grained scope teardown
 */
export function Show<T>(props: ShowProps<T>): Node {
  const marker = document.createTextNode("");
  const initialFrag = document.createDocumentFragment();
  let currentScope: Scope | null = null;
  let currentContent: Node[] = [];
  let isMounted = false;

  effect(() => {
    const condition = resolveValue(props.when);

    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }

    // Clean up old nodes from DOM
    for (const node of currentContent) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    currentContent = [];

    const frag = document.createDocumentFragment();

    if (condition) {
      currentScope = new Scope(getActiveScope());
      untrack(() => {
        runInScope(currentScope, () => {
          const childRes =
            typeof props.children === "function" && props.children.length > 0
              ? (props.children as (item: () => T) => Child)(() => resolveValue(props.when) as T)
              : typeof props.children === "function"
                ? (props.children as () => Child)()
                : props.children;

          insertChild(frag, childRes);
        });
      });
    } else if (props.fallback !== undefined) {
      currentScope = new Scope(getActiveScope());
      untrack(() => {
        runInScope(currentScope, () => {
          insertChild(frag, props.fallback);
        });
      });
    }

    currentContent = Array.from(frag.childNodes);

    if (marker.parentNode) {
      marker.parentNode.insertBefore(frag, marker);
    } else if (!isMounted) {
      initialFrag.appendChild(frag);
    }
  });

  isMounted = true;
  initialFrag.appendChild(marker);

  onCleanup(() => {
    if (currentScope) {
      currentScope.dispose();
    }
  });

  return initialFrag;
}

export interface ForProps<T> {
  each: ReactiveValue<readonly T[] | undefined | null>;
  fallback?: Child;
  children: (item: T, index: () => number) => Child;
}

interface ItemRecord<T> {
  item: T;
  scope: Scope;
  nodes: Node[];
  indexSignal: (val?: number) => number;
}

/**
 * For renders a reactive list with keyed/item-reconciliation without full-tree re-rendering
 */
export function For<T>(props: ForProps<T>): Node {
  const marker = document.createTextNode("");
  const initialFrag = document.createDocumentFragment();
  let items: ItemRecord<T>[] = [];
  let fallbackScope: Scope | null = null;
  let fallbackNodes: Node[] = [];
  let isMounted = false;

  effect(() => {
    const list = resolveValue(props.each) ?? [];
    const parent = marker.parentNode ?? (!isMounted ? initialFrag : null);

    if (list.length === 0) {
      // Clear items
      for (const rec of items) {
        rec.scope.dispose();
        for (const node of rec.nodes) {
          if (node.parentNode) node.parentNode.removeChild(node);
        }
      }
      items = [];

      // Render fallback
      if (props.fallback !== undefined && fallbackNodes.length === 0 && parent) {
        fallbackScope = new Scope(getActiveScope());
        untrack(() => {
          runInScope(fallbackScope, () => {
            const frag = document.createDocumentFragment();
            insertChild(frag, props.fallback);
            fallbackNodes = Array.from(frag.childNodes);
            if (marker.parentNode) {
              marker.parentNode.insertBefore(frag, marker);
            } else if (!isMounted) {
              initialFrag.appendChild(frag);
            }
          });
        });
      }
      return;
    }

    // Clean up fallback if present
    if (fallbackNodes.length > 0) {
      if (fallbackScope) {
        fallbackScope.dispose();
        fallbackScope = null;
      }
      for (const node of fallbackNodes) {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
      fallbackNodes = [];
    }

    if (!parent) return;

    const newItems: ItemRecord<T>[] = [];
    const prevMap = new Map<T, ItemRecord<T>>();

    for (const rec of items) {
      prevMap.set(rec.item, rec);
    }

    // Fast-path: map existing or create new item scopes
    for (let i = 0; i < list.length; i++) {
      const item = list[i]!;
      const existing = prevMap.get(item);

      if (existing) {
        existing.indexSignal(i);
        newItems.push(existing);
        prevMap.delete(item);
      } else {
        let indexVal = i;
        const indexSubscribers = new Set<() => void>();
        const indexSignal = (...args: [number?]): number => {
          if (args.length > 0 && args[0] !== undefined && args[0] !== indexVal) {
            indexVal = args[0];
            for (const sub of Array.from(indexSubscribers)) sub();
          }
          return indexVal;
        };

        const itemScope = new Scope(getActiveScope());
        let itemNodes: Node[] = [];

        untrack(() => {
          runInScope(itemScope, () => {
            const frag = document.createDocumentFragment();
            const child = props.children(item, indexSignal);
            insertChild(frag, child);
            itemNodes = Array.from(frag.childNodes);
          });
        });

        newItems.push({
          item,
          scope: itemScope,
          nodes: itemNodes,
          indexSignal
        });
      }
    }

    // Clean up removed items
    for (const [, removed] of prevMap) {
      removed.scope.dispose();
      for (const node of removed.nodes) {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
    }

    // Reorder / insert DOM nodes
    if (marker.parentNode) {
      let currentMarker: Node = marker;
      for (let i = newItems.length - 1; i >= 0; i--) {
        const rec = newItems[i]!;
        for (let j = rec.nodes.length - 1; j >= 0; j--) {
          const node = rec.nodes[j]!;
          if (node.nextSibling !== currentMarker) {
            marker.parentNode.insertBefore(node, currentMarker);
          }
          currentMarker = node;
        }
      }
    } else if (!isMounted) {
      for (const rec of newItems) {
        for (const node of rec.nodes) {
          initialFrag.appendChild(node);
        }
      }
    }

    items = newItems;
  });

  isMounted = true;
  initialFrag.appendChild(marker);

  onCleanup(() => {
    for (const rec of items) {
      rec.scope.dispose();
    }
    if (fallbackScope) {
      fallbackScope.dispose();
    }
  });

  return initialFrag;
}
