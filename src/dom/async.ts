import {
  type ReadonlySignal,
  Scope,
  type WritableSignal,
  effect,
  getActiveScope,
  onCleanup,
  runInScope,
  signal
} from "../signals";
import { createContext, useContext } from "../signals/context";
import { type Child, type ReactiveValue, insertChild, resolveValue } from "./render";

// Suspense Context for tracking active async requests
export interface SuspenseContextValue {
  registerPromise(p: Promise<any>): void;
}

const SuspenseContext = createContext<SuspenseContextValue | null>(null);

export interface ResourceActions<T> {
  mutate(value: T): void;
  refetch(): Promise<T>;
  readonly loading: ReadonlySignal<boolean>;
  readonly error: ReadonlySignal<any>;
}

export type Resource<T> = ReadonlySignal<T | undefined> & ResourceActions<T>;

/**
 * Create an asynchronous resource tied to optional source signals and suspense boundaries
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

export interface SuspenseProps {
  fallback: Child;
  children: Child | (() => Child);
}

/**
 * Suspense boundary for zero-VDOM async coordination
 */
export function Suspense(props: SuspenseProps): Node {
  const marker = document.createTextNode("");
  const initialFrag = document.createDocumentFragment();
  const pendingCount = signal(0);
  let currentScope: Scope | null = null;
  let currentNodes: Node[] = [];
  let isMounted = false;

  const suspenseValue: SuspenseContextValue = {
    registerPromise(p: Promise<any>) {
      pendingCount.update((c) => c + 1);
      p.finally(() => {
        pendingCount.update((c) => Math.max(0, c - 1));
      });
    }
  };

  const renderContent = (content: Child) => {
    const parent = marker.parentNode ?? (!isMounted ? initialFrag : null);
    if (!parent) return;

    for (const n of currentNodes) {
      if (n.parentNode) n.parentNode.removeChild(n);
    }
    currentNodes = [];

    const frag = document.createDocumentFragment();
    insertChild(frag, content);
    currentNodes = Array.from(frag.childNodes);

    if (marker.parentNode) {
      marker.parentNode.insertBefore(frag, marker);
    } else if (!isMounted) {
      initialFrag.appendChild(frag);
    }
  };

  effect(() => {
    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }

    currentScope = new Scope(getActiveScope());

    runInScope(currentScope, () => {
      const SuspenseProvider = SuspenseContext.Provider;
      let rendered: any;
      let threwPromise: Promise<any> | null = null;

      try {
        rendered = SuspenseProvider({
          value: suspenseValue,
          children: props.children
        });
      } catch (err: any) {
        if (err && typeof err.then === "function") {
          threwPromise = err;
          suspenseValue.registerPromise(err);
        } else {
          throw err;
        }
      }

      if (pendingCount() > 0 || threwPromise) {
        renderContent(props.fallback);
      } else {
        renderContent(rendered);
      }
    });
  });

  isMounted = true;
  initialFrag.appendChild(marker);

  onCleanup(() => {
    if (currentScope) currentScope.dispose();
  });

  return initialFrag;
}

export interface ErrorBoundaryProps {
  fallback: Child | ((error: any, reset: () => void) => Child);
  children: Child | (() => Child);
}

/**
 * ErrorBoundary catches rendering and effect errors in subtrees
 */
export function ErrorBoundary(props: ErrorBoundaryProps): Node {
  const marker = document.createTextNode("");
  const initialFrag = document.createDocumentFragment();
  const currentError = signal<any>(null);
  let currentScope: Scope | null = null;
  let currentNodes: Node[] = [];
  let isMounted = false;

  const reset = () => {
    currentError.set(null);
  };

  const renderNodes = (child: Child) => {
    const parent = marker.parentNode ?? (!isMounted ? initialFrag : null);
    if (!parent) return;

    for (const n of currentNodes) {
      if (n.parentNode) n.parentNode.removeChild(n);
    }
    currentNodes = [];

    const frag = document.createDocumentFragment();
    insertChild(frag, child);
    currentNodes = Array.from(frag.childNodes);

    if (marker.parentNode) {
      marker.parentNode.insertBefore(frag, marker);
    } else if (!isMounted) {
      initialFrag.appendChild(frag);
    }
  };

  effect(() => {
    const err = currentError();

    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }

    currentScope = new Scope(getActiveScope());

    runInScope(currentScope, () => {
      if (err !== null) {
        const fallbackNode =
          typeof props.fallback === "function"
            ? (props.fallback as (err: any, reset: () => void) => Child)(err, reset)
            : props.fallback;
        renderNodes(fallbackNode);
      } else {
        try {
          const content =
            typeof props.children === "function"
              ? (props.children as () => Child)()
              : props.children;
          renderNodes(content);
        } catch (catchedErr) {
          currentError.set(catchedErr);
        }
      }
    });
  });

  isMounted = true;
  initialFrag.appendChild(marker);

  onCleanup(() => {
    if (currentScope) currentScope.dispose();
  });

  return initialFrag;
}
