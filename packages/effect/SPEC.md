# @epoch32/effect — Specification

## 1. Overview
`@epoch32/effect` provides automatic lifecycle teardowns and a microtask batch queue via `queueMicrotask()` to prevent layout thrashing and cascading renders for Visage (Track 2, Week 03).

## 2. Architecture & Execution Model

### 2.1 Microtask Queueing & Batch Coalescing
Effects are consumers in the Visage reactive graph ($G = (V, E)$). Unlike computed derivations (`SignalComputed`) which evaluate lazily on pull, effects evaluate side-effects upon change notifications.
To avoid layout thrashing and intermediate visual tearing:
1. **Initial Evaluation**: An effect executes synchronously upon registration ($t_0$), executing its body and registering its dependency links.
2. **Notification & Scheduling**: When an upstream producer signals a change via `notify()`, the effect is pushed into a pending microtask queue `SCHEDULED_EFFECTS` and a single microtask flush is scheduled via `queueMicrotask()` if not already pending.
3. **Coalescing**: Multiple synchronous state mutations within the same tick add the effect to the batch queue at most once.
4. **Execution Drain**: During the microtask execution, the queue is drained in FIFO order. For each queued effect:
   - The effect verifies upstream changes via `checkDirty()`. If upstream computed nodes did not change their derived values, execution is skipped.
   - Prior teardowns (`Teardown`) are executed.
   - The effect re-executes, dynamically pruning unread dependency branches.

### 2.2 Lifecycle & Automatic Teardowns
- **Teardown Callback**: If an effect function returns a function `() => void`, that closure is stored as the active teardown.
- **Teardown Timing**:
  1. Immediately prior to re-execution when dependencies change.
  2. Synchronously when `effect.dispose()` is invoked.
- **Disposal**: Unlinks all dependency edges, clears teardown closures, and prevents further queueing.

### 2.3 Synchronous Flushing & Cycle Protection
- **`flushSync()`**: Synchronously and immediately drains all pending scheduled effects.
- **Loop / Cycle Protection**: Infinite recursive updates (an effect mutating its own dependency during execution) are tracked per flush cycle. If an iteration limit (e.g., 100 iterations) is exceeded, an error is thrown synchronously to prevent catastrophic UI thread lockups.

## 3. Invariants
- **Coalesced Updates**: $N$ synchronous writes to tracked producers within an event loop turn result in exactly $1$ scheduled effect invocation.
- **Dynamic Dependency Pruning**: Inactive branches in conditional statements are unlinked during each execution, preventing stale triggers and memory leaks.
- **Leak-Free Disposal**: Calling `dispose()` guarantees zero retained references in upstream producer subscriber lists.
- **Topological Integrity**: Upstream memoization is respected; effects will not re-run if upstream computed values remain identical.
