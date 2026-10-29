/**
 * Visage Reactivity System Execution Context & Scheduler
 */
import { type ISubscriber, SubscriberState } from "./types";

interface ReactivityContext {
  currentSubscriber: ISubscriber | null;
  currentScope: any;
  batchDepth: number;
  pendingEffects: Set<any>;
  warnedCyclicSubscribers: WeakSet<ISubscriber>;
  isFlushing: boolean;
}

const REACTIVITY_KEY = Symbol.for("visage.reactivity.context");
const g = globalThis as unknown as { [REACTIVITY_KEY]?: ReactivityContext };
if (!g[REACTIVITY_KEY]) {
  g[REACTIVITY_KEY] = {
    currentSubscriber: null,
    currentScope: null,
    batchDepth: 0,
    pendingEffects: new Set(),
    warnedCyclicSubscribers: new WeakSet(),
    isFlushing: false
  };
}
const ctx = g[REACTIVITY_KEY]!;

export const warnedCyclicSubscribers: WeakSet<ISubscriber> = ctx.warnedCyclicSubscribers;

export function setCurrentSubscriber(sub: ISubscriber | null): void {
  ctx.currentSubscriber = sub;
}

export function getCurrentSubscriber(): ISubscriber | null {
  return ctx.currentSubscriber;
}

export function setCurrentScope(scope: any): void {
  ctx.currentScope = scope;
}

export function getCurrentScope(): any {
  return ctx.currentScope;
}

export function addPendingEffect(eff: any): void {
  ctx.pendingEffects.add(eff);
}

export function removePendingEffect(eff: any): void {
  ctx.pendingEffects.delete(eff);
}

export function getBatchDepth(): number {
  return ctx.batchDepth;
}

const MAX_FLUSH_COUNT = 100;

const effectsToRun: any[] = [];

export function flushEffects(): void {
  if (ctx.isFlushing || ctx.batchDepth > 0) return;
  ctx.isFlushing = true;
  let iterations = 0;
  try {
    while (ctx.pendingEffects.size > 0) {
      if (++iterations > MAX_FLUSH_COUNT) {
        ctx.pendingEffects.clear();
        effectsToRun.length = 0;
        throw new Error(
          `[Visage Reactivity] Maximum update depth exceeded (${MAX_FLUSH_COUNT} cycles). ` +
            `An effect continuously triggered state mutations (infinite loop detected). ` +
            `Ensure effects that modify signals do not unconditionally depend on them, or use untrack() to read state.`
        );
      }
      for (const eff of ctx.pendingEffects) {
        effectsToRun.push(eff);
      }
      ctx.pendingEffects.clear();

      for (let i = 0; i < effectsToRun.length; i++) {
        const eff = effectsToRun[i];
        if (eff.state === SubscriberState.DIRTY || eff.state === SubscriberState.CHECK_DIRTY) {
          eff.run();
        }
      }
      effectsToRun.length = 0;
    }
  } finally {
    ctx.isFlushing = false;
    effectsToRun.length = 0;
  }
}

/**
 * Batch multiple signal mutations so downstreams and effects update synchronously once at completion.
 *
 * Prevents intermediate flicker, wasted recomputations, and glitch states.
 *
 * @example
 * ```tsx
 * const firstName = signal("Jane");
 * const lastName = signal("Doe");
 *
 * batch(() => {
 *   firstName.set("John");
 *   lastName.set("Smith");
 *   // Downstream computed and effects run only ONCE here
 * });
 * ```
 *
 * @param fn - A function performing multiple signal updates
 * @returns The return value of `fn`
 */
export function batch<T>(fn: () => T): T {
  ctx.batchDepth++;
  try {
    return fn();
  } finally {
    ctx.batchDepth--;
    if (ctx.batchDepth === 0) {
      flushEffects();
    }
  }
}

/**
 * Read reactive state without subscribing the current active effect or computed computation.
 *
 * @example
 * ```tsx
 * effect(() => {
 *   const id = currentId(); // Subscribed: effect re-runs when currentId changes
 *
 *   // Not subscribed: effect does NOT re-run when analyticsCounter changes
 *   const count = untrack(() => analyticsCounter());
 *   sendMetric(id, count);
 * });
 * ```
 *
 * @param fn - A function reading reactive signals without tracking
 * @returns The return value of `fn`
 */
export function untrack<T>(fn: () => T): T {
  const prev = ctx.currentSubscriber;
  setCurrentSubscriber(null);
  try {
    return fn();
  } finally {
    setCurrentSubscriber(prev);
  }
}
