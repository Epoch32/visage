import { effect, getActiveScope, onCleanup, runInScope, Scope, signal, untrack } from "@signals";
import { type Child, insertChild, type ReactiveValue, removeNodes, resolveValue } from "../render";
import { reconcileKeyedList } from "./for/reconcile";
import { ItemRecord } from "./for/record";

export interface ForProps<T> {
  each: ReactiveValue<readonly T[] | undefined | null>;
  fallback?: Child;
  by?: (item: T) => any;
  children: (item: T, index: () => number) => Child;
}

export { reconcileKeyedList } from "./for/reconcile";
export { ItemRecord } from "./for/record";

const defaultGetKey = <T>(it: T): any => it;
const dummyIndex = () => 0;

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

  const marker = document.createComment("visage-for");
  const initialFrag = document.createDocumentFragment();
  let items: ItemRecord<T>[] = [];
  let fallbackScope: Scope | null = null;
  let fallbackNodes: Node[] = [];
  let isMounted = false;

  const getKey = props.by ?? defaultGetKey;
  const needsIndex = props.children.length > 1;

  effect(() => {
    const list = resolveValue(props.each) ?? [];
    const parent = marker.parentNode ?? (!isMounted ? initialFrag : null);

    if (list.length === 0) {
      // Clear items
      if (items.length > 0) {
        for (const rec of items) {
          rec.dispose();
        }

        if (marker.parentNode) {
          const parentEl = marker.parentNode;
          const firstNode = items[0]?.firstNode;
          if (firstNode && parentEl.firstChild === firstNode && parentEl.lastChild === marker) {
            parentEl.textContent = "";
            parentEl.appendChild(marker);
          } else {
            for (const rec of items) {
              rec.remove();
            }
          }
        }
        items = [];
      }

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
      removeNodes(fallbackNodes);
      fallbackNodes = [];
    }

    if (!parent) return;

    const createRecord = (item: T, index: number): ItemRecord<T> => {
      const indexSignal = needsIndex ? signal(index, { internal: true }) : undefined;
      const indexGetter = indexSignal ?? dummyIndex;
      const itemScope = new Scope(getActiveScope(), true);
      let child: any = null;

      untrack(() => {
        runInScope(itemScope, () => {
          child = props.children(item, indexGetter as any);
        });
      });

      let primaryNode: Node;
      let extraNodes: Node[] | null = null;
      if (child instanceof DocumentFragment) {
        const rawNodes = Array.from(child.childNodes);
        primaryNode = rawNodes[0] ?? document.createTextNode("");
        extraNodes = rawNodes.length > 1 ? rawNodes.slice(1) : null;
      } else if (child instanceof Node) {
        primaryNode = child;
      } else if (Array.isArray(child)) {
        let first: Node | undefined;
        let extras: Node[] | null = null;
        for (let i = 0; i < child.length; i++) {
          const n = child[i];
          if (n instanceof DocumentFragment) {
            const rawNodes = Array.from(n.childNodes);
            for (let j = 0; j < rawNodes.length; j++) {
              const fragChild = rawNodes[j]!;
              if (first === undefined) {
                first = fragChild;
              } else {
                if (extras === null) extras = [];
                extras.push(fragChild);
              }
            }
          } else if (n instanceof Node) {
            if (first === undefined) {
              first = n;
            } else {
              if (extras === null) extras = [];
              extras.push(n);
            }
          }
        }
        primaryNode = first ?? document.createTextNode("");
        extraNodes = extras;
      } else if (child !== null && child !== undefined && child !== false && child !== true) {
        primaryNode = document.createTextNode(String(child));
      } else {
        primaryNode = document.createTextNode("");
      }

      return new ItemRecord(item, getKey(item), itemScope, primaryNode, extraNodes, indexSignal);
    };

    items = reconcileKeyedList({
      parent,
      marker,
      items,
      list,
      getKey,
      needsIndex,
      createRecord
    });
  });

  isMounted = true;
  initialFrag.appendChild(marker);

  onCleanup(() => {
    for (const rec of items) {
      rec.dispose();
    }
    if (fallbackScope) {
      fallbackScope.dispose();
    }
  });

  return initialFrag;
}
