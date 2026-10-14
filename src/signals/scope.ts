/**
 * Visage Reactive Scope & Lifecycle Management
 */
import { getCurrentScope, getCurrentSubscriber, setCurrentScope } from "./system";
import type { CleanupFn, ISubscriber } from "./types";

/**
 * Reactive Scope for lifecycle and automatic memory management
 */
export class Scope {
  private _sub0: ISubscriber | null = null;
  private _sub1: ISubscriber | null = null;
  private _subs: Set<ISubscriber> | null = null;
  children: Set<Scope> | null = null;
  cleanups: CleanupFn[] | null = null;
  parent: Scope | null = null;
  isDisposed = false;
  context?: Map<symbol, any>;

  get subscribers(): Set<ISubscriber> | null {
    if (this._subs !== null) return this._subs;
    if (this._sub0 === null) return null;
    const s = new Set<ISubscriber>();
    s.add(this._sub0);
    if (this._sub1 !== null) s.add(this._sub1);
    return s;
  }

  constructor(parent: Scope | null = getCurrentScope(), detached = false) {
    this.parent = parent;
    if (parent && !parent.isDisposed) {
      if (!detached) {
        if (!parent.children) parent.children = new Set();
        parent.children.add(this);
      }
      if (parent.context) {
        this.context = parent.context;
      }
    }
  }

  addSubscriber(sub: ISubscriber): void {
    if (this.isDisposed) return;
    if (this._subs !== null) {
      this._subs.add(sub);
    } else if (this._sub0 === null) {
      this._sub0 = sub;
    } else if (this._sub0 === sub) {
      // already added
    } else if (this._sub1 === null) {
      this._sub1 = sub;
    } else if (this._sub1 === sub) {
      // already added
    } else {
      const set = new Set<ISubscriber>();
      set.add(this._sub0);
      set.add(this._sub1);
      set.add(sub);
      this._subs = set;
      this._sub0 = null;
      this._sub1 = null;
    }
  }

  removeSubscriber(sub: ISubscriber): void {
    if (this._subs !== null) {
      this._subs.delete(sub);
    } else if (this._sub0 === sub) {
      this._sub0 = this._sub1;
      this._sub1 = null;
    } else if (this._sub1 === sub) {
      this._sub1 = null;
    }
  }

  addCleanup(fn: CleanupFn): void {
    if (this.isDisposed) {
      fn();
      return;
    }
    if (!this.cleanups) this.cleanups = [];
    this.cleanups.push(fn);
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    if (this.parent?.children) {
      this.parent.children.delete(this);
    }

    if (this.children) {
      for (const child of this.children) {
        child.dispose();
      }
      this.children.clear();
      this.children = null;
    }

    if (this._sub0 !== null) {
      this._sub0.dispose();
      this._sub0 = null;
    }
    if (this._sub1 !== null) {
      this._sub1.dispose();
      this._sub1 = null;
    }
    if (this._subs !== null) {
      for (const sub of this._subs) {
        sub.dispose();
      }
      this._subs.clear();
      this._subs = null;
    }

    if (this.cleanups) {
      for (let i = this.cleanups.length - 1; i >= 0; i--) {
        try {
          this.cleanups[i]!();
        } catch (err) {
          console.error("Error during cleanup:", err);
        }
      }
      this.cleanups = null;
    }
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
