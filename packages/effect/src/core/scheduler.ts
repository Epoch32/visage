import type { SignalEffect } from './effect';

/**
 * Deduplicated microtask batch queue for reactive effects.
 */
const QUEUED_EFFECTS = new Set<SignalEffect>();
let isMicrotaskScheduled = false;
let isFlushing = false;
const MAX_FLUSH_CYCLES = 100;

/**
 * Enqueues an effect to run on the next microtask tick.
 */
export function queueEffect(effect: SignalEffect): void {
  QUEUED_EFFECTS.add(effect);

  if (!isMicrotaskScheduled && !isFlushing) {
    isMicrotaskScheduled = true;
    queueMicrotask(flushEffects);
  }
}

/**
 * Flushes all queued effects.
 * Supports cycle detection to guard against infinite render loops.
 */
export function flushEffects(): void {
  if (isFlushing) return;
  isFlushing = true;
  isMicrotaskScheduled = false;

  let cycles = 0;

  try {
    while (QUEUED_EFFECTS.size > 0) {
      if (++cycles > MAX_FLUSH_CYCLES) {
        QUEUED_EFFECTS.clear();
        throw new Error(
          `[EFFECT] Maximum cascading update depth (${MAX_FLUSH_CYCLES}) exceeded. Possible infinite reactive loop.`
        );
      }

      // Snapshot current effects to allow new effects to queue during execution
      const currentBatch = Array.from(QUEUED_EFFECTS);
      QUEUED_EFFECTS.clear();

      for (let i = 0; i < currentBatch.length; i++) {
        const effect = currentBatch[i];
        effect.execute();
      }
    }
  } finally {
    isFlushing = false;
  }
}

/**
 * Synchronous escape hatch: immediately drains and executes all pending microtask effects.
 */
export function flushSync(): void {
  flushEffects();
}

/**
 * Checks if there are currently queued effects pending execution.
 */
export function hasPendingEffects(): boolean {
  return QUEUED_EFFECTS.size > 0;
}
