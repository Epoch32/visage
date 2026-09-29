import { SignalState, type StateOptions } from './core/state';
import { batch, untrack } from './core/batch';
import { subtle } from './subtle';

export type { StateOptions };
export { batch, untrack };
export {
  ReactiveNode,
  getActiveConsumer,
  setActiveConsumer,
  trackDependency,
  propagateChange,
  clearDependencies,
} from './core/node';
export { CLEAN, CHECK_DIRTY, DIRTY, RUNNING, DISPOSED } from './core/flags';

/**
 * Callable Signal interface:
 * - Calling `s()` reads the value.
 * - Methods `s.set()`, `s.update()`, `s.peek()` provide explicit mutation and inspection.
 */
export interface Signal<T> {
  (): T;
  get(): T;
  set(value: T): void;
  update(fn: (prev: T) => T): void;
  peek(): T;
  readonly version: number;
  readonly node: SignalState<T>;
  readonly [SIGNAL_BRAND]: true;
}

const SIGNAL_BRAND = Symbol.for('@epoch32/signal');

/**
 * Creates an atomic reactive signal cell.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * console.log(count()); // 0
 * count.set(1);
 * count.update(n => n + 1);
 * console.log(count.peek()); // 2
 * ```
 */
export function signal<T>(initialValue: T, options?: StateOptions<T>): Signal<T> {
  const node = new SignalState<T>(initialValue, options);

  const accessor: any = function () {
    return node.get();
  };

  accessor.get = () => node.get();
  accessor.set = (val: T) => node.set(val);
  accessor.update = (fn: (prev: T) => T) => node.update(fn);
  accessor.peek = () => node.peek();

  Object.defineProperty(accessor, 'version', {
    get: () => node.version,
    enumerable: true,
  });

  Object.defineProperty(accessor, 'node', {
    value: node,
    writable: false,
    enumerable: false,
  });

  Object.defineProperty(accessor, SIGNAL_BRAND, {
    value: true,
    writable: false,
    enumerable: false,
  });

  return accessor as Signal<T>;
}

/**
 * Type guard verifying if an object is an Epoch32 Signal.
 */
export function isSignal(value: unknown): value is Signal<unknown> {
  return typeof value === 'function' && (value as any)[SIGNAL_BRAND] === true;
}

/**
 * TC39 Standard namespace representation.
 */
export const Signal = {
  State: SignalState,
  subtle,
};

export default signal;
