# Visage

<p align="center">
  <img width="1290" height="550" alt="Visage banner" src="https://github.com/user-attachments/assets/ebd1e69a-92ed-4536-a870-4d64a2869f14" />
</p>

Visage started as a research project by Epoch32. The original concept, explored in a blog post, demonstrated that building a UI library without a Virtual DOM (like Solid) was, in principle, a straightforward task.

Since then, Visage has grown into much more. With the release of [v1.0.0](https://github.com/Epoch32/visage/releases/tag/visage-v1.0.0), which introduced two Vite plugins, developer tools, streamlined CSS authoring, and our signals engine, we realized that the project had the potential to become more than a research experiment. We took it a step further, evolving Visage into what it is today: a full-stack web toolkit built on a fine-grained reactivity architecture.

## Why Visage?

If you're coming from React, you're probably familiar with the Virtual DOM. React's rendering model commonly re-executes component functions when state changes, producing new element descriptions that React reconciles with the previous render. Visage takes a different approach:

- **Construct-once execution:** Component functions execute during the initial mount to establish reactive dependencies and instantiate DOM nodes. Subsequent updates propagate through the reactive graph without re-executing those component functions.
- **Push-pull reactivity:** Signal updates propagate dirty notifications through a glitch-free directed acyclic graph (DAG). Updated values are pulled lazily, allowing computations to run only when their results are needed.
- **Direct DOM bindings:** Event listeners attach directly to native browser elements, while reactive values bind to individual text nodes and DOM element properties or attributes. This avoids the need for a virtual tree to reconcile after each update.

## Performance and compilation

By eliminating Virtual DOM reconciliation, Visage takes a different approach to rendering performance. Since its initial release, Visage has demonstrated performance advantages over React and other Virtual DOM-based libraries in benchmarks.

In [v1.8.0](https://github.com/Epoch32/visage/releases/tag/visage-v1.8.0), Visage introduced a compiler built on top of Vite to further optimize application code. With compiler-driven optimizations, Visage has also demonstrated competitive performance against [SolidJS](https://www.solidjs.com/) in the [JS Framework Benchmark](https://github.com/krausest/js-framework-benchmark/) suite.

Visage combines fine-grained reactivity, compiler optimizations, and integrated development tooling to provide the performance and capabilities needed to build responsive web applications.

## Examples

### Simple app

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

### Vite configuration

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

The compiler also supports server-side rendering, while experimental integrations include Zig-based native WebView scaffolding, security transforms, and Content Security Policy generation.

## Contributing

See [CONTRIBUTING.md](https://github.com/Epoch32/visage/blob/main/CONTRIBUTING.md) for contribution guidelines.

## License

See [LICENSE](https://github.com/Epoch32/visage/blob/main/LICENSE) for license information.
