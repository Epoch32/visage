/**
 * Visage Reactive Side-Effect Runner
 */
import { Computed } from "./computed";
import type { Scope } from "./scope";
import { DependencyTracker } from "./sources";
import {
  addPendingEffect,
  flushEffects,
  getBatchDepth,
  getCurrentScope,
  getCurrentSubscriber,
  removePendingEffect,
  setCurrentScope,
  setCurrentSubscriber
} from "./system";
import { type CleanupFn, type ISubscriber, SubscriberState } from "./types";

/**
 * Side-effect runner with automatic dependency tracking and disposal
 */
export class Effect extends DependencyTracker implements ISubscriber {
  private _fn: () => void | CleanupFn;
  cleanups: CleanupFn[] | null = null;
  state: SubscriberState = SubscriberState.DIRTY;
  scope: Scope | null;

  constructor(fn: () => void | CleanupFn) {
    super();
    this._fn = fn;
    this.scope = getCurrentScope();
    if (this.scope) {
      this.scope.addSubscriber(this);
    }
    this.run();
  }

  addCleanup(fn: CleanupFn): void {
    if (!this.cleanups) this.cleanups = [];
    this.cleanups.push(fn);
  }

  private runCleanups(): void {
    if (!this.cleanups) return;
    for (let i = this.cleanups.length - 1; i >= 0; i--) {
      try {
        this.cleanups[i]!();
      } catch (e) {
        console.error("Error in effect cleanup:", e);
      }
    }
    this.cleanups = null;
  }

  markDirty(targetState: SubscriberState = SubscriberState.DIRTY): void {
    if (this.state >= targetState || this.state === SubscriberState.DISPOSED) {
      return;
    }
    this.state = targetState;
    addPendingEffect(this);

    if (getBatchDepth() === 0) {
      flushEffects();
    }
  }

  run(): void {
    if (this.state === SubscriberState.DISPOSED) return;

    if (this.state === SubscriberState.CHECK_DIRTY) {
      let isDirty = false;
      if (this._sources !== null) {
        for (const source of this._sources) {
          if (source instanceof Computed) {
            source.updateIfNecessary();
          }
          const lastVersion = this._sourceVersions!.get(source);
          if (lastVersion !== undefined && lastVersion !== source.version) {
            isDirty = true;
            break;
          }
        }
      } else {
        if (this._source0 !== null) {
          if (this._source0 instanceof Computed) {
            this._source0.updateIfNecessary();
          }
          if (this._version0 !== this._source0.version) {
            isDirty = true;
          }
        }
        if (!isDirty && this._source1 !== null) {
          if (this._source1 instanceof Computed) {
            this._source1.updateIfNecessary();
          }
          if (this._version1 !== this._source1.version) {
            isDirty = true;
          }
        }
      }
      if (!isDirty) {
        this.state = SubscriberState.CLEAN;
        return;
      }
    }

    this.runCleanups();
    this.cleanupSources();

    const prevSubscriber = getCurrentSubscriber();
    setCurrentSubscriber(this);
    const prevScope = getCurrentScope();
    setCurrentScope(this.scope);

    try {
      this.state = SubscriberState.CLEAN;
      const res = this._fn();
      if (typeof res === "function") {
        if (!this.cleanups) this.cleanups = [];
        this.cleanups.push(res);
      }
    } finally {
      setCurrentSubscriber(prevSubscriber);
      setCurrentScope(prevScope);
    }
  }

  dispose(): void {
    if (this.state === SubscriberState.DISPOSED) return;
    this.state = SubscriberState.DISPOSED;
    this.runCleanups();
    this.clearSourcesOnDispose();
    removePendingEffect(this);
  }
}

/**
 * Execute side-effects reactively when dependencies change.
 *
 * Runs immediately upon creation and tracks any signals read within `fn`.
 * When dependencies change, re-execution is scheduled automatically.
 *
 * An optional cleanup function can be returned from `fn`, which runs
 * before the next re-execution and when the enclosing scope is disposed.
 *
 * @example
 * ```tsx
 * const count = signal(0);
 *
 * effect(() => {
 *   console.log("Count changed to:", count());
 *
 *   const timer = setInterval(() => console.log("tick"), 1000);
 *   return () => clearInterval(timer);
 * });
 * ```
 *
 * @param fn - The side-effect function, optionally returning a cleanup function
 * @returns A manual disposal cleanup function
 */
export function effect(fn: () => void | CleanupFn): CleanupFn {
  const eff = new Effect(fn);
  return () => eff.dispose();
}

/**
 * Solid / React-compatible alias for `effect()`.
 *
 * @example
 * ```tsx
 * createEffect(() => {
 *   document.title = `Total: ${count()}`;
 * });
 * ```
 */
export const createEffect = effect;
