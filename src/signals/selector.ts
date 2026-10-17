/**
 * Visage Fine-Grained Reactive Selector
 *
 * Provides O(1) observer notification for conditional selection in large lists/collections.
 * Avoids O(N) observer wakeups when a single item in a list becomes selected or unselected.
 */
import { effect } from "./effect";
import { getCurrentSubscriber, untrack } from "./system";
import { type IDependency, type ISubscriber, SubscriberState } from "./types";

class SelectorDependency implements IDependency {
  version = 0;
  private _sub0: ISubscriber | null = null;
  private _sub1: ISubscriber | null = null;
  private _subs: Set<ISubscriber> | null = null;

  get subscribers(): Set<ISubscriber> {
    if (this._subs !== null) return this._subs;
    const s = new Set<ISubscriber>();
    if (this._sub0 !== null) s.add(this._sub0);
    if (this._sub1 !== null) s.add(this._sub1);
    return s;
  }

  get size(): number {
    if (this._subs !== null) return this._subs.size;
    let count = 0;
    if (this._sub0 !== null) count++;
    if (this._sub1 !== null) count++;
    return count;
  }

  addSubscriber(sub: ISubscriber): void {
    if (this._subs !== null) {
      this._subs.add(sub);
    } else if (this._sub0 === null) {
      this._sub0 = sub;
    } else if (this._sub0 === sub) {
      // already subscribed
    } else if (this._sub1 === null) {
      this._sub1 = sub;
    } else if (this._sub1 === sub) {
      // already subscribed
    } else {
      const set = new Set<ISubscriber>();
      set.add(this._sub0);
      set.add(this._sub1);
      set.add(sub);
      this._subs = set;
      this._sub0 = null;
      this._sub1 = null;
    }
  }

  removeSubscriber(sub: ISubscriber): void {
    if (this._subs !== null) {
      this._subs.delete(sub);
    } else if (this._sub0 === sub) {
      this._sub0 = this._sub1;
      this._sub1 = null;
    } else if (this._sub1 === sub) {
      this._sub1 = null;
    }
  }

  notify(): void {
    this.version++;
    if (this._sub0 !== null) this._sub0.markDirty();
    if (this._sub1 !== null) this._sub1.markDirty();
    if (this._subs !== null) {
      for (const sub of this._subs) {
        sub.markDirty();
      }
    }
  }
}

/**
 * Creates an optimized conditional selector signal.
 *
 * Only the previously selected key and newly selected key notify their subscribers,
 * preventing O(N) re-computations when selecting items in large lists.
 *
 * @example
 * ```ts
 * const selected = signal<number | null>(null);
 * const isSelected = createSelector(selected);
 *
 * // In 10,000 list rows:
 * <tr class={isSelected(row.id) ? "danger" : ""}>
 * ```
 */
export function createSelector<T, U = T>(
  source: () => T,
  equals?: (a: U, b: T) => boolean
): (key: U) => boolean {
  const isDefaultEqual = !equals;
  const eq = equals ?? ((a: any, b: any) => a === b);
  const map = new Map<U, SelectorDependency>();
  let prevValue: T = untrack(source);

  effect(() => {
    const nextValue = source();
    untrack(() => {
      if (eq(prevValue as any, nextValue)) return;

      if (isDefaultEqual) {
        const prevDep = map.get(prevValue as any);
        if (prevDep) {
          prevDep.notify();
          if (prevDep.size === 0) {
            map.delete(prevValue as any);
          }
        }
        const nextDep = map.get(nextValue as any);
        if (nextDep) {
          nextDep.notify();
          if (nextDep.size === 0) {
            map.delete(nextValue as any);
          }
        }
      } else {
        for (const [key, dep] of map) {
          const wasMatch = eq(key, prevValue);
          const isMatch = eq(key, nextValue);
          if (wasMatch !== isMatch) {
            dep.notify();
            if (dep.size === 0) {
              map.delete(key);
            }
          }
        }
      }

      prevValue = nextValue;
    });
  });

  return (key: U): boolean => {
    const curSub = getCurrentSubscriber();
    if (curSub !== null && curSub.state !== SubscriberState.DISPOSED) {
      let dep = map.get(key);
      if (!dep) {
        dep = new SelectorDependency();
        map.set(key, dep);
      }
      dep.addSubscriber(curSub);
      curSub.addSource(dep, dep.version);
    }

    return eq(key, prevValue);
  };
}
