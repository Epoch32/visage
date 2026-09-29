/**
 * Bitmask flags for reactive node state.
 * Packaged into a single 32-bit SMI integer for V8/JSC optimization.
 */

/** Node is fully up-to-date and clean */
export const CLEAN = 0;

/** Upstream dependency may be dirty; requires check before read */
export const CHECK_DIRTY = 1 << 0; // 1

/** Upstream dependency is definitely dirty; recomputation required */
export const DIRTY = 1 << 1; // 2

/** Node is actively evaluating (used for cycle detection) */
export const RUNNING = 1 << 2; // 4

/** Node has been disposed and should not propagate or subscribe */
export const DISPOSED = 1 << 3; // 8
