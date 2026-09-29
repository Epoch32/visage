# @epoch32/effect

> Automatic lifecycle teardowns and microtask batch queue via `queueMicrotask()` preventing layout thrashing and cascade renders.  
> **Track 2 (Post-Virtual-DOM Reactive Engine), Week 03.**

## Features
- **Microtask Batch Scheduling**: Synchronous mutations are coalesced into a single microtask execution tick to prevent layout thrashing and UI tearing.
- **Automatic Lifecycle Teardowns**: Return a cleanup callback from any effect to run prior to re-execution or upon disposal.
- **Dynamic Dependency Pruning**: Inactive branches in conditional code are pruned on each execution, preventing memory leaks and stale notifications.
- **Synchronous Flushing**: Force all pending scheduled effects to execute immediately via `flushSync()`.
- **Infinite Loop / Cycle Protection**: Traps recursive state mutations within effects to protect the UI thread from freezing.
- **Zero Runtime Dependencies**: Works seamlessly with `@epoch32/signal` and `@epoch32/compute`.

## Installation

```bash
bun add @epoch32/effect
```

## Quick Start

```ts
import { signal } from '@epoch32/signal';
import { effect, flushSync } from '@epoch32/effect';

const count = signal(0);

// Runs synchronously on mount, then schedules on change
const stop = effect(() => {
  console.log('Count is:', count());

  return () => {
    console.log('Cleanup before next run or disposal');
  };
});

// Mutate count multiple times synchronously
count.set(1);
count.set(2);
count.set(3);

// Flushes scheduled microtasks synchronously or wait for next tick
flushSync();
// Console output:
// 'Cleanup before next run or disposal'
// 'Count is: 3'

// Unlink and dispose
stop();
```

## License
MPL-2.0
