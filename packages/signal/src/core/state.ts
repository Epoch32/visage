import {
  ReactiveNode,
  getActiveConsumer,
  trackDependency,
  propagateChange,
  incrementClock,
} from './node';
import { enqueueNotification } from './batch';

export interface StateOptions<T> {
  equals?: ((prev: T, next: T) => boolean) | false;
}

const defaultEquals = (a: any, b: any) => Object.is(a, b);

/**
 * Atomic reactive state cell.
 */
export class SignalState<T> extends ReactiveNode {
  private _value: T;
  private readonly _equals: (prev: T, next: T) => boolean;

  constructor(initialValue: T, options?: StateOptions<T>) {
    super();
    this._value = initialValue;
    this.version = incrementClock();
    if (options?.equals === false) {
      this._equals = () => false;
    } else {
      this._equals = options?.equals ?? defaultEquals;
    }
  }

  /**
   * Reads the current value. If called within an active reactive consumer,
   * registers a dependency edge in the graph.
   */
  get(): T {
    const consumer = getActiveConsumer();
    if (consumer) {
      trackDependency(this, consumer);
    }
    return this._value;
  }

  /**
   * Reads the value without registering a dependency link.
   */
  peek(): T {
    return this._value;
  }

  /**
   * Updates the value. If changed, bumps version and broadcasts notifications.
   */
  set(nextValue: T): void {
    if (this._equals(this._value, nextValue)) {
      return;
    }

    this._value = nextValue;
    this.version = incrementClock();

    enqueueNotification(() => {
      propagateChange(this);
    });
  }

  /**
   * Functional updater helper: `s.update(n => n + 1)`.
   */
  update(fn: (prev: T) => T): void {
    this.set(fn(this._value));
  }

  override checkDirty(): boolean {
    return false; // State nodes are primary producers
  }

  override notify(): void {
    // State nodes have no upstream dependencies
  }
}
