# ⚡ Visage

> **Lightning-fast, zero-VDOM, fine-grained reactive UI library with push-pull signals, deep reactive stores, async suspense, client router, template cloning, SSR streaming, and full TypeScript inference.**

---

## 🚀 Key Highlights

- **Zero Virtual DOM**: Components execute **once** as constructors. No tree-diffing, no synthetic events, no reconciliation overhead.
- **Push-Pull Reactive Signals**: Glitch-free, TC39-aligned push-pull reactive engine (`signal`, `computed`, `effect`, `batch`, `untrack`) with signal versioning.
- **Direct DOM In-Place Updates**: Signal mutations update the specific DOM `Text` node or element attribute directly in place.
- **Zero-Overhead Virtualization (`visage/virtual`)**: Blazing fast `<VirtualList>` and `<VirtualGrid>` supporting 1,000,000+ items with zero VDOM overhead.
- **Reactive Forms & Validation (`visage/form`)**: Built-in declarative schema validation (`v`), two-way fine-grained bindings (`form.bind()`), and full **Standard Schema v1** compatibility (ArkType, Zod, Valibot).
- **Deep Reactive Stores (`createStore`)**: Per-property fine-grained Proxy reactivity for objects and arrays without shallow cloning.
- **Server-Side Rendering & Streaming (`visage/server`)**: `renderToString()`, `renderToStream()` with Web Streams, and client-side `hydrate()`.
- **Client SPA Router (`visage/router`)**: `<Router>`, `<Routes>`, `<Route>`, `<Link>`, `useParams`, `useLocation`, `useNavigate`, `useSearchParams`, and `lazy()` code splitting.
- **Template HTML Cloning (`visage/template`)**: `template()` and `html` tagged template literals for lightning-fast native `cloneNode(true)` instantiation.
- **Context API (`createContext`, `useContext`)**: Scoped dependency injection without prop drilling.
- **Async Resources & Suspense (`createResource`, `<Suspense>`)**: First-class async state coordination with fallback UI.
- **Fault Tolerance (`<ErrorBoundary>`)**: Subtree error isolation and recovery.
- **Fine-Grained Control Flow (`<Show>`, `<For>`)**: Keyed list and conditional reconciliation with automatic scope lifecycle teardown.
- **Zero Runtime Dependencies**: Completely self-contained. Pure TypeScript.
- **Biome Configured**: Blazing-fast formatting and linting.

---

## 📦 Project Structure

```
visage/
├── src/
│   ├── signals/
│   │   ├── signal.ts       # Signal, Computed, Effect, Batch, Scope, Cleanup, Versioning
│   │   ├── store.ts        # Deep Proxy reactive stores
│   │   ├── context.ts      # Scoped Context API
│   │   └── index.ts
│   ├── dom/
│   │   ├── render.ts       # In-place Text/Attr mutations, Event handling, Lifecycle
│   │   ├── control-flow.ts # <Show> and <For> primitives
│   │   ├── async.ts        # createResource, <Suspense>, <ErrorBoundary>
│   │   └── index.ts
│   ├── virtual/
│   │   ├── virtualizer.ts  # createVirtualizer, binary search offsets, dynamic height
│   │   ├── virtual-list.tsx# <VirtualList> and <VirtualGrid>
│   │   └── index.ts
│   ├── router/
│   │   ├── router.tsx      # <Router>, <Routes>, <Route>, <Link>, useParams, lazy
│   │   └── index.ts
│   ├── form/
│   │   ├── form.ts         # createForm, fine-grained field tracking, bindings
│   │   ├── schema.ts       # Built-in validator 'v' & Standard Schema v1 (ArkType, Zod)
│   │   └── index.ts
│   ├── template/
│   │   ├── template.ts     # template() cloning & html tagged template
│   │   └── index.ts
│   ├── server/
│   │   ├── render-to-string.ts # Fast synchronous HTML serializer
│   │   ├── render-to-stream.ts # Progressive Web Streams renderer
│   │   ├── hydrate.ts          # Client-side hydration engine
│   │   └── index.ts
│   ├── jsx-runtime/
│   │   ├── index.ts        # Direct DOM jsx(), jsxs(), Fragment factory
│   │   └── jsx.d.ts        # JSX.IntrinsicElements with T | Signal<T> | (() => T)
│   └── index.ts            # Main package entry point
├── tests/
│   ├── signals.test.ts     # Push-pull reactivity, stores, context, batching
│   ├── jsx.test.tsx        # DOM updates, <Show>, and <For> reconciliation
│   ├── async.test.tsx      # createResource, Suspense, ErrorBoundary
│   ├── router.test.tsx     # Client SPA Router, params, links, 404
│   ├── template.test.ts    # Template cloning & tagged template literal
│   ├── server.test.tsx     # SSR renderToString, renderToStream, hydrate
│   ├── form.test.tsx       # Reactive forms, built-in schema 'v', Standard Schema
│   └── virtual.test.tsx    # List and Grid virtualization tests
├── biome.json              # Biome lint & format configuration
├── package.json
└── tsconfig.json
```

