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
import { type Child, insertChild, type ReactiveValue, resolveValue } from "../render";

export interface ForProps<T> {
  each: ReactiveValue<readonly T[] | undefined | null>;
  fallback?: Child;
  by?: (item: T) => any;
  children: (item: T, index: () => number) => Child;
}

class ItemRecord<T> {
  item: T;
  key: any;
  scope: Scope;
  node: Node;
  extraNodes: Node[] | null;
  indexSignal?: WritableSignal<number>;

  get nodes(): Node[] {
    if (this.extraNodes === null) return [this.node];
    return [this.node, ...this.extraNodes];
  }

  get firstNode(): Node {
    return this.node;
  }

  constructor(
    item: T,
    key: any,
    scope: Scope,
    node: Node,
    extraNodes: Node[] | null = null,
    indexSignal?: WritableSignal<number>
  ) {
    this.item = item;
    this.key = key;
    this.scope = scope;
    this.node = node;
    this.extraNodes = extraNodes;
    this.indexSignal = indexSignal;
  }
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

  const marker = document.createComment("visage-for");
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
      if (items.length > 0) {
        for (const rec of items) {
          rec.scope.dispose();
        }

        if (marker.parentNode) {
          const parentEl = marker.parentNode;
          const firstNode = items[0]?.firstNode;
          if (firstNode && parentEl.firstChild === firstNode && parentEl.lastChild === marker) {
            parentEl.textContent = "";
            parentEl.appendChild(marker);
          } else {
            for (const rec of items) {
              if (rec.extraNodes === null) {
                if (rec.node.parentNode) rec.node.parentNode.removeChild(rec.node);
              } else {
                for (const node of rec.nodes) {
                  if (node.parentNode) node.parentNode.removeChild(node);
                }
              }
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
      for (const node of fallbackNodes) {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
      fallbackNodes = [];
    }

    if (!parent) return;

    const getKey = (it: T) => (props.by ? props.by(it) : it);
    const needsIndex = props.children.length > 1;

    const createRecord = (item: T, index: number): ItemRecord<T> => {
      const indexSignal = needsIndex ? signal(index, { internal: true }) : undefined;
      const indexGetter = indexSignal ?? (() => index);
      const itemScope = new Scope(getActiveScope(), true);
      let child: any = null;

      untrack(() => {
        runInScope(itemScope, () => {
          child = props.children(item, indexGetter as any);
        });
      });

      let primaryNode: Node;
      let extraNodes: Node[] | null = null;
      if (child instanceof Node) {
        primaryNode = child;
      } else if (Array.isArray(child)) {
        const filtered = child.filter((n): n is Node => n instanceof Node);
        primaryNode = filtered[0] ?? document.createTextNode("");
        if (filtered.length > 1) {
          extraNodes = filtered.slice(1);
        }
      } else if (child !== null && child !== undefined && child !== false && child !== true) {
        primaryNode = document.createTextNode(String(child));
      } else {
        primaryNode = document.createTextNode("");
      }

      return new ItemRecord(item, getKey(item), itemScope, primaryNode, extraNodes, indexSignal);
    };

    // Fast-path 1: Initial Mount (from empty)
    if (items.length === 0) {
      const newItems: ItemRecord<T>[] = new Array(list.length);
      const frag = document.createDocumentFragment();

      for (let i = 0; i < list.length; i++) {
        const rec = createRecord(list[i]!, i);
        newItems[i] = rec;
        if (rec.extraNodes === null) {
          frag.appendChild(rec.node);
        } else {
          frag.appendChild(rec.node);
          for (let j = 0; j < rec.extraNodes.length; j++) {
            frag.appendChild(rec.extraNodes[j]!);
          }
        }
      }

      if (marker.parentNode) {
        marker.parentNode.insertBefore(frag, marker);
      } else if (!isMounted) {
        initialFrag.appendChild(frag);
      }

      items = newItems;
      return;
    }

    // Step 2: Skip identical prefix
    const oldLen = items.length;
    const newLen = list.length;
    let start = 0;
    const minLen = Math.min(oldLen, newLen);

    while (start < minLen && items[start]!.key === getKey(list[start]!)) {
      const rec = items[start]!;
      rec.item = list[start]!;
      if (rec.indexSignal) {
        const idx = start;
        untrack(() => rec.indexSignal!.set(idx));
      }
      start++;
    }

    // Step 3: Skip identical suffix
    let oldEnd = oldLen - 1;
    let newEnd = newLen - 1;

    while (oldEnd >= start && newEnd >= start && items[oldEnd]!.key === getKey(list[newEnd]!)) {
      const rec = items[oldEnd]!;
      rec.item = list[newEnd]!;
      if (rec.indexSignal) {
        const idx = newEnd;
        untrack(() => rec.indexSignal!.set(idx));
      }
      oldEnd--;
      newEnd--;
    }

    // Fast-path 2A: Pure insertion (prefix + suffix matched, items only inserted in middle)
    if (start > oldEnd) {
      const frag = document.createDocumentFragment();
      const after = newEnd + 1 < newLen ? (items[oldEnd + 1]?.firstNode ?? marker) : marker;
      const inserted: ItemRecord<T>[] = [];

      for (let i = start; i <= newEnd; i++) {
        const rec = createRecord(list[i]!, i);
        inserted.push(rec);
        if (rec.extraNodes === null) {
          frag.appendChild(rec.node);
        } else {
          frag.appendChild(rec.node);
          for (let j = 0; j < rec.extraNodes.length; j++) {
            frag.appendChild(rec.extraNodes[j]!);
          }
        }
      }

      if (marker.parentNode) {
        marker.parentNode.insertBefore(frag, after);
      }
      items.splice(start, 0, ...inserted);
      return;
    }

    // Fast-path 2B: Pure deletion (prefix + suffix matched, items only removed from middle)
    if (start > newEnd) {
      for (let i = start; i <= oldEnd; i++) {
        const rec = items[i]!;
        rec.scope.dispose();
        if (rec.extraNodes === null) {
          if (rec.node.parentNode) rec.node.parentNode.removeChild(rec.node);
        } else {
          for (const node of rec.nodes) {
            if (node.parentNode) node.parentNode.removeChild(node);
          }
        }
      }
      items.splice(start, oldEnd - start + 1);

      if (needsIndex) {
        for (let i = start; i < items.length; i++) {
          const rec = items[i]!;
          if (rec.indexSignal) {
            const idx = i;
            untrack(() => rec.indexSignal!.set(idx));
          }
        }
      }
      return;
    }

    // Fast-path 3: 2-Node Swap (e.g. swap rows 1 & 998, where only 2 items exchanged places)
    if (
      oldLen === newLen &&
      oldEnd > start &&
      items[start]!.key === getKey(list[newEnd]!) &&
      items[oldEnd]!.key === getKey(list[start]!)
    ) {
      let middleIntact = true;
      for (let k = start + 1; k < oldEnd; k++) {
        if (items[k]!.key !== getKey(list[k]!)) {
          middleIntact = false;
          break;
        }
      }

      if (middleIntact) {
        const recA = items[start]!;
        const recB = items[oldEnd]!;
        recA.item = list[newEnd]!;
        recB.item = list[start]!;

        if (marker.parentNode) {
          const parentEl = marker.parentNode;
          const afterB = oldEnd + 1 < oldLen ? (items[oldEnd + 1]?.firstNode ?? marker) : marker;

          if (oldEnd === start + 1) {
            // Adjacent nodes swap: insert B before A
            if (recB.extraNodes === null) {
              parentEl.insertBefore(recB.node, recA.firstNode);
            } else {
              for (const node of recB.nodes) {
                parentEl.insertBefore(node, recA.firstNode);
              }
            }
          } else {
            // Non-adjacent swap: insert B before successor of A, and insert A before afterB
            const nextA = items[start + 1]?.firstNode ?? marker;
            if (recB.extraNodes === null) {
              parentEl.insertBefore(recB.node, nextA);
            } else {
              for (const node of recB.nodes) {
                parentEl.insertBefore(node, nextA);
              }
            }
            if (recA.extraNodes === null) {
              parentEl.insertBefore(recA.node, afterB);
            } else {
              for (const node of recA.nodes) {
                parentEl.insertBefore(node, afterB);
              }
            }
          }
        }

        items[start] = recB;
        items[oldEnd] = recA;

        if (needsIndex) {
          if (recB.indexSignal) {
            untrack(() => recB.indexSignal!.set(start));
          }
          if (recA.indexSignal) {
            untrack(() => recA.indexSignal!.set(oldEnd));
          }
        }

        return;
      }
    }

    // Fast-path 4: Complete Replacement (e.g. #run when items exist, zero overlapping keys)
    const prevMap = new Map<any, ItemRecord<T> | ItemRecord<T>[]>();
    for (let i = start; i <= oldEnd; i++) {
      const rec = items[i]!;
      const existing = prevMap.get(rec.key);
      if (existing === undefined) {
        prevMap.set(rec.key, rec);
      } else if (Array.isArray(existing)) {
        existing.push(rec);
      } else {
        prevMap.set(rec.key, [existing, rec]);
      }
    }

    let overlapCount = 0;
    for (let i = start; i <= newEnd; i++) {
      if (prevMap.has(getKey(list[i]!))) overlapCount++;
    }

    if (overlapCount === 0 && start === 0 && oldEnd === oldLen - 1 && newEnd === newLen - 1) {
      // 100% replacement: bulk container clear + single fragment insertion
      for (const rec of items) rec.scope.dispose();

      const newItems: ItemRecord<T>[] = new Array(list.length);
      const frag = document.createDocumentFragment();

      for (let i = 0; i < list.length; i++) {
        const rec = createRecord(list[i]!, i);
        newItems[i] = rec;
        if (rec.extraNodes === null) {
          frag.appendChild(rec.node);
        } else {
          frag.appendChild(rec.node);
          for (let j = 0; j < rec.extraNodes.length; j++) frag.appendChild(rec.extraNodes[j]!);
        }
      }

      if (marker.parentNode) {
        const parentEl = marker.parentNode;
        parentEl.textContent = "";
        parentEl.appendChild(marker);
        parentEl.insertBefore(frag, marker);
      }
      items = newItems;
      return;
    }

    // Step 5: Middle Map reconciliation (e.g. complex permutations)
    const result: ItemRecord<T>[] = items.slice(0, start);

    for (let i = start; i <= newEnd; i++) {
      const item = list[i]!;
      const key = getKey(item);
      const entry = prevMap.get(key);
      let existing: ItemRecord<T> | undefined;

      if (entry !== undefined) {
        if (Array.isArray(entry)) {
          existing = entry.shift();
          if (entry.length === 0) prevMap.delete(key);
        } else {
          existing = entry;
          prevMap.delete(key);
        }
      }

      if (existing) {
        existing.item = item;
        if (existing.indexSignal) {
          const idx = i;
          untrack(() => existing!.indexSignal!.set(idx));
        }
        result.push(existing);
      } else {
        result.push(createRecord(item, i));
      }
    }

    // Clean up removed items in the middle
    for (const [, remaining] of prevMap) {
      if (Array.isArray(remaining)) {
        for (const removed of remaining) {
          removed.scope.dispose();
          if (removed.extraNodes === null) {
            if (removed.node.parentNode) removed.node.parentNode.removeChild(removed.node);
          } else {
            for (const node of removed.nodes) {
              if (node.parentNode) node.parentNode.removeChild(node);
            }
          }
        }
      } else {
        remaining.scope.dispose();
        if (remaining.extraNodes === null) {
          if (remaining.node.parentNode) remaining.node.parentNode.removeChild(remaining.node);
        } else {
          for (const node of remaining.nodes) {
            if (node.parentNode) node.parentNode.removeChild(node);
          }
        }
      }
    }

    // Reorder DOM nodes in result slice
    const endMarker = newEnd + 1 < newLen ? (items[oldEnd + 1]?.firstNode ?? marker) : marker;
    let currentMarker: Node = endMarker;
    for (let i = result.length - 1; i >= start; i--) {
      const rec = result[i]!;
      if (rec.extraNodes === null) {
        const node = rec.node;
        if (node.nextSibling !== currentMarker) {
          marker.parentNode?.insertBefore(node, currentMarker);
        }
        currentMarker = node;
      } else {
        for (let j = rec.nodes.length - 1; j >= 0; j--) {
          const node = rec.nodes[j]!;
          if (node.nextSibling !== currentMarker) {
            marker.parentNode?.insertBefore(node, currentMarker);
          }
          currentMarker = node;
        }
      }
    }

    result.push(...items.slice(oldEnd + 1));
    items = result;
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
