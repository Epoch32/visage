import { SignalComputed, type ComputedOptions } from './core/computed';

export type { ComputedOptions };
export { SignalComputed };

const COMPUTED_BRAND = Symbol.for('@epoch32/compute');

/**
 * Callable Computed derivation interface:
 * - Calling `c()` reads the memoized value.
 * - Methods `c.get()`, `c.peek()`, and `c.dispose()` provide explicit access and lifecycle control.
 */
export interface Computed<T> {
  (): T;
  get(): T;
  peek(): T;
  dispose(): void;
  readonly version: number;
  readonly node: SignalComputed<T>;
  readonly [COMPUTED_BRAND]: true;
}

/**
 * Creates a lazy memoized derivation in the reactive DAG.
 *
 * @param fn Computation function producing derived value
 * @param options Optional custom equality comparator or debug name
 *
 * @example
 * ```ts
 * const count = signal(1);
 * const double = computed(() => count() * 2);
 *
 * console.log(double()); // 2 (evaluated lazily)
 * count.set(5);
 * console.log(double()); // 10
 * ```
 */
export function computed<T>(fn: () => T, options?: ComputedOptions<T>): Computed<T> {
  const node = new SignalComputed<T>(fn, options);

  const accessor: any = function () {
    return node.get();
  };

  accessor.get = () => node.get();
  accessor.peek = () => node.peek();
  accessor.dispose = () => node.dispose();

  Object.defineProperty(accessor, 'version', {
    get: () => node.version,
    enumerable: true,
  });

  Object.defineProperty(accessor, 'node', {
    value: node,
    writable: false,
    enumerable: false,
  });

  Object.defineProperty(accessor, COMPUTED_BRAND, {
    value: true,
    writable: false,
    enumerable: false,
  });

  return accessor as Computed<T>;
}

/**
 * Type guard verifying if an entity is an Epoch32 Computed cell.
 */
export function isComputed(value: unknown): value is Computed<unknown> {
  return typeof value === 'function' && (value as any)[COMPUTED_BRAND] === true;
}

/**
 * TC39 Standard namespace representation.
 */
export const Signal = {
  Computed: SignalComputed,
};

export default computed;