---

## ⚡ Server-Side Rendering (SSR) & Streaming

```tsx
import { renderToString, renderToStream, hydrate } from "visage/server";
import { signal } from "visage";

function App() {
  const count = signal(0);
  return (
    <div id="root">
      <h1>Server-Rendered Visage</h1>
      <button onClick={() => count.update(n => n + 1)}>
        Count: {count}
      </button>
    </div>
  );
}

// 1. Synchronous HTML String (e.g. Bun / Node server)
const html = renderToString(() => <App />);

// 2. Progressive HTML Streaming (e.g. Edge / Cloudflare Workers / Bun)
const stream = renderToStream(() => <App />);

// 3. Client-Side Hydration
hydrate(() => <App />, document.getElementById("root")!);
```

---

## 📋 Reactive Forms & Validation (`visage/form`)

Visage provides full-featured reactive form management with two-way bindings and **Standard Schema v1** compatibility (ArkType, Zod, Valibot) or zero-dependency native `v` schemas:

```tsx
import { createForm, v } from "visage/form";
import { Show } from "visage";

function SignupForm() {
  const form = createForm({
    initialValues: {
      username: "",
      email: ""
    },
    schema: v.object({
      username: v.string().min(3, "At least 3 characters required"),
      email: v.string().email("Please enter a valid email")
    }),
    onSubmit: async (values) => {
      console.log("Submitted payload:", values);
    }
  });

  return (
    <form onSubmit={form.handleSubmit}>
      <div>
        <label>Username:</label>
        <input {...form.bind("username")} />
        <Show when={() => form.fields.username.error()}>
          <span class="error">{form.fields.username.error}</span>
        </Show>
      </div>

      <div>
        <label>Email:</label>
        <input {...form.bind("email")} />
        <Show when={() => form.fields.email.error()}>
          <span class="error">{form.fields.email.error}</span>
        </Show>
      </div>

      <button type="submit" disabled={() => !form.isValid() || form.isSubmitting()}>
        {() => (form.isSubmitting() ? "Submitting..." : "Sign Up")}
      </button>
    </form>
  );
}
```

---

## 🚀 Virtualization (`visage/virtual`)

Render datasets with 100,000 to 1,000,000+ items smoothly at locked 120 FPS:

```tsx
import { VirtualList, signal } from "visage";

const transactions = signal(Array.from({ length: 100_000 }, (_, i) => ({
  id: i,
  name: `Transaction #${i}`,
  amount: (Math.random() * 500).toFixed(2)
})));

function TransactionFeed() {
  return (
    <VirtualList
      each={transactions}
      itemHeight={48}
      height={500}
      overscan={4}
    >
      {(tx, index) => (
        <div class="row">
          <span>#{index}: {tx.name}</span>
          <strong>${tx.amount}</strong>
        </div>
      )}
    </VirtualList>
  );
}
```

---

## 🧪 Testing & Verification

```bash
# Run complete test suite (31 tests across 8 files)
bun test

# Strict TypeScript typechecking
bun run typecheck

# Biome linter and formatter
bun run check
```
