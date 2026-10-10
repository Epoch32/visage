import { effect, getActiveScope, onCleanup, runInScope, Scope, signal } from "../signals";
import { type Child, insertChild } from "./render";
import {
  createResource,
  type Resource,
  type ResourceActions,
  SuspenseContext,
  type SuspenseContextValue
} from "./resource";

export {
  type Component,
  type LazyComponent,
  lazy
} from "./lazy";
export {
  createResource,
  type Resource,
  type ResourceActions,
  SuspenseContext,
  type SuspenseContextValue
};

export interface SuspenseProps {
  fallback: Child;
  children: Child | (() => Child);
}

/**
 * Suspense boundary for fine-grained async coordination.
 * Displays the `fallback` UI while child async resources or queries are loading.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<div>Loading profile...</div>}>
 *   <UserProfile />
 * </Suspense>
 * ```
 */
export function Suspense(props: SuspenseProps): any {
  if (typeof document === "undefined") {
    return typeof props.children === "function"
      ? (props.children as () => Child)()
      : props.children;
  }

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
      let threwPromise: Promise<any> | null = null;
      let rendered: any = null;

      try {
        const SuspenseProvider = SuspenseContext.Provider;
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
 * Catches JavaScript rendering and effect errors in descendant subtrees
 * and displays a fallback UI instead of crashing the application.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={(err, reset) => (
 *   <div>
 *     <p>Something went wrong: {err.message}</p>
 *     <button onClick={reset}>Retry</button>
 *   </div>
 * )}>
 *   <RiskyComponent />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundary(props: ErrorBoundaryProps): any {
  if (typeof document === "undefined") {
    try {
      return typeof props.children === "function"
        ? (props.children as () => Child)()
        : props.children;
    } catch (err: any) {
      return typeof props.fallback === "function"
        ? (props.fallback as any)(err, () => {})
        : props.fallback;
    }
  }

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
