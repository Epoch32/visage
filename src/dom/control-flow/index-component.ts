import {
  effect,
  getActiveScope,
  onCleanup,
  runInScope,
  Scope,
  signal,
  untrack,
  type WritableSignal
} from "@signals";
import { type Child, insertChild, type ReactiveValue, removeNodes, resolveValue } from "../render";

export interface IndexProps<T> {
  each: ReactiveValue<readonly T[] | undefined | null>;
  fallback?: Child;
  children: (item: () => T, index: number) => Child;
}

interface IndexRecord<T> {
  itemSignal: WritableSignal<T>;
  scope: Scope;
  nodes: Node[];
}

/**
 * Non-keyed / position-indexed list renderer with fine-grained item value reactivity.
 *
 * DOM nodes are tied to array indices rather than item values. When list items change,
 * the signal for that index is updated without moving or recreating DOM elements.
 * Best suited for lists of primitives, editable text arrays, and fixed-slot items.
 *
 * @example
 * ```tsx
 * const tags = signal(["typescript", "visage", "reactive"]);
 *
 * <Index each={tags}>
 *   {(tag, index) => <span>#{index + 1}: {tag}</span>}
 * </Index>
 * ```
 */
export function Index<T>(props: IndexProps<T>): any {
  if (typeof document === "undefined") {
    const rawList = resolveValue(props.each);
    if (!rawList || rawList.length === 0) {
      return props.fallback !== undefined ? props.fallback : null;
    }
    return rawList.map((item, index) => {
      const itemSignal = () => item;
      return props.children(itemSignal, index);
    });
  }

  const marker = document.createTextNode("");
  const initialFrag = document.createDocumentFragment();
  let items: IndexRecord<T>[] = [];
  let fallbackNodes: Node[] = [];
  let fallbackScope: Scope | null = null;
  let isMounted = false;

  effect(() => {
    const rawList = resolveValue(props.each);
    const list: readonly T[] = Array.isArray(rawList)
      ? rawList
      : rawList
        ? Array.from(rawList)
        : [];
    const parent = marker.parentNode;

    // Handle empty list -> render fallback
    if (list.length === 0) {
      for (const rec of items) {
        rec.scope.dispose();
        removeNodes(rec.nodes);
      }
      items = [];

      if (props.fallback !== undefined && fallbackNodes.length === 0) {
        fallbackScope = new Scope(getActiveScope());
        untrack(() => {
          runInScope(fallbackScope!, () => {
            const frag = document.createDocumentFragment();
            insertChild(frag, props.fallback);
            fallbackNodes = Array.from(frag.childNodes);
            if (isMounted && parent) {
              parent.insertBefore(frag, marker);
            } else {
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

    if (!parent && isMounted) return;

    const prevLength = items.length;
    const newLength = list.length;

    // 1. Update existing index signals
    const commonLength = Math.min(prevLength, newLength);
    for (let i = 0; i < commonLength; i++) {
      const nextItem = list[i] as T;
      const sig = items[i]!.itemSignal;
      if (sig.peek() !== nextItem) {
        untrack(() => {
          sig.set(nextItem);
        });
      }
    }

    // 2. Add new items if list expanded
    if (newLength > prevLength) {
      for (let i = prevLength; i < newLength; i++) {
        const itemVal = list[i] as T;
        const itemSignal = signal<T>(itemVal, { internal: true });
        const itemScope = new Scope(getActiveScope());
        let itemNodes: Node[] = [];

        untrack(() => {
          runInScope(itemScope, () => {
            const frag = document.createDocumentFragment();
            const child = props.children(itemSignal, i);
            insertChild(frag, child);
            itemNodes = Array.from(frag.childNodes);

            if (isMounted && parent) {
              parent.insertBefore(frag, marker);
            } else {
              initialFrag.appendChild(frag);
            }
          });
        });

        items.push({
          itemSignal,
          scope: itemScope,
          nodes: itemNodes
        });
      }
    } else if (newLength < prevLength) {
      // 3. Remove excess items if list shrank
      for (let i = newLength; i < prevLength; i++) {
        const removed = items[i]!;
        removed.scope.dispose();
        removeNodes(removed.nodes);
      }
      items.length = newLength;
    }
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
