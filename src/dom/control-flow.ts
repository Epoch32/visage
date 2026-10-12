import {
  effect,
  getActiveScope,
  onCleanup,
  runInScope,
  Scope,
  signal,
  untrack,
  type WritableSignal
} from "../signals";
import { type Child, insertChild, type ReactiveValue, resolveValue } from "./render";

export interface ShowProps<T> {
  when: ReactiveValue<T | false | null | undefined>;
  fallback?: Child;
  children: Child | ((item: () => T) => Child);
}

/**
 * Conditionally renders JSX children when the `when` condition evaluates to truthy,
 * with fine-grained reactive scope lifecycle management and automatic fallback rendering.
 *
 * @example
 * ```tsx
 * const loggedIn = signal(false);
 *
 * <Show when={loggedIn} fallback={<div>Please log in</div>}>
 *   <Dashboard />
 * </Show>
 * ```
 */
export function Show<T>(props: ShowProps<T>): any {
  if (typeof document === "undefined") {
    const condition = resolveValue(props.when);
    if (condition) {
      return typeof props.children === "function" && props.children.length > 0
        ? (props.children as (item: () => T) => Child)(() => resolveValue(props.when) as T)
        : typeof props.children === "function"
          ? (props.children as () => Child)()
          : props.children;
    }
    return props.fallback ?? null;
  }

  const marker = document.createComment("visage-show");
  const initialFrag = document.createDocumentFragment();
  initialFrag.appendChild(marker);

  let currentScope: Scope | null = null;
  let currentContent: Node[] = [];

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
          const fallbackRes =
            typeof props.fallback === "function"
              ? (props.fallback as () => Child)()
              : props.fallback;
          insertChild(frag, fallbackRes);
        });
      });
    }

    currentContent = Array.from(frag.childNodes);

    const parent = marker.parentNode;
    if (parent) {
      parent.insertBefore(frag, marker);
    }
  });

  onCleanup(() => {
    if (currentScope) {
      currentScope.dispose();
    }
    for (const node of currentContent) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    if (marker.parentNode) {
      marker.parentNode.removeChild(marker);
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
  indexSignal: WritableSignal<number>;
}

/**
 * Keyed / referential list renderer with fine-grained item reconciliation.
 *
 * Items in the list are reused across array mutations without re-rendering existing items
 * or tearing down their active reactive scopes.
 *
 * @example
 * ```tsx
 * const items = signal(["Apple", "Banana", "Cherry"]);
 *
 * <For each={items} fallback={<div>No items found</div>}>
 *   {(item, index) => (
 *     <li>
 *       {index() + 1}. {item}
 *     </li>
 *   )}
 * </For>
 * ```
 */
export function For<T>(props: ForProps<T>): any {
  if (typeof document === "undefined") {
    const list = resolveValue(props.each) ?? [];
    if (list.length === 0) {
      return props.fallback ?? null;
    }
    return list.map((item, idx) => props.children(item, () => idx));
  }

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
    const prevMap = new Map<T, ItemRecord<T>[]>();

    for (const rec of items) {
      const group = prevMap.get(rec.item);
      if (group) {
        group.push(rec);
      } else {
        prevMap.set(rec.item, [rec]);
      }
    }

    // Fast-path: map existing or create new item scopes
    for (let i = 0; i < list.length; i++) {
      const item = list[i]!;
      const existingGroup = prevMap.get(item);
      const existing =
        existingGroup && existingGroup.length > 0 ? existingGroup.shift() : undefined;

      if (existing) {
        untrack(() => {
          existing.indexSignal.set(i);
        });
        newItems.push(existing);
      } else {
        const indexSignal = signal(i, { internal: true });
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
    for (const [, remainingGroup] of prevMap) {
      for (const removed of remainingGroup) {
        removed.scope.dispose();
        for (const node of removed.nodes) {
          if (node.parentNode) node.parentNode.removeChild(node);
        }
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
    const target = props.mount ?? (typeof document !== "undefined" ? document.body : null);
    if (!target) return;

    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }
    for (const node of nodes) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
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
    for (const node of nodes) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    nodes = [];
  });

  return marker;
}
