# ⚡ Visage

> **Lightning-fast, zero-VDOM, fine-grained reactive full-stack UI framework.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](tsconfig.json)
[![Tests: Passing](https://img.shields.io/badge/Tests-115%20Passed-brightgreen.svg)](tests/)
[![Biome: Checked](https://img.shields.io/badge/Linter-Biome-green.svg)](biome.json)

Visage is a full-stack TypeScript UI library with zero Virtual DOM overhead. Components execute **once** as constructors, binding push-pull reactive signals directly to DOM nodes and attributes.

---

## ✨ Features at a Glance

- **Zero Virtual DOM**: No tree-diffing, no synthetic event wrappers. Signals update targeted DOM nodes directly in-place.
- **Push-Pull Reactivity (`visage/signals`)**: Glitch-free, TC39-aligned reactive core (`signal`, `computed`, `effect`, `batch`, `createStore`, `createContext`, `createRoot`).
- **File-Based API Routes (`visage/api`)**: REST file-router with **Directive Pragmas** (`// @visage-middleware cascade: true`), procedure builders (`query`, `mutation`, `subscription`), and typed client SDK (`createApiClient`).
- **Type-Safe RPC (`visage/rpc`)**: Remote procedure call router (`createRouter`) and client proxy (`createClient`) with request batching and real-time Server-Sent Events (SSE).
- **Server State & Query Cache (`visage/query`)**: Reactive async state caching (`createQuery`, `createMutation`, `createInfiniteQuery`, `QueryClient`).
- **Scoped CSS Engine (`visage/style`)**: Zero-runtime CSS scoping (`createStyle`, `css`, `<Style>`) and critical CSS extraction for SSR.
- **Visual In-Browser DevTools (`visage/devtools`)**: Live reactive DAG dependency inspector and RPC logger (`<VisageDevTools />`).
- **Accessible UI Primitives (`visage/ui`)**: Headless and styled components (`Dialog`, `Tabs`, `Command`, `DataTable`, `DropdownMenu`, `Switch`, `Toast`, `createIcon`).
- **High-Performance Virtualization (`visage/virtual`)**: Windowing engine for 1,000,000+ items at 120 FPS (`<VirtualList>`, `<VirtualGrid>`).
- **Reactive Forms (`visage/form`)**: Built-in validator `v`, two-way bindings (`form.bind()`), and full **Standard Schema v1** compatibility.
- **SSR & Streaming (`visage/server`)**: Synchronous string serialization (`renderToString`), Web Streams progressive rendering (`renderToStream`), and hydration (`hydrate`).
- **Vite Integration (`visage/vite`)**: First-class Vite build plugin (`visage()`, `visageLucide()`).

---

## 🚀 Quick Example

```tsx
import { signal, computed, Show } from "visage";

function Counter() {
  const count = signal(0);
  const isEven = computed(() => count() % 2 === 0);

  return (
    <div class="counter-card">
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
```

---

## 📦 Package Submodules

| Path | Purpose |
| :--- | :--- |
| `visage` | Root exports: signals, JSX runtime, DOM control flow, UI components |
| `visage/signals` | Core reactive primitives (`signal`, `computed`, `effect`, `batch`, `createStore`, `createContext`, `createRoot`) |
| `visage/dom` | In-place DOM mutations, `<Show>`, `<For>`, `<Portal>`, `<Suspense>`, `<ErrorBoundary>`, `lazy` |
| `visage/api` | File-based REST routing, directive pragmas, procedure builders, `createApiClient` |
| `visage/rpc` | Programmatic RPC procedure trees, `createRouter`, `createClient`, batching, SSE |
| `visage/query` | Async server-state query cache (`createQuery`, `createMutation`, `QueryClient`) |
| `visage/style` | Scoped CSS engine (`createStyle`, `css`, `<Style>`, SSR extraction) |
| `visage/devtools`| In-browser visual inspector and reactive DAG viewer (`<VisageDevTools />`) |
| `visage/ui` | Headless and styled accessible UI primitives (`Dialog`, `Tabs`, `Command`, `DataTable`, etc.) |
| `visage/virtual` | Zero-VDOM virtualization (`<VirtualList>`, `<VirtualGrid>`) |
| `visage/form` | Form state machine, bindings, validator `v`, Standard Schema v1 |
| `visage/server` | SSR HTML rendering (`renderToString`, `renderToStream`) and `hydrate` |
| `visage/router` | Client-side SPA routing (`<Router>`, `<Route>`, `<Link>`, `useParams`, `useNavigate`) |
| `visage/vite` | Vite build plugin pipeline, HMR transform, Lucide icon optimizer |

---

## 📚 Documentation & Guides

For full documentation, tutorials, component galleries, and architecture deep-dives, see **[`visage-docs`](../visage-docs)**.

---

## 🛠️ Development

```bash
# Run unit and integration tests (115 passing tests across 15 suites)
bun test

# Strict TypeScript typechecking
bun run typecheck

# Biome code formatting & linting
bun run check
```

---

## 📄 License

MIT © 2026 Visage Contributors.
