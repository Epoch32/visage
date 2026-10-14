/**
 * Visage Reactive Side-Effect Runner
 */
import { Computed } from "./computed";
import type { Scope } from "./scope";
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
import { type CleanupFn, type IDependency, type ISubscriber, SubscriberState } from "./types";

/**
 * Side-effect runner with automatic dependency tracking and disposal
 */
export class Effect implements ISubscriber {
  private _fn: () => void | CleanupFn;
  private _source0: IDependency | null = null;
  private _version0 = 0;
  private _source1: IDependency | null = null;
  private _version1 = 0;
  private _sources: Set<IDependency> | null = null;
  private _sourceVersions: Map<IDependency, number> | null = null;
  cleanups: CleanupFn[] | null = null;
  state: SubscriberState = SubscriberState.DIRTY;
  scope: Scope | null;

  get sources(): Set<IDependency> {
    if (this._sources !== null) return this._sources;
    const s = new Set<IDependency>();
    if (this._source0 !== null) s.add(this._source0);
    if (this._source1 !== null) s.add(this._source1);
    return s;
  }

  get sourceVersions(): Map<IDependency, number> {
    if (this._sourceVersions !== null) return this._sourceVersions;
    const m = new Map<IDependency, number>();
    if (this._source0 !== null) m.set(this._source0, this._version0);
    if (this._source1 !== null) m.set(this._source1, this._version1);
    return m;
  }

  constructor(fn: () => void | CleanupFn) {
    this._fn = fn;
    this.scope = getCurrentScope();
    if (this.scope) {
      this.scope.addSubscriber(this);
    }
    this.run();
  }

  addSource(source: IDependency, version: number): void {
    if (this._sources !== null) {
      this._sources.add(source);
      this._sourceVersions!.set(source, version);
      return;
    }
    if (this._source0 === null) {
      this._source0 = source;
      this._version0 = version;
      return;
    }
    if (this._source0 === source) {
      this._version0 = version;
      return;
    }
    if (this._source1 === null) {
      this._source1 = source;
      this._version1 = version;
      return;
    }
    if (this._source1 === source) {
      this._version1 = version;
      return;
    }

    const s = new Set<IDependency>();
    const m = new Map<IDependency, number>();
    s.add(this._source0);
    m.set(this._source0, this._version0);
    s.add(this._source1);
    m.set(this._source1, this._version1);
    s.add(source);
    m.set(source, version);
    this._sources = s;
    this._sourceVersions = m;
    this._source0 = null;
    this._source1 = null;
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

  private cleanupSources(): void {
    if (this._sources !== null) {
      for (const source of this._sources) {
        source.removeSubscriber(this);
      }
      this._sources = null;
      this._sourceVersions = null;
      return;
    }
    if (this._source0 !== null) {
      this._source0.removeSubscriber(this);
      this._source0 = null;
    }
    if (this._source1 !== null) {
      this._source1.removeSubscriber(this);
      this._source1 = null;
    }
  }

  dispose(): void {
    if (this.state === SubscriberState.DISPOSED) return;
    this.state = SubscriberState.DISPOSED;
    this.runCleanups();
    this.cleanupSources();
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
