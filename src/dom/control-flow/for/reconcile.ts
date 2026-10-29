import { untrack, type WritableSignal } from "@signals";
import type { ItemRecord } from "./record";

function updateIndexSignal(signal: WritableSignal<number> | undefined, newIndex: number): void {
  if (signal && signal.peek() !== newIndex) {
    untrack(() => signal.set(newIndex));
  }
}

export interface ReconcileContext<T> {
  parent: Node;
  marker: Comment;
  items: ItemRecord<T>[];
  list: readonly T[];
  getKey: (it: T) => any;
  needsIndex: boolean;
  createRecord: (item: T, index: number) => ItemRecord<T>;
}

export function reconcileKeyedList<T>(ctx: ReconcileContext<T>): ItemRecord<T>[] {
  const { parent, marker, list, getKey, needsIndex, createRecord } = ctx;
  const items = ctx.items;

  // Fast-path 1: Initial Mount (from empty)
  if (items.length === 0) {
    const newItems: ItemRecord<T>[] = new Array(list.length);
    const frag = document.createDocumentFragment();

    for (let i = 0; i < list.length; i++) {
      const rec = createRecord(list[i]!, i);
      newItems[i] = rec;
      rec.append(frag);
    }

    if (marker.parentNode) {
      marker.parentNode.insertBefore(frag, marker);
    } else {
      parent.appendChild(frag);
    }

    return newItems;
  }

  // Step 2: Skip identical prefix
  const oldLen = items.length;
  const newLen = list.length;
  let start = 0;
  const minLen = Math.min(oldLen, newLen);

  while (start < minLen && items[start]!.key === getKey(list[start]!)) {
    const rec = items[start]!;
    rec.item = list[start]!;
    updateIndexSignal(rec.indexSignal, start);
    start++;
  }

  // Step 3: Skip identical suffix
  let oldEnd = oldLen - 1;
  let newEnd = newLen - 1;

  while (oldEnd >= start && newEnd >= start && items[oldEnd]!.key === getKey(list[newEnd]!)) {
    const rec = items[oldEnd]!;
    rec.item = list[newEnd]!;
    updateIndexSignal(rec.indexSignal, newEnd);
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
      rec.append(frag);
    }

    if (marker.parentNode) {
      marker.parentNode.insertBefore(frag, after);
    }
    items.splice(start, 0, ...inserted);
    return items;
  }

  // Fast-path 2B: Pure deletion (prefix + suffix matched, items only removed from middle)
  if (start > newEnd) {
    for (let i = start; i <= oldEnd; i++) {
      const rec = items[i]!;
      rec.dispose();
      rec.remove();
    }
    items.splice(start, oldEnd - start + 1);

    if (needsIndex) {
      for (let i = start; i < items.length; i++) {
        updateIndexSignal(items[i]!.indexSignal, i);
      }
    }
    return items;
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
          recB.insertBefore(parentEl, recA.firstNode);
        } else {
          // Non-adjacent swap: insert B before successor of A, and insert A before afterB
          const nextA = items[start + 1]?.firstNode ?? marker;
          recB.insertBefore(parentEl, nextA);
          recA.insertBefore(parentEl, afterB);
        }
      }

      items[start] = recB;
      items[oldEnd] = recA;

      if (needsIndex) {
        updateIndexSignal(recB.indexSignal, start);
        updateIndexSignal(recA.indexSignal, oldEnd);
      }

      return items;
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

  if (start === 0 && oldEnd === oldLen - 1 && newEnd === newLen - 1) {
    let hasOverlap = false;
    for (let i = 0; i <= newEnd; i++) {
      if (prevMap.has(getKey(list[i]!))) {
        hasOverlap = true;
        break;
      }
    }

    if (!hasOverlap) {
      // 100% replacement: bulk container clear + single fragment insertion
      for (const rec of items) rec.dispose();

      const newItems: ItemRecord<T>[] = new Array(list.length);
      const frag = document.createDocumentFragment();

      for (let i = 0; i < list.length; i++) {
        const rec = createRecord(list[i]!, i);
        newItems[i] = rec;
        rec.append(frag);
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
        parentEl.insertBefore(frag, marker);
      }
      return newItems;
    }
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
      updateIndexSignal(existing.indexSignal, i);
      result.push(existing);
    } else {
      result.push(createRecord(item, i));
    }
  }

  // Clean up removed items in the middle
  for (const [, remaining] of prevMap) {
    if (Array.isArray(remaining)) {
      for (const removed of remaining) {
        removed.dispose();
        removed.remove();
      }
    } else {
      remaining.dispose();
      remaining.remove();
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
      const extra = rec.extraNodes;
      for (let j = extra.length - 1; j >= 0; j--) {
        const node = extra[j]!;
        if (node.nextSibling !== currentMarker) {
          marker.parentNode?.insertBefore(node, currentMarker);
        }
        currentMarker = node;
      }
      const node = rec.node;
      if (node.nextSibling !== currentMarker) {
        marker.parentNode?.insertBefore(node, currentMarker);
      }
      currentMarker = node;
    }
  }

  for (let i = oldEnd + 1; i < oldLen; i++) {
    result.push(items[i]!);
  }
  return result;
}
