import { effect, type ReadonlySignal, signal, type WritableSignal } from "../signals";
import { createContext, useContext } from "../signals/context";
import { type ReactiveValue, resolveValue } from "./render";

// Suspense Context for tracking active async requests
export interface SuspenseContextValue {
  registerPromise(p: Promise<any>): void;
}

export const SuspenseContext = createContext<SuspenseContextValue | null>(null);

export interface ResourceActions<T> {
  mutate(value: T): void;
  refetch(): Promise<T>;
  readonly loading: ReadonlySignal<boolean>;
  readonly error: ReadonlySignal<any>;
}

export type Resource<T> = ReadonlySignal<T | undefined> & ResourceActions<T>;

/**
 * Create an asynchronous resource tied to optional source signals and suspense boundaries.
 *
 * Automatically tracks async state, registers pending promises with `<Suspense>`,
 * and supports manual mutation and refetching.
 *
 * @example
 * ```tsx
 * const [userId, setUserId] = createSignal("user-1");
 * const user = createResource(userId, (id) => fetchUser(id));
 *
 * // Read data, loading state, error
 * <div>{() => user()?.name}</div>
 * ```
 *
 * @param sourceOrFetcher - A reactive source signal or direct async fetcher function
 * @param maybeFetcher - Async fetcher taking the resolved source value
 * @returns A reactive Resource accessor with `.loading`, `.error`, `.mutate`, and `.refetch`
 */
export function createResource<T>(fetcher: () => Promise<T>): Resource<T>;
export function createResource<T, S>(
  source: ReactiveValue<S>,
  fetcher: (source: S) => Promise<T>
): Resource<T>;
export function createResource<T, S>(
  sourceOrFetcher: ReactiveValue<S> | (() => Promise<T>),
  maybeFetcher?: (source: S) => Promise<T>
): Resource<T> {
  const isDirect = typeof maybeFetcher !== "function";
  const fetcher = isDirect ? (sourceOrFetcher as () => Promise<T>) : maybeFetcher!;
  const source = isDirect ? null : (sourceOrFetcher as ReactiveValue<S>);

  const data: WritableSignal<T | undefined> = signal<T | undefined>(undefined);
  const loading = signal<boolean>(true);
  const error = signal<any>(null);

  let currentPromise: Promise<T> | null = null;
  let requestId = 0;

  const load = async (arg?: S): Promise<T> => {
    const currentReq = ++requestId;
    loading.set(true);
    error.set(null);

    const promise = isDirect ? (fetcher as () => Promise<T>)() : fetcher(arg!);
    currentPromise = promise;

    const suspense = useContext(SuspenseContext);
    if (suspense) {
      suspense.registerPromise(promise);
    }

    try {
      const res = await promise;
      if (currentReq === requestId) {
        data.set(res);
        loading.set(false);
        currentPromise = null;
      }
      return res;
    } catch (err) {
      if (currentReq === requestId) {
        error.set(err);
        loading.set(false);
        currentPromise = null;
      }
      throw err;
    }
  };

  if (source) {
    effect(() => {
      const sourceVal = resolveValue(source);
      if (sourceVal !== false && sourceVal !== null && sourceVal !== undefined) {
        load(sourceVal).catch(() => {});
      }
    });
  } else {
    load().catch(() => {});
  }

  const accessor = ((): T | undefined => {
    if (loading() && currentPromise) {
      const suspense = useContext(SuspenseContext);
      if (suspense) {
        suspense.registerPromise(currentPromise);
      }
    }
    return data();
  }) as Resource<T>;

  Object.defineProperties(accessor, {
    loading: { get: () => loading },
    error: { get: () => error },
    mutate: { value: (val: T) => data.set(val) },
    refetch: { value: () => (source ? load(resolveValue(source)) : load()) }
  });

  return accessor;
}
