/**
 * Visage Lazy, Glitch-Free Computed State Engine
 */
import type { Scope } from "./scope";
import {
  getCurrentScope,
  getCurrentSubscriber,
  setCurrentScope,
  setCurrentSubscriber
} from "./system";
import {
  COMPUTED_BRAND,
  type ComputedOptions,
  type IDependency,
  type ISubscriber,
  type ReadonlySignal,
  SubscriberState
} from "./types";

export type { ComputedOptions };

/**
 * Computed / Derived reactive state (Lazy, Glitch-Free, Memoized)
 */
export class Computed<T> implements ISubscriber, IDependency {
  [COMPUTED_BRAND] = true as const;
  private _fn: () => T;
  private _value!: T;
  private _sub0: ISubscriber | null = null;
  private _sub1: ISubscriber | null = null;
  private _subs: Set<ISubscriber> | null = null;
  private _source0: IDependency | null = null;
  private _version0 = 0;
  private _source1: IDependency | null = null;
  private _version1 = 0;
  private _sources: Set<IDependency> | null = null;
  private _sourceVersions: Map<IDependency, number> | null = null;
  state: SubscriberState = SubscriberState.DIRTY;
  scope: Scope | null;
  version = 0;

  get sources(): Set<IDependency> {
    if (this._sources !== null) return this._sources;
    const s = new Set<IDependency>();
    if (this._source0 !== null) s.add(this._source0);
    if (this._source1 !== null) s.add(this._source1);
    return s;
  }

  get sourceVersions(): Map<IDependency, number> {
    if (this._sourceVersions !== null) return this._sourceVersions;
    const m = new Map<IDependency, number>();
    if (this._source0 !== null) m.set(this._source0, this._version0);
    if (this._source1 !== null) m.set(this._source1, this._version1);
    return m;
  }

  get _subscribers(): Set<ISubscriber> {
    if (this._subs !== null) return this._subs;
    const s = new Set<ISubscriber>();
    if (this._sub0 !== null) s.add(this._sub0);
    if (this._sub1 !== null) s.add(this._sub1);
    return s;
  }

  getSubscribersCount(): number {
    if (this._subs !== null) return this._subs.size;
    let count = 0;
    if (this._sub0 !== null) count++;
    if (this._sub1 !== null) count++;
    return count;
  }

  getSubscribers(): ISubscriber[] {
    if (this._subs !== null) return Array.from(this._subs);
    const arr: ISubscriber[] = [];
    if (this._sub0 !== null) arr.push(this._sub0);
    if (this._sub1 !== null) arr.push(this._sub1);
    return arr;
  }

  constructor(fn: () => T) {
    this._fn = fn;
    this.scope = getCurrentScope();
    if (this.scope) {
      this.scope.addSubscriber(this);
    }
  }

  get(): T {
    if (this.state === SubscriberState.DISPOSED) {
      return this._fn();
    }

    const curSub = getCurrentSubscriber();
    if (curSub !== null && curSub.state !== SubscriberState.DISPOSED) {
      // Fast path: unrolled 2-slot inline representation (_sub0, _sub1, _subs).
      // Avoids allocating a Set for ~80%+ of computeds with 0-2 subscribers,
      // preserving zero GC allocations and monomorphic property access on hot paths.
      if (this._subs !== null) {
        this._subs.add(curSub);
      } else if (this._sub0 === null) {
        this._sub0 = curSub;
      } else if (this._sub0 === curSub) {
        // already subscribed
      } else if (this._sub1 === null) {
        this._sub1 = curSub;
      } else if (this._sub1 === curSub) {
        // already subscribed
      } else {
        const set = new Set<ISubscriber>();
        set.add(this._sub0);
        set.add(this._sub1);
        set.add(curSub);
        this._subs = set;
        this._sub0 = null;
        this._sub1 = null;
      }
      curSub.addSource(this, this.version);
    }

    if (this.state === SubscriberState.DIRTY || this.state === SubscriberState.CHECK_DIRTY) {
      this.updateIfNecessary();
    }

    return this._value;
  }

  peek(): T {
    if (this.state === SubscriberState.DISPOSED) {
      return this._fn();
    }
    if (this.state === SubscriberState.DIRTY || this.state === SubscriberState.CHECK_DIRTY) {
      this.updateIfNecessary();
    }
    return this._value;
  }

  get value(): T {
    return this.get();
  }

  removeSubscriber(sub: ISubscriber): void {
    if (this._subs !== null) {
      this._subs.delete(sub);
      if (this._subs.size === 0) {
        this._subs = null;
      }
      return;
    }
    if (this._sub0 === sub) {
      this._sub0 = this._sub1;
      this._sub1 = null;
      return;
    }
    if (this._sub1 === sub) {
      this._sub1 = null;
    }
  }

  addSource(source: IDependency, version: number): void {
    if (this._sources !== null) {
      this._sources.add(source);
      this._sourceVersions!.set(source, version);
      return;
    }
    if (this._source0 === null) {
      this._source0 = source;
      this._version0 = version;
      return;
    }
    if (this._source0 === source) {
      this._version0 = version;
      return;
    }
    if (this._source1 === null) {
      this._source1 = source;
      this._version1 = version;
      return;
    }
    if (this._source1 === source) {
      this._version1 = version;
      return;
    }

    const s = new Set<IDependency>();
    const m = new Map<IDependency, number>();
    s.add(this._source0);
    m.set(this._source0, this._version0);
    s.add(this._source1);
    m.set(this._source1, this._version1);
    s.add(source);
    m.set(source, version);
    this._sources = s;
    this._sourceVersions = m;
    this._source0 = null;
    this._source1 = null;
  }

