/**
 * Visage Reactivity System Execution Context & Scheduler
 */
import { type ISubscriber, SubscriberState } from "./types";

export let currentSubscriber: ISubscriber | null = null;
export let currentScope: any = null;
export let batchDepth = 0;
export const pendingEffects: Set<any> = new Set();
export const warnedCyclicSubscribers: WeakSet<ISubscriber> = new WeakSet();
export let isFlushing = false;

export function setCurrentSubscriber(sub: ISubscriber | null): void {
  currentSubscriber = sub;
}

export function getCurrentSubscriber(): ISubscriber | null {
  return currentSubscriber;
}

export function setCurrentScope(scope: any): void {
  currentScope = scope;
}

export function getCurrentScope(): any {
  return currentScope;
}

export function addPendingEffect(eff: any): void {
  pendingEffects.add(eff);
}

export function removePendingEffect(eff: any): void {
  pendingEffects.delete(eff);
}

const MAX_FLUSH_COUNT = 100;

export function flushEffects(): void {
  if (isFlushing || batchDepth > 0) return;
  isFlushing = true;
  let iterations = 0;
  try {
    while (pendingEffects.size > 0) {
      if (++iterations > MAX_FLUSH_COUNT) {
        pendingEffects.clear();
        throw new Error(
          `[Visage Reactivity] Maximum update depth exceeded (${MAX_FLUSH_COUNT} cycles). ` +
            `An effect continuously triggered state mutations (infinite loop detected). ` +
            `Ensure effects that modify signals do not unconditionally depend on them, or use untrack() to read state.`
        );
      }
      const effectsToRun = Array.from(pendingEffects);
      pendingEffects.clear();

      for (const eff of effectsToRun) {
        if (eff.state === SubscriberState.DIRTY || eff.state === SubscriberState.CHECK_DIRTY) {
          eff.run();
        }
      }
    }
  } finally {
    isFlushing = false;
  }
}

/**
 * Batch multiple signal mutations so downstreams update synchronously once at completion
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushEffects();
    }
  }
}

/**
 * Read reactive state without subscribing current effect or computed
 */
export function untrack<T>(fn: () => T): T {
  const prev = currentSubscriber;
  currentSubscriber = null;
  try {
    return fn();
  } finally {
    currentSubscriber = prev;
  }
}
