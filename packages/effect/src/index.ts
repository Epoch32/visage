import { SignalEffect, type EffectCallback, type EffectOptions, type Teardown } from './core/effect';
import { flushSync, hasPendingEffects } from './core/scheduler';

export type { EffectCallback, EffectOptions, Teardown };
export { SignalEffect, flushSync, hasPendingEffects };

const EFFECT_BRAND = Symbol.for('@epoch32/effect');

export interface EffectHandle {
  (): void; // invoking handle directly disposes the effect
  dispose(): void;
  readonly node: SignalEffect;
  readonly [EFFECT_BRAND]: true;
}

/**
 * Registers a side effect that automatically tracks signals read during execution
 * and re-runs on a coalesced microtask schedule when any dependency changes.
 *
 * If the effect callback returns a cleanup function, it will automatically execute
 * before the next re-run and upon disposal.
 *
 * @param fn Effect callback function, optionally returning a teardown cleanup
 * @param options Optional configuration (debug name, lazy start)
 * @returns A disposer handle to stop tracking and clean up
 *
 * @example
 * ```ts
 * const count = signal(0);
 *
 * const stop = effect(() => {
 *   console.log('Count is:', count());
 *   return () => console.log('Cleaning up prior run...');
 * });
 *
 * count.set(1);
 * count.set(2);
 * // Scheduled: runs once in the microtask queue with Count = 2
 *
 * stop(); // Halts tracking and executes final cleanup
 * ```
 */
export function effect(fn: EffectCallback, options?: EffectOptions): EffectHandle {
  const node = new SignalEffect(fn, options);

  const handle: any = function () {
    node.dispose();
  };

  handle.dispose = () => node.dispose();

  Object.defineProperty(handle, 'node', {
    value: node,
    writable: false,
    enumerable: false,
  });

  Object.defineProperty(handle, EFFECT_BRAND, {
    value: true,
    writable: false,
    enumerable: false,
  });

  return handle as EffectHandle;
}

/**
 * Type guard verifying if an entity is an Epoch32 Effect handle.
 */
export function isEffect(value: unknown): value is EffectHandle {
  return typeof value === 'function' && (value as any)[EFFECT_BRAND] === true;
}

/**
 * TC39 Standard namespace representation.
 */
export const Signal = {
  Effect: SignalEffect,
};

export default effect;