  markDirty(targetState: SubscriberState = SubscriberState.CHECK_DIRTY): void {
    if (this.state >= targetState || this.state === SubscriberState.DISPOSED) {
      return;
    }
    this.state = targetState;

    if (this._subs !== null) {
      for (const sub of this._subs) {
        sub.markDirty(SubscriberState.CHECK_DIRTY);
      }
      return;
    }
    if (this._sub0 !== null) {
      this._sub0.markDirty(SubscriberState.CHECK_DIRTY);
    }
    if (this._sub1 !== null) {
      this._sub1.markDirty(SubscriberState.CHECK_DIRTY);
    }
  }

  updateIfNecessary(): boolean {
    if (this.state === SubscriberState.DIRTY) {
      const prev = this._value;
      this.recompute();
      return !Object.is(prev, this._value);
    }

    if (this.state === SubscriberState.CHECK_DIRTY) {
      let anyChanged = false;
      if (this._sources !== null) {
        for (const source of this._sources) {
          if (source instanceof Computed) {
            source.updateIfNecessary();
          }
          const lastVersion = this._sourceVersions!.get(source);
          if (lastVersion !== undefined && lastVersion !== source.version) {
            anyChanged = true;
            break;
          }
        }
      } else {
        if (this._source0 !== null) {
          if (this._source0 instanceof Computed) {
            this._source0.updateIfNecessary();
          }
          if (this._version0 !== this._source0.version) {
            anyChanged = true;
          }
        }
        if (!anyChanged && this._source1 !== null) {
          if (this._source1 instanceof Computed) {
            this._source1.updateIfNecessary();
          }
          if (this._version1 !== this._source1.version) {
            anyChanged = true;
          }
        }
      }

      if (anyChanged) {
        const prev = this._value;
        this.recompute();
        return !Object.is(prev, this._value);
      }

      this.state = SubscriberState.CLEAN;
      return false;
    }

    return false;
  }

  private recompute(): void {
    this.cleanupSources();

    const prevSubscriber = getCurrentSubscriber();
    setCurrentSubscriber(this);
    const prevScope = getCurrentScope();
    setCurrentScope(this.scope);

    try {
      const next = this._fn();
      if (!Object.is(this._value, next)) {
        this._value = next;
        this.version++;
      }
      this.state = SubscriberState.CLEAN;
    } finally {
      setCurrentSubscriber(prevSubscriber);
      setCurrentScope(prevScope);
    }
  }

  private cleanupSources(): void {
    if (this._sources !== null) {
      for (const source of this._sources) {
        source.removeSubscriber(this);
      }
      this._sources = null;
      this._sourceVersions = null;
      return;
    }
    if (this._source0 !== null) {
      this._source0.removeSubscriber(this);
      this._source0 = null;
    }
    if (this._source1 !== null) {
      this._source1.removeSubscriber(this);
      this._source1 = null;
    }
  }

  dispose(): void {
    if (this.state === SubscriberState.DISPOSED) return;
    this.state = SubscriberState.DISPOSED;
    this.cleanupSources();
    this._sub0 = null;
    this._sub1 = null;
    this._subs = null;
  }
}

/**
 * Factory for creating lazy, memoized, glitch-free computed signals.
 *
 * Computed values are only recalculated when one of their recorded reactive
 * dependencies changes and the value is actually accessed.
 *
 * @example
 * ```tsx
 * const count = signal(2);
 * const double = computed(() => count() * 2);
 *
 * console.log(double()); // 4
 *
 * // In JSX, passes directly or as a function
 * <div>Doubled value: {double}</div>
 * ```
 *
 * @param fn - The pure reactive computation function
 * @param options - Optional debug metadata and internal flags
 * @returns A readonly reactive signal function accessor
 */
const ComputedAccessorPrototype = {
  __proto__: Function.prototype,
  [COMPUTED_BRAND]: true,
  get(this: any) {
    return this._c.get();
  },
  peek(this: any) {
    return this._c.peek();
  },
  get value() {
    return (this as any)._c.get();
  }
};

export function computed<T>(fn: () => T, options?: ComputedOptions): ReadonlySignal<T> {
  const isInternal = options?.internal ?? false;
  const customName = options?.name;

  const c = new Computed(fn);

  const accessor = ((): T => c.get()) as ReadonlySignal<T>;
  (accessor as any)._c = c;
  Object.setPrototypeOf(accessor, ComputedAccessorPrototype);

  if (!isInternal && typeof window !== "undefined" && (window as any).__VISAGE_DEVTOOLS__) {
    const devtools = (window as any).__VISAGE_DEVTOOLS__;
    const sigId = devtools.registerSignal({
      name: customName,
      type: "computed",
      getValue: () => c.get(),
      version: () => c.version,
      subscribersCount: () => c.getSubscribersCount(),
      dependencies: () =>
        Array.from(c.sources ?? [])
          .map((src: any) => (src as any)._devId)
          .filter(Boolean),
      dependents: () =>
        c
          .getSubscribers()
          .map((sub: any) => sub._devId)
          .filter(Boolean)
    });
    (c as any)._devId = sigId;
    const curScope = getCurrentScope();
    if (curScope) {
      curScope.addCleanup(() => {
        devtools.unregisterSignal(sigId);
      });
    }
  }

  return accessor;
}

/**
 * Solid-compatible alias for `computed()`.
 *
 * @example
 * ```tsx
 * const count = signal(5);
 * const squared = createMemo(() => count() ** 2);
 * ```
 */
export const createMemo = computed;
