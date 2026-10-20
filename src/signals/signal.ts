/**
 * Visage Core Writable Signal & State Primitives
 */
import { batch, getCurrentScope, getCurrentSubscriber, warnedCyclicSubscribers } from "./system";
import {
  type IDependency,
  type ISubscriber,
  type ReadonlySignal,
  SIGNAL_BRAND,
  type SignalOptions,
  SubscriberState,
  type WritableSignal
} from "./types";

export type { SignalOptions };

/**
 * Core Writable Signal implementation
 */
export class Signal<T> implements IDependency {
  [SIGNAL_BRAND] = true as const;
  private _value: T;
  private _sub0: ISubscriber | null = null;
  private _sub1: ISubscriber | null = null;
  private _subs: Set<ISubscriber> | null = null;
  private _equals: (a: T, b: T) => boolean;
  private _onSet?: (val: T) => void;
  version = 0;

  constructor(initialValue: T, equals?: (a: T, b: T) => boolean, onSet?: (val: T) => void) {
    this._value = initialValue;
    this._equals = equals ?? Object.is;
    this._onSet = onSet;
  }

  get(): T {
    const curSub = getCurrentSubscriber();
    if (curSub !== null && curSub.state !== SubscriberState.DISPOSED) {
      // Fast path: unrolled 2-slot inline representation (_sub0, _sub1, _subs).
      // Avoids allocating a Set for ~80%+ of signals with 0-2 subscribers,
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
    return this._value;
  }

  peek(): T {
    return this._value;
  }

  private hasSubscriber(sub: ISubscriber): boolean {
    if (this._subs !== null) return this._subs.has(sub);
    return this._sub0 === sub || this._sub1 === sub;
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

  set(newValue: T): void {
    if (this._equals(this._value, newValue)) {
      return;
    }

    const curSub = getCurrentSubscriber();
    if (curSub !== null && this.hasSubscriber(curSub)) {
      if (!warnedCyclicSubscribers.has(curSub)) {
        warnedCyclicSubscribers.add(curSub);
        if (typeof console !== "undefined" && typeof console.warn === "function") {
          console.warn(
            `[Visage Reactivity] Cyclic update detected: An active subscriber modified a signal that it depends on. ` +
              `To read a signal inside an effect/computed without creating a circular dependency, wrap the read in untrack():\n` +
              `  untrack(() => signal())`
          );
        }
      }
    }

    this._value = newValue;
    this.version++;
    if (this._onSet) {
      this._onSet(newValue);
    }
    batch(() => {
      this.notify();
    });
  }

  update(fn: (prev: T) => T): void {
    this.set(fn(this._value));
  }

  get value(): T {
    return this.get();
  }

  set value(val: T) {
    this.set(val);
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

  private notify(): void {
    if (this._subs !== null) {
      for (const sub of this._subs) {
        sub.markDirty(SubscriberState.DIRTY);
      }
      return;
    }
    if (this._sub0 !== null) {
      this._sub0.markDirty(SubscriberState.DIRTY);
      if (this._sub1 !== null) {
        this._sub1.markDirty(SubscriberState.DIRTY);
      }
    }
  }
}

/**
 * Factory for creating writable, fine-grained reactive signals.
 *
 * Signals are the core primitive of Visage's reactivity. Reading a signal inside
 * a component JSX body, `computed()`, or `effect()` automatically registers that
 * computation as a dependent subscriber.
 *
 * @example
 * ```tsx
 * const count = signal(0);
 *
 * // Read value
 * console.log(count()); // 0
 * console.log(count.value); // 0
 *
 * // Write value
 * count.set(1);
 * count(2);
 * count.update(prev => prev + 1);
 *
 * // In JSX
 * <div>Current count: {count}</div>
 * ```
 *
 * @param initialValue - The initial value stored in the signal
 * @param optionsOrEquals - Custom equality comparison function or SignalOptions
 * @returns A writable reactive signal function accessor
 */
function resolveStorage(storageOption?: "local" | "session" | Storage): Storage | null {
  if (storageOption && typeof storageOption === "object") {
    return storageOption;
  }
  if (storageOption === "session") {
    try {
      if (typeof sessionStorage !== "undefined") return sessionStorage;
    } catch {}
    try {
      if (typeof window !== "undefined" && (window as any).sessionStorage) {
        return (window as any).sessionStorage;
      }
    } catch {}
    try {
      if (typeof globalThis !== "undefined" && (globalThis as any).sessionStorage) {
        return (globalThis as any).sessionStorage;
      }
    } catch {}
    return null;
  }

  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {}
  try {
    if (typeof window !== "undefined" && (window as any).localStorage) {
      return (window as any).localStorage;
    }
  } catch {}
  try {
    if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {}
  return null;
}

const SignalAccessorPrototype = {
  __proto__: Function.prototype,
  [SIGNAL_BRAND]: true,
  get(this: any) {
    return this._s.get();
  },
  peek(this: any) {
    return this._s.peek();
  },
  set(this: any, v: any) {
    return this._s.set(v);
  },
  update(this: any, fn: any) {
    return this._s.update(fn);
  },
  get value() {
    return (this as any)._s.get();
  },
  set value(v: any) {
    (this as any)._s.set(v);
  }
};

export function signal<T>(
  initialValue: T,
  optionsOrEquals?: ((a: T, b: T) => boolean) | SignalOptions<T>
): WritableSignal<T> {
  const equals = typeof optionsOrEquals === "function" ? optionsOrEquals : optionsOrEquals?.equals;
  const isInternal = typeof optionsOrEquals === "object" ? optionsOrEquals?.internal : false;
  const customName = typeof optionsOrEquals === "object" ? optionsOrEquals?.name : undefined;

  const persistOption = typeof optionsOrEquals === "object" ? optionsOrEquals?.persist : undefined;
  const persistConfig = persistOption
    ? typeof persistOption === "string"
      ? { key: persistOption }
      : persistOption
    : undefined;

  let effectiveInitial = initialValue;
  const storage = persistConfig ? resolveStorage(persistConfig.storage) : null;
  const serialize = persistConfig?.serialize ?? JSON.stringify;
  const deserialize = persistConfig?.deserialize ?? JSON.parse;

  if (persistConfig && storage) {
    try {
      const stored = storage.getItem(persistConfig.key);
      if (stored !== null) {
        effectiveInitial = deserialize(stored);
      }
    } catch {
      // Fallback cleanly to initialValue
    }
  }

  let isSyncing = false;
  const onSet =
    persistConfig && storage
      ? (val: T) => {
          if (isSyncing) return;
          try {
            storage.setItem(persistConfig.key, serialize(val));
          } catch {
            // Gracefully handle storage quota or access errors
          }
        }
      : undefined;

  const s = new Signal(effectiveInitial, equals, onSet);

  if (
    persistConfig &&
    storage &&
    (persistConfig.syncTabs ?? true) &&
    typeof window !== "undefined" &&
    typeof window.addEventListener === "function"
  ) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === persistConfig.key) {
        try {
          const nextVal = e.newValue !== null ? deserialize(e.newValue) : initialValue;
          isSyncing = true;
          try {
            s.set(nextVal);
          } finally {
            isSyncing = false;
          }
        } catch {
          // Ignore external malformed entries
        }
      }
    };
    window.addEventListener("storage", onStorage);
    const curScope = getCurrentScope();
    if (curScope) {
      curScope.addCleanup(() => {
        window.removeEventListener("storage", onStorage);
      });
    }
  }

  const accessor = ((...args: [value?: T]): T => {
    if (args.length === 0) {
      return s.get();
    }
    s.set(args[0] as T);
    return args[0] as T;
  }) as WritableSignal<T>;

  (accessor as any)._s = s;
  Object.setPrototypeOf(accessor, SignalAccessorPrototype);

  if (!isInternal && typeof window !== "undefined" && (window as any).__VISAGE_DEVTOOLS__) {
    const devtools = (window as any).__VISAGE_DEVTOOLS__;
    const sigId = devtools.registerSignal({
      name: customName,
      type: "signal",
      getValue: () => s.get(),
      version: () => s.version,
      subscribersCount: () => s.getSubscribersCount(),
      dependents: () =>
        s
          .getSubscribers()
          .map((sub: any) => sub._devId)
          .filter(Boolean)
    });
    (s as any)._devId = sigId;
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
 * Tuple-based signal constructor returning `[getter, setter]` (Solid / Preact Signals convention).
 *
 * @example
 * ```tsx
 * const [count, setCount] = createSignal(0);
 *
 * setCount(5);
 * setCount(prev => prev + 1);
 *
 * <div>Count: {count}</div>
 * ```
 *
 * @param initialValue - The initial value stored in the signal
 * @param optionsOrEquals - Custom equality comparison function or SignalOptions
 * @returns A tuple containing `[ReadonlySignal<T>, (value: T | ((prev: T) => T)) => void]`
 */
export function createSignal<T>(
  initialValue: T,
  optionsOrEquals?: ((a: T, b: T) => boolean) | SignalOptions<T>
): [ReadonlySignal<T>, (value: T | ((prev: T) => T)) => void] {
  const s = signal(initialValue, optionsOrEquals);
  const setter = (value: T | ((prev: T) => T)) => {
    if (typeof value === "function") {
      s.update(value as (prev: T) => T);
    } else {
      s.set(value);
    }
  };
  return [s, setter];
}
