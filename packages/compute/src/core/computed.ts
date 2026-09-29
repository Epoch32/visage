import {
  ReactiveNode,
  getActiveConsumer,
  setActiveConsumer,
  trackDependency,
  propagateChange,
  clearDependencies,
  CLEAN,
  CHECK_DIRTY,
  DIRTY,
  RUNNING,
  DISPOSED,
} from '@epoch32/signal';

export interface ComputedOptions<T> {
  equals?: ((prev: T, next: T) => boolean) | false;
  name?: string;
}

const defaultEquals = (a: any, b: any) => Object.is(a, b);

/**
 * Lazy, memoized derivation node in the reactive DAG.
 */
export class SignalComputed<T> extends ReactiveNode {
  private _value!: T;
  private _hasValue: boolean = false;
  private readonly _computeFn: () => T;
  private readonly _equals: (prev: T, next: T) => boolean;
  public readonly name?: string;

  constructor(computeFn: () => T, options?: ComputedOptions<T>) {
    super();
    this._computeFn = computeFn;
    this.name = options?.name;
    this.flags = DIRTY;

    if (options?.equals === false) {
      this._equals = () => false;
    } else {
      this._equals = options?.equals ?? defaultEquals;
    }
  }

  /**
   * Reads the current computed value.
   * If evaluated within an active consumer, registers dependency edge.
   * If stale or dirty, lazily evaluates.
   */
  get(): T {
    if (this.flags & DISPOSED) {
      return this._value;
    }

    this.updateIfNecessary();

    const consumer = getActiveConsumer();
    if (consumer) {
      trackDependency(this, consumer);
    }

    return this._value;
  }

  /**
   * Reads value without subscribing active consumer.
   */
  peek(): T {
    this.updateIfNecessary();
    return this._value;
  }

  /**
   * Checks if this node or any of its upstream dependencies are dirty.
   * Returns true if this node's value actually changed.
   */
  override checkDirty(): boolean {
    if (!this._hasValue || !this.depsHead) {
      return this.recompute();
    }

    if (this.flags & (DIRTY | CHECK_DIRTY)) {
      let hasChanged = false;
      let link: any = this.depsHead;
      while (link) {
        const dep = link.dep;
        if (dep) {
          dep.checkDirty();
          if (link.version !== dep.version) {
            hasChanged = true;
            break;
          }
        }
        link = link.nextDep;
      }

      if (hasChanged) {
        return this.recompute();
      }

      this.flags = CLEAN;
      return false;
    }

    return false;
  }

  /**
   * Called when an upstream dependency changes.
   * Propagates change down the DAG to downstream subscribers.
   */
  override notify(): void {
    propagateChange(this);
  }

  /**
   * Disposes this computed node, clearing all dependency links and stopping propagation.
   */
  dispose(): void {
    if (!(this.flags & DISPOSED)) {
      clearDependencies(this);
      this.flags = DISPOSED;
      this.subsHead = null;
      this.subsTail = null;
    }
  }

  private updateIfNecessary(): void {
    if (this.flags & RUNNING) {
      throw new Error(`[COMPUTE] Circular dependency detected in reactive graph${this.name ? ` at '${this.name}'` : ''}`);
    }

    if (this.flags & (DIRTY | CHECK_DIRTY)) {
      if (!this._hasValue) {
        this.recompute();
      } else {
        this.checkDirty();
      }
    }
  }

  /**
   * Evaluates the computation function, dynamically tracking dependencies and updating value.
   * Returns true if value changed, false if value was memoized and identical.
   */
  private recompute(): boolean {
    const prevFlags = this.flags;
    this.flags = RUNNING;

    // Clear stale dependencies to enable dynamic dependency branch pruning
    clearDependencies(this);

    const prevConsumer = setActiveConsumer(this);
    let newValue: T;
    let didThrow = false;
    let error: any;

    try {
      newValue = this._computeFn();
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

    this.flags = CLEAN;

    // Check if value actually changed according to comparator
    if (this._hasValue && this._equals(this._value, newValue!)) {
      // Memoized! Value is unchanged, do not bump version or propagate
      return false;
    }

    this._value = newValue!;
    this._hasValue = true;
    this.version++;

    // Propagate change to downstream subscribers
    propagateChange(this);
    return true;
  }
}
