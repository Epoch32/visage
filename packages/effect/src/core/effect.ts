import {
  ReactiveNode,
  setActiveConsumer,
  clearDependencies,
  CLEAN,
  CHECK_DIRTY,
  DIRTY,
  RUNNING,
  DISPOSED,
} from '@epoch32/signal';
import { queueEffect } from './scheduler';

export type Teardown = () => void;
export type EffectCallback = () => Teardown | void;

export interface EffectOptions {
  name?: string;
  lazy?: boolean;
}

/**
 * Root reactive consumer executing side effects in response to signal mutations.
 */
export class SignalEffect extends ReactiveNode {
  private readonly _effectFn: EffectCallback;
  private _cleanup: Teardown | null = null;
  private _hasRun: boolean = false;
  public readonly name?: string;

  constructor(fn: EffectCallback, options?: EffectOptions) {
    super();
    this._effectFn = fn;
    this.name = options?.name;
    this.flags = DIRTY;

    // By default, effects execute immediately upon registration unless lazy is requested
    if (!options?.lazy) {
      this.execute();
    } else {
      queueEffect(this);
    }
  }

  /**
   * Executes the effect, running any prior cleanup, dynamic dependency tracking,
   * and capturing the new teardown callback.
   */
  execute(): void {
    if (this.flags & DISPOSED) {
      return;
    }

    if (this.flags & RUNNING) {
      throw new Error(`[EFFECT] Circular dependency detected during execution${this.name ? ` at '${this.name}'` : ''}`);
    }

    // If effect has already run, verify if upstream dependencies actually changed value
    if (this._hasRun) {
      if (!this.checkDependenciesChanged()) {
        this.flags = CLEAN;
        return;
      }
    }

    // 1. Run prior teardown if one exists
    if (this._cleanup) {
      try {
        this._cleanup();
      } catch (err) {
        console.error(`[EFFECT] Error executing teardown cleanup:`, err);
      }
      this._cleanup = null;
    }

    // 2. Mark running & clear old dependencies for dynamic pruning
    this.flags = RUNNING;
    clearDependencies(this);

    const prevConsumer = setActiveConsumer(this);
    let result: Teardown | void = undefined;
    let didThrow = false;
    let error: any;

    try {
      result = this._effectFn();
    } catch (err) {
      didThrow = true;
      error = err;
    } finally {
      setActiveConsumer(prevConsumer);
    }

    if (didThrow) {
      this.flags = DIRTY;
      throw error;
    }

    if (typeof result === 'function') {
      this._cleanup = result;
    }

    this.flags = CLEAN;
    this._hasRun = true;
    this.version++;
  }

  /**
   * Called when an upstream producer signals a change.
   * Schedules this effect into the microtask batch queue.
   */
  override notify(): void {
    if (!(this.flags & DISPOSED)) {
      queueEffect(this);
    }
  }

  override checkDirty(): boolean {
    return this.checkDependenciesChanged();
  }

  /**
   * Traverses upstream dependencies to verify if any have updated.
   */
  private checkDependenciesChanged(): boolean {
    let link: any = this.depsHead;
    while (link) {
      const dep = link.dep;
      if (dep) {
        dep.checkDirty();
        if (link.version !== dep.version) {
          return true;
        }
      }
      link = link.nextDep;
    }
    return false;
  }

  /**
   * Disposes the effect, executing any pending teardown and clearing all graph edges.
   */
  dispose(): void {
    if (!(this.flags & DISPOSED)) {
      if (this._cleanup) {
        try {
          this._cleanup();
        } catch (err) {
          console.error(`[EFFECT] Error executing teardown on disposal:`, err);
        }
        this._cleanup = null;
      }

      clearDependencies(this);
      this.flags = DISPOSED;
      this.subsHead = null;
      this.subsTail = null;
    }
  }
}
