/**
 * Visage Reactive Scope & Lifecycle Management
 */
import { currentScope, currentSubscriber, getCurrentScope, setCurrentScope } from "./system";
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

  constructor(parent: Scope | null = currentScope) {
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
 * Register a cleanup callback for the current running effect or active scope
 */
export function onCleanup(fn: CleanupFn): void {
  if (currentSubscriber && "addCleanup" in currentSubscriber) {
    (currentSubscriber as any).addCleanup(fn);
  } else if (currentScope) {
    currentScope.addCleanup(fn);
  }
}

/**
 * Create an isolated reactive root scope
 */
export function createRoot<T>(fn: (dispose: () => void) => T): T {
  const prevScope = currentScope;
  const scope = new Scope(null);
  setCurrentScope(scope);
  try {
    return fn(() => scope.dispose());
  } finally {
    setCurrentScope(prevScope);
  }
}

/**
 * Run a function with a specified scope active
 */
export function runInScope<T>(scope: Scope | null, fn: () => T): T {
  const prevScope = currentScope;
  setCurrentScope(scope);
  try {
    return fn();
  } finally {
    setCurrentScope(prevScope);
  }
}

/**
 * Get the currently active scope
 */
export function getActiveScope(): Scope | null {
  return getCurrentScope();
}
