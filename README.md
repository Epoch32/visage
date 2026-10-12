# Visage

Visage is a high-performance, full-stack TypeScript toolkit built on fine-grained push-pull reactivity and zero-VDOM direct DOM execution. 

While Visage started life as an exploration into a cleaner, faster UI concept—proving that eliminating the Virtual DOM in favor of construct-once component execution yields sub-microsecond DOM updates—it has since evolved into a complete, batteries-included toolkit for building modern full-stack web applications. Everything from server-side rendering, type-safe RPC, and file-based APIs to accessible UI primitives, reactive SVG charting, virtualized lists, internationalization, and drag-and-drop IO is engineered to work together with zero external runtime dependencies.

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

## Origins: Born as a Better UI Concept

Traditional Virtual DOM frameworks re-execute component functions on every state change, generating ephemeral trees of objects that must be reconciled against the previous render.

Visage began as an answer to that overhead by embracing fine-grained reactive mechanics:

- **Construct-once execution**: Component functions execute once during initial mounting to wire dependencies and instantiate DOM nodes. Components never re-render.
- **Push-pull reactivity**: Signal updates push dirty notifications through a glitch-free directed acyclic graph (DAG), and values are lazily pulled only when read by active subscribers.
- **Zero synthetic abstraction**: Event listeners bind directly to native browser elements, and signal values bind directly to individual `Text` nodes or DOM element attributes.

## Evolving into a Full-Stack Toolkit

As the reactive foundation matured, the scope expanded beyond pure frontend view rendering. Today, Visage provides a unified, coherent toolkit spanning both client and server:

- **End-to-End Type Safety**: Built-in full-stack RPC (`createRouter`, `createFetchHandler`, `createClient`) with Server-Sent Events (SSE) streaming and microtask batching, plus opinionated file-based REST APIs.
- **Server-Side Rendering & Hydration**: Native streaming SSR (`renderToStream`, `renderToString`) with seamless client hydration.
- **Data Fetching & Cache**: Server state query caching with automatic deduplication, refetching, and mutations.
- **Headless UI & Spatial Layout**: WAI-ARIA accessible component primitives (Dialog, Select, Slider, Tabs, DropdownMenu, Command palette, Toasts) alongside a scoped spatial layout system (`Stack`, `Row`, `Grid`).
- **Data Visualizations & Virtualization**: Reactive SVG charts (`Line`, `Area`, `Bar`, `Pie`) and element virtualization handling 100,000+ rows smoothly.
- **Modern Web IO & Drag-and-Drop**: Fine-grained drag-and-drop ingestion with zero-flicker nested counter tracking, reactive clipboard access, and imperative file dialogs.
- **Localization (i18n)**: Reactive internationalization with CLDR plural rules, live Crowdin/Weblate community translation sync, and dynamic async dictionary loading.
- **Developer Experience**: Official Vite plugin with instant HMR and an in-browser live reactive DAG graph inspector.

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
