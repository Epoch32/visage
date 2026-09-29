# `@epoch32/signal` Specification

> **Epoch32 Track 2, Week 01**: Zero-Allocation Reactive Cell Substrate

---

## 1. Overview

`@epoch32/signal` provides the primary atomic reactive primitive for the Epoch32 post-Virtual-DOM reactive engine. It implements high-throughput state storage with fine-grained dependency tracking and transactional batching.

---

## 2. Normative Interface

### 2.1 Factory: `signal<T>(initialValue: T, options?: StateOptions<T>): Signal<T>`

Creates a callable reactive cell holding value of type `T`.

- **`options.equals`**: Custom equality function `(prev: T, next: T) => boolean`. Defaults to `Object.is`. If `false`, every write triggers updates.
- **Callable Return**: Calling `s()` invokes `s.get()`.

### 2.2 Methods on `Signal<T>`

- **`get(): T`**: Returns current value and registers dependency on current reactive consumer if present.
- **`set(value: T): void`**: Compares `next` with `current` using equality predicate. If different, sets value, increments monotonic version, and notifies subscribers.
- **`update(fn: (prev: T) => T): void`**: Atomically updates value using transform function.
- **`peek(): T`**: Returns value without registering dependency.
- **`version: number`**: Monotonic 32-bit counter representing write epochs.

### 2.3 Transactional Functions

- **`batch<T>(fn: () => T): T`**: Executes `fn`, queueing subscriber notifications until the outermost batch exits.
- **`untrack<T>(fn: () => T): T`**: Executes `fn` with `activeConsumer` suppressed.
- **`isSignal(val: unknown): boolean`**: Type guard returning `true` for Epoch32 signals.

### 2.4 TC39 Signals Compliance

Exported namespace `Signal` matches TC39 Stage 1/2 structure:
- `Signal.State`: Underlying state cell class.
- `Signal.subtle.untrack`: Untracked execution hook.

---

## 3. Conformance Invariants

1. **Zero Dependencies**: Zero runtime dependencies in `dependencies`.
2. **Deterministic Versioning**: `s.version` increments if and only if `equals(prev, next) === false`.
3. **Glitch-Freedom**: Intermediate invalid values in diamond topologies are never observed by downstream consumers.
