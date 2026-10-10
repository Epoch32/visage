import { useContext } from "../signals/context";
import type { Child } from "./render";
import { createResource, SuspenseContext } from "./resource";

export type Component<P = any> = (props: P) => Child;

export type LazyComponent<T extends Component<any>> = T & {
  preload(): Promise<T>;
};

/**
 * Lazy load an asynchronous component with automatic `<Suspense>` boundary coordination and preloading.
 *
 * Dynamically imports the component module upon first render or when `.preload()` is invoked.
 *
 * @example
 * ```tsx
 * // Dynamic code-split component
 * const HeavyChart = lazy(() => import("./HeavyChart"));
 *
 * // Optional early prefetching
 * HeavyChart.preload();
 *
 * // Render inside Suspense
 * <Suspense fallback={<div>Loading chart...</div>}>
 *   <HeavyChart data={chartData()} />
 * </Suspense>
 * ```
 *
 * @param importer - Dynamic import function returning a component or `{ default: Component }`
 * @returns A lazy component with a `.preload()` method
 */
export function lazy<T extends Component<any>>(
  importer: () => Promise<{ default: T } | T>
): LazyComponent<T> {
  let loadedComponent: T | null = null;
  let loadingPromise: Promise<T> | null = null;

  const preload = (): Promise<T> => {
    if (loadedComponent) {
      return Promise.resolve(loadedComponent);
    }
    if (!loadingPromise) {
      loadingPromise = importer()
        .then((mod) => {
          const comp =
            mod && typeof mod === "object" && "default" in mod
              ? (mod as { default: T }).default
              : (mod as T);
          loadedComponent = comp;
          return comp;
        })
        .catch((err) => {
          loadingPromise = null;
          throw err;
        });
    }
    return loadingPromise;
  };

  const LazyWrapper = ((props: any) => {
    if (loadedComponent) {
      return loadedComponent(props);
    }

    const promise = preload();
    const suspense = useContext(SuspenseContext);
    if (suspense) {
      suspense.registerPromise(promise);
    }

    const res = createResource(() => promise);
    return () => {
      const Comp = res();
      return Comp ? Comp(props) : null;
    };
  }) as LazyComponent<T>;

  LazyWrapper.preload = preload;

  return LazyWrapper;
}
