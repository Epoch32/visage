# Visage

Visage is a high-performance TypeScript UI framework built on fine-grained push-pull reactivity and direct DOM manipulation. It eliminates the Virtual DOM entirely: component functions execute exactly once as constructors to build a directed acyclic reactive graph, and subsequent state mutations update individual DOM text nodes and attributes in place with microsecond latency.

## Documentation & Resources

- **Official Documentation**: [https://visage.epoch32.org](https://visage.epoch32.org)
- **Contributing Guidelines**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **License**: [Mozilla Public License 2.0 (MPL-2.0)](LICENSE)

## Installation

```bash
# Using bun
bun add @epoch32/visage

# Using npm
npm install @epoch32/visage

# Using pnpm
pnpm add @epoch32/visage
```

## Architecture

Traditional Virtual DOM frameworks re-execute component functions on every state change, generating ephemeral trees of objects that must be reconciled against the previous render. 

Visage takes an architectural approach aligned with fine-grained reactivity:

- **Construct-once execution**: Component functions execute once during mounting to wire dependencies and instantiate DOM nodes.
- **Push-pull reactivity**: Signal updates push dirty notifications through a directed acyclic graph (DAG), and values are lazily pulled only when read by active subscribers, preventing redundant computations and glitches.
- **Zero synthetic abstraction**: Event listeners bind directly to native browser elements, and signal values bind directly to `Text` nodes or element attributes.

## Quick Example

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

const root = document.getElementById("app");
if (root) {
  render(() => <Counter />, root);
}
```

## Core Modules

Visage is modular. Import from the package root or target specific submodules:

- `@epoch32/visage/signals`: Reactive primitives (`signal`, `computed`, `effect`, `batch`, `createStore`, `createContext`, `createRoot`).
- `@epoch32/visage/dom`: Reactive DOM control flow primitives (`<Show>`, `<For>`, `<Portal>`, `<Suspense>`, `<ErrorBoundary>`, `lazy`, `render`).
- `@epoch32/visage/router`: Built-in client-side SPA router (`<Router>`, `<Routes>`, `<Route>`, `<Link>`, `useLocation`, `useNavigate`).
- `@epoch32/visage/ui`: Headless, accessible UI component primitives (`Dialog`, `Tabs`, `Command`, `DataTable`, `DropdownMenu`, `Switch`, `Toast`, `Tooltip`, `Popover`, `Accordion`, `BottomBar`).
- `@epoch32/visage/charts`: Composable, fine-grained reactive SVG data visualizations (`Chart`, `Line`, `Area`, `Bar`, `Pie`, `CartesianGrid`, `XAxis`, `YAxis`, `ChartCursor`, `ChartTooltip`, `ChartLegend`).
- `@epoch32/visage/style`: Scoped CSS engine and spatial layout system (`Stack`, `Row`, `Center`, `Grid`, `Spacer`, `createStyle`, `css`, `fluid`, `glass`).
- `@epoch32/visage/form`: Reactive form state management with automatic binding and Standard Schema v1 validation.
- `@epoch32/visage/query`: Asynchronous server state caching and mutation lifecycle management (`createQuery`, `createMutation`, `createInfiniteQuery`, `QueryClient`).
- `@epoch32/visage/api`: File-based REST routing with directive pragmas, procedure builders, and typed client SDKs.
- `@epoch32/visage/rpc`: Type-safe RPC router and client proxy with request batching and Server-Sent Events (SSE).
- `@epoch32/visage/virtual`: Element virtualization engine for large lists and grids (`VirtualList`, `VirtualGrid`).
- `@epoch32/visage/server`: Server-side rendering (`renderToString`, `renderToStream`) and client hydration (`hydrate`).
- `@epoch32/visage/devtools`: In-browser reactive graph inspector and RPC transaction logger (`VisageDevTools`).
- `@epoch32/visage/vite`: Official Vite plugin providing HMR transforms, automatic JSX configuration, and icon optimization.

## Vite Configuration

Visage includes an official Vite plugin that configures JSX compilation and hot module replacement:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { visage } from "@epoch32/visage/vite";

export default defineConfig({
  plugins: [visage()]
});
```

## Contributing

We welcome contributions from the community! Check out our [Contributing Guide](CONTRIBUTING.md) for details on setting up your local environment, code standards, and PR workflows.

```bash
# Install dependencies
bun install

# Run test suite
bun test

# Run TypeScript static analysis
bun run typecheck

# Run Biome lint and format validation
bun run check

# Verify and build all distribution targets
bun run verify
```

## License

Mozilla Public License 2.0 (MPL-2.0). See [LICENSE](LICENSE) for details.
