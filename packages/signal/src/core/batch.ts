import { getActiveConsumer, setActiveConsumer, type ReactiveNode } from './node';

/** Depth of nested batch transactions */
let batchDepth = 0;

/** Queue of subscribers to notify when the root batch completes */
const pendingNotifications: Set<() => void> = new Set();

/**
 * Returns true if an atomic batch transaction is currently open.
 */
export function isBatching(): boolean {
  return batchDepth > 0;
}

/**
 * Enqueues a notification callback to run when the active batch closes,
 * or runs it immediately if no batch is active.
 */
export function enqueueNotification(notify: () => void): void {
  if (batchDepth > 0) {
    pendingNotifications.add(notify);
  } else {
    notify();
  }
}

/**
 * Executes a function within an atomic transaction.
 * All signal updates during the callback will defer downstream notifications
 * until the batch completely finishes.
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0 && pendingNotifications.size > 0) {
      flushBatch();
    }
  }
}

function flushBatch(): void {
  const pending = Array.from(pendingNotifications);
  pendingNotifications.clear();
  for (let i = 0; i < pending.length; i++) {
    pending[i]();
  }
}

/**
 * Executes a callback without tracking dependencies, even if called inside
 * an active reactive computation.
 */
export function untrack<T>(fn: () => T): T {
  const prev = setActiveConsumer(null);
  try {
    return fn();
  } finally {
    setActiveConsumer(prev);
  }
}
