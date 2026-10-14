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
  private _subscribers: Set<ISubscriber> = new Set();
  sources: Set<IDependency> = new Set();
  sourceVersions: Map<IDependency, number> = new Map();
  state: SubscriberState = SubscriberState.DIRTY;
  scope: Scope | null;
  version = 0;

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
      this._subscribers.add(curSub);
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
    this._subscribers.delete(sub);
  }

  addSource(source: IDependency, version: number): void {
    this.sources.add(source);
    this.sourceVersions.set(source, version);
  }

  markDirty(targetState: SubscriberState = SubscriberState.CHECK_DIRTY): void {
    if (this.state >= targetState || this.state === SubscriberState.DISPOSED) {
      return;
    }
    this.state = targetState;

    for (const sub of this._subscribers) {
      sub.markDirty(SubscriberState.CHECK_DIRTY);
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
      for (const source of this.sources) {
        if (source instanceof Computed) {
          source.updateIfNecessary();
        }
        const lastVersion = this.sourceVersions.get(source);
        if (lastVersion !== undefined && lastVersion !== source.version) {
          anyChanged = true;
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
    for (const source of this.sources) {
      source.removeSubscriber(this);
    }
    this.sources.clear();
    this.sourceVersions.clear();
  }

  dispose(): void {
    if (this.state === SubscriberState.DISPOSED) return;
    this.state = SubscriberState.DISPOSED;
    this.cleanupSources();
    this._subscribers.clear();
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
      subscribersCount: () => (c as any)._subscribers?.size ?? 0,
      dependencies: () =>
        Array.from(c.sources ?? [])
          .map((src: any) => (src as any)._devId)
          .filter(Boolean),
      dependents: () =>
        Array.from((c as any)._subscribers ?? [])
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
