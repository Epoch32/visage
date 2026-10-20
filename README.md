# Visage

<p align="center">
  <img width="1290" height="550" alt="Visage banner" src="https://github.com/user-attachments/assets/ebd1e69a-92ed-4536-a870-4d64a2869f14" />
</p>

<p align="center">
  <a href="https://github.com/Epoch32/visage/actions">
    <img src="https://github.com/Epoch32/visage/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://www.npmjs.com/package/@epoch32/visage">
    <img src="https://img.shields.io/npm/v/@epoch32/visage" alt="npm version" />
  </a>
  <a href="https://socket.dev/npm/package/@epoch32/visage">
    <img src="https://socket.dev/api/badge/npm/package/@epoch32/visage" alt="Socket" />
  </a>
  <a href="https://github.com/Epoch32/visage/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MPL--2.0-blue.svg" alt="MPL-2.0 License" />
  </a>
  <a href="https://github.com/Epoch32/visage/releases">
    <img src="https://img.shields.io/github/v/release/Epoch32/visage" alt="GitHub release" />
  </a>
  <a href="https://github.com/Epoch32/visage">
    <img src="https://img.shields.io/github/stars/Epoch32/visage" alt="GitHub stars" />
  </a>
</p>

Visage is a lightning-fast, zero-VDOM, fine-grained reactive UI library and full-stack application toolkit. It combines a push-pull signals architecture, direct DOM bindings, an ahead-of-time (AOT) template compiler, and integrated desktop capabilities into a cohesive, high-performance developer experience.

## What Visage Solves

Modern web development often trades performance and simplicity for component abstraction. Visage directly addresses these structural bottlenecks:

- **Eliminating Virtual DOM Overhead**: Rather than re-executing entire component functions and reconciling virtual DOM trees on every state change, Visage employs a **construct-once execution model**. Component functions run once during mounting to wire up reactive dependencies; subsequent state changes update the exact targeted DOM nodes directly.
- **Glitch-Free Reactive Precision**: State is driven by signals organized in a push-pull directed acyclic graph (DAG). Dirty notifications propagate eagerly, while computations are evaluated lazily on demand, guaranteeing zero unnecessary re-computations and eliminating synchronization glitches.
- **Compile-Time Optimization with Security Shields**: Visage's Vite compiler extracts static markup, optimizes template instantiation, and automatically sanitizes unsafe patterns (DOM clobbering, untrusted URL schemes, and unescaped HTML) while generating zero-trust Content Security Policies (CSP) directly from your templates.
- **Lightweight Native Desktop Distribution**: Visage eliminates the multi-hundred-megabyte footprint and resource consumption of traditional desktop wrappers by pairing your UI with an embedded, zero-dependency Zig native host (~16MB binary) with native OS dialogs and notifications.
- **All-in-One Full-Stack Cohesion**: From file-system MPA routing with native View Transitions to end-to-end type-safe RPC, SSR streaming, and accessible UI primitives, Visage provides a complete toolkit without requiring dozens of disparate dependencies.

## Key Features

- **Fine-Grained Reactivity**: Signals, computeds, effects, and persistent storage bindings.
- **Zero-VDOM Rendering**: Direct element and attribute mutations without virtual tree diffing.
- **AOT Template Compiler**: Compile-time JSX optimization with automated security transforms.
- **File-System MPA Router**: Instant soft navigation powered by the browser's View Transitions API.
- **Native Desktop Integration**: Lightweight Zig-powered desktop application host with GTK3 integration.
- **Type-Safe Full-Stack RPC**: End-to-end typed client/server procedures and middlewares.
- **Accessible UI & Charts**: Built-in accessible primitives, responsive chart engines, and devtools.

## Examples

### Simple App

```tsx
import { render, signal, computed, Show } from "@epoch32/visage";

function Counter() {
  const count = signal(0);
  const isEven = computed(() => count() % 2 === 0);

  return (
    <div>
      <h2>Count: {count}</h2>
      <Show when={isEven} fallback={<span>Odd</span>}>
        <span>Even</span>
      </Show>
      <button onClick={() => count.update(n => n + 1)}>
        Increment
      </button>
    </div>
  );
}

render(() => <Counter />, document.getElementById("app")!);
```

### Vite Configuration

```ts
import { defineConfig } from "vite";
import { visage } from "@epoch32/visage/vite";

export default defineConfig({
  plugins: [
    visage({
      devtools: true,
      hmr: true,
      extractCss: true,
      compiler: {
        importSource: "@epoch32/visage",
        mode: "client",
        autoImport: true,
        delegateEvents: true
      }
    })
  ]
});
```

## Contributing

See [CONTRIBUTING.md](https://github.com/Epoch32/visage/blob/main/CONTRIBUTING.md) for contribution guidelines.

## License

Visage is licensed under the [Mozilla Public License 2.0 (MPL-2.0)](LICENSE).

### Commercial & Proprietary Use

- **Closed-Source & Commercial Applications:** You can freely use Visage to build proprietary, closed-source products and commercial software ("Larger Works" under MPL-2.0). There is **no viral copyleft**—your application code, business logic, and proprietary assets remain completely private and closed source.
- **Modifications to Visage Itself:** If you modify Visage's own source files and distribute them, those direct modifications must remain open source under MPL-2.0.

In short: you can build and sell proprietary products using Visage with zero obligation to open-source your own project.
