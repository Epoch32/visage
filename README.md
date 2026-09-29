# Visage

> **Track 2: Post-Virtual-DOM Reactive Engine & UI Platform**  
> 32-Week Sequence of Zero-Allocation Reactive Signals & Direct DOM Compilation.

Visage is the complete post-Virtual-DOM reactive engine powering Track 2 of [Epoch32](https://github.com/Epoch32). Designed for extreme edge and browser performance, it eliminates runtime virtual DOM reconciler overhead, achieves 0.00 ms hydration lag, and compiles direct 1-to-1 reactive bindings to native DOM nodes.

---

## Architecture & Substrates

All 32 sequential components of Visage live within this monorepo as modular, zero-dependency packages:

| Week | Package | Category | Milestone | Description |
| :--- | :--- | :--- | :--- | :--- |
| **01** | [`@epoch32/signal`](./packages/signal) | Primitive | M1: Reactive Substrate | Zero-allocation reactive cell with recycled doubly-linked graph nodes |
| **02** | [`@epoch32/compute`](./packages/compute) | Primitive | M1: Reactive Substrate | Lazy memoized derivations with glitch-free topological evaluation |
| **03** | `@epoch32/effect` | Infrastructure | M1: Reactive Substrate | Microtask batch queue via `queueMicrotask()` and automatic lifecycle teardowns |
| **04** | `@epoch32/store` | Infrastructure | M1: Reactive Substrate | Deeply reactive proxy & TypedArray state container |
| **05-08**| Native Template Compilation | Template Substrate | M2 | Tagged template fragment cache, 1-to-1 node pointers, and LIS keyed diffing |
| **09-12**| Component Substrates | Components | M3 | Custom elements, Declarative Shadow DOM, slot projection, WeakRef lifecycles |
| **13-16**| Hardware Acceleration | Hardware | M4 | Constructable Stylesheets, WAAPI spring engine, Canvas2D blitting, WebGPU |
| **17-20**| Forms & Ergonomics | Forms / A11y | M5 | Two-way input binding, synchronous schema signals, automated ARIA |
| **21-24**| Navigation & Telemetry | Navigation | M6 | Client router, View Transitions API coordinator, IndexedDB sync, profiler HUD |
| **25-28**| Edge Streaming | Edge / Concurrency | M7 | HTML streaming renderer, 0.00 ms resumable signals, SharedArrayBuffer UI |
| **29-32**| Convergence & Ejection | Platform | M8 | DevTools visualizer, benchmark arena, React island bridge, and Visage ejection |

---

## Development

```bash
# Install all workspace dependencies
bun install

# Run all test suites across all packages atomically
bun test

# Build all packages
bun run build

# Typecheck all packages
bun run typecheck
```

## License
MPL-2.0
