/**
 * Visage Reactive Scope & Lifecycle Management
 */
import { getCurrentScope, getCurrentSubscriber, setCurrentScope } from "./system";
import type { CleanupFn, ISubscriber } from "./types";

/**
 * Reactive Scope for lifecycle and automatic memory management
 */
export class Scope {
  subscribers = new Set<ISubscriber>();
  cleanups: CleanupFn[] = [];
  parent: Scope | null = null;
  isDisposed = false;
  context?: Map<symbol, any>;

  constructor(parent: Scope | null = getCurrentScope()) {
    this.parent = parent;
    if (parent && !parent.isDisposed) {
      parent.cleanups.push(() => this.dispose());
      if (parent.context) {
        this.context = new Map(parent.context);
      }
    }
  }

  addSubscriber(sub: ISubscriber): void {
    if (this.isDisposed) return;
    this.subscribers.add(sub);
  }

  addCleanup(fn: CleanupFn): void {
    if (this.isDisposed) {
      fn();
      return;
    }
    this.cleanups.push(fn);
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    for (const sub of this.subscribers) {
      sub.dispose();
    }
    this.subscribers.clear();

    for (let i = this.cleanups.length - 1; i >= 0; i--) {
      try {
        this.cleanups[i]!();
      } catch (err) {
        console.error("Error during cleanup:", err);
      }
    }
    this.cleanups = [];
  }
}

/**
 * Register a cleanup callback for the current running effect or active scope.
 *
 * Runs automatically when the enclosing component/scope unmounts or before
 * the effect re-executes.
 *
 * @example
 * ```tsx
 * function TimerComponent() {
 *   const id = setInterval(() => console.log("tick"), 1000);
 *   onCleanup(() => clearInterval(id));
 *   return <div>Timer running</div>;
 * }
 * ```
 */
export function onCleanup(fn: CleanupFn): void {
  const curSub = getCurrentSubscriber();
  const curScope = getCurrentScope();
  if (curSub && "addCleanup" in curSub) {
    (curSub as any).addCleanup(fn);
  } else if (curScope) {
    curScope.addCleanup(fn);
  }
}

/**
 * Create an isolated reactive root scope that outlives the current execution context.
 *
 * Computations and signals created inside `fn` will not be tied to any parent scope
 * and will persist until the provided `dispose` callback is invoked.
 *
 * @example
 * ```tsx
 * const dispose = createRoot((dispose) => {
 *   const count = signal(0);
 *   effect(() => console.log(count()));
 *   return dispose;
 * });
 *
 * // Later, dispose of all memory & subscribers
 * dispose();
 * ```
 *
 * @param fn - A factory function receiving the `dispose` callback
 * @returns The return value of `fn`
 */
export function createRoot<T>(fn: (dispose: () => void) => T): T {
  const prevScope = getCurrentScope();
  const scope = new Scope(null);
  setCurrentScope(scope);
  try {
    return fn(() => scope.dispose());
  } finally {
    setCurrentScope(prevScope);
  }
}

/**
 * Run a function with a specified reactive scope active.
 */
export function runInScope<T>(scope: Scope | null, fn: () => T): T {
  const prevScope = getCurrentScope();
  setCurrentScope(scope);
  try {
    return fn();
  } finally {
    setCurrentScope(prevScope);
  }
}

/**
 * Get the currently active reactive scope.
 */
export function getActiveScope(): Scope | null {
  return getCurrentScope();
}
