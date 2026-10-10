/**
 * Visage Core Writable Signal & State Primitives
 */
import { batch, currentScope, currentSubscriber, warnedCyclicSubscribers } from "./system";
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
  private _subscribers: Set<ISubscriber> = new Set();
  private _equals: (a: T, b: T) => boolean;
  version = 0;

  constructor(initialValue: T, equals?: (a: T, b: T) => boolean) {
    this._value = initialValue;
    this._equals = equals ?? Object.is;
  }

  get(): T {
    if (currentSubscriber !== null && currentSubscriber.state !== SubscriberState.DISPOSED) {
      this._subscribers.add(currentSubscriber);
      currentSubscriber.sources.add(this);
      currentSubscriber.sourceVersions.set(this, this.version);
    }
    return this._value;
  }

  set(newValue: T): void {
    if (this._equals(this._value, newValue)) {
      return;
    }

    if (currentSubscriber !== null && this._subscribers.has(currentSubscriber)) {
      if (!warnedCyclicSubscribers.has(currentSubscriber)) {
        warnedCyclicSubscribers.add(currentSubscriber);
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
    this._subscribers.delete(sub);
  }

  private notify(): void {
    if (this._subscribers.size === 0) return;

    const subs = Array.from(this._subscribers);
    for (const sub of subs) {
      sub.markDirty(SubscriberState.DIRTY);
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
export function signal<T>(
  initialValue: T,
  optionsOrEquals?: ((a: T, b: T) => boolean) | SignalOptions<T>
): WritableSignal<T> {
  const equals = typeof optionsOrEquals === "function" ? optionsOrEquals : optionsOrEquals?.equals;
  const isInternal = typeof optionsOrEquals === "object" ? optionsOrEquals?.internal : false;
  const customName = typeof optionsOrEquals === "object" ? optionsOrEquals?.name : undefined;

  const s = new Signal(initialValue, equals);

  const accessor = ((...args: [value?: T]): T => {
    if (args.length === 0) {
      return s.get();
    }
    s.set(args[0] as T);
    return args[0] as T;
  }) as WritableSignal<T>;

  Object.defineProperties(accessor, {
    [SIGNAL_BRAND]: { value: true },
    get: { value: () => s.get() },
    set: { value: (v: T) => s.set(v) },
    update: { value: (fn: (prev: T) => T) => s.update(fn) },
    value: {
      get: () => s.get(),
      set: (v: T) => s.set(v)
    }
  });

  if (!isInternal && typeof window !== "undefined" && (window as any).__VISAGE_DEVTOOLS__) {
    const devtools = (window as any).__VISAGE_DEVTOOLS__;
    const sigId = devtools.registerSignal({
      name: customName,
      type: "signal",
      getValue: () => s.get(),
      version: () => s.version,
      subscribersCount: () => (s as any)._subscribers?.size ?? 0,
      dependents: () =>
        Array.from((s as any)._subscribers ?? [])
          .map((sub: any) => sub._devId)
          .filter(Boolean)
    });
    (s as any)._devId = sigId;
    if (currentScope) {
      currentScope.addCleanup(() => {
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
