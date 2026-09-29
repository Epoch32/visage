# @epoch32/compute

> Lazy memoized derivations with dynamic dependency-ring cleanup and glitch-free topological graph evaluation.
> **Track 2 (Post-Virtual-DOM Reactive Engine), Week 02.**

## Features
- **Zero-Glitch Topological Evaluation**: Diamond graphs ($A \to B, A \to C, B+C \to D$) evaluate consistently with zero intermediate tearing.
- **Push-Pull Reactive Pipeline**: Push phase cascades dirty bitmasks; pull phase lazily evaluates on demand.
- **Dynamic Dependency Ring Pruning**: Inactive branches in conditional expressions are immediately unlinked to eliminate memory leaks.
- **Cycle Detection**: Circular dependencies throw descriptive errors synchronously.
- **TC39 Signals Compatible**: Direct compatibility with `Signal.Computed` and `@epoch32/signal`.
- **Zero Runtime Dependencies**: Depends strictly on sibling primitive `@epoch32/signal`.

## Installation

```bash
bun add @epoch32/compute
```

## Quick Start

```ts
import { signal } from '@epoch32/signal';
import { computed } from '@epoch32/compute';

const count = signal(1);
const double = computed(() => count() * 2);

console.log(double()); // 2 (lazily evaluated)
count.set(5);
console.log(double()); // 10
```

## License
MPL-2.0
