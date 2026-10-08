# ⚡ Visage — Agent Guide & Architecture Roadmap

> **Target Repository**: `epoch32/visage`  
> **Reactivity Model**: Fine-grained TC39-aligned push-pull Signals with version epochs  
> **Rendering Paradigm**: Zero-VDOM direct DOM node bindings  
> **Runtime Dependencies**: **0** (100% self-contained TypeScript)

---

## 1. Executive Summary & Design Principles

Visage is a next-generation UI library and reactivity system designed to completely replace React and VDOM reconciliation with fine-grained push-pull signals and direct DOM mutations.

### Core Architecture Axioms:
1. **Constructor Execution Model**: Components are invoked **exactly once** during initial creation. They never re-execute on state changes.
2. **Push-Pull Glitch-Free Versioning**: Signals propagate "dirty" notifications in a push phase, and derived computations pull values lazily with version epochs (`epoch: number`) to guarantee 0 glitching and 0 redundant computations in diamond dependencies.
3. **Direct In-Place DOM Mutation**: Signal updates bypass virtual DOM trees and synthetic events, writing directly to existing `Text` nodes (`textNode.data = newValue`) and element attributes in-place.
4. **Zero Runtime Dependencies**: The core framework, signals, DOM engine, SSR serializer, stream renderer, form validator, router, and virtualizer contain **zero external runtime dependencies**.

---

## 2. Codebase Structure

```
visage/
├── src/
│   ├── signals/            # TC39 push-pull reactive core
│   │   ├── signal.ts       # Signal, Computed, Effect, Batch, Scope, Cleanup, Versioning
│   │   ├── store.ts        # Deep Proxy reactive stores (createStore)
│   │   ├── context.ts      # Scoped Context API (createContext, useContext)
│   │   └── index.ts
│   ├── dom/                # Direct DOM rendering & control flow
│   │   ├── render.ts       # insertChild, setAttribute, render(), lifecycle
│   │   ├── control-flow.ts # <Show> and <For> keyed reconciliation
│   │   ├── async.ts        # createResource, <Suspense>, <ErrorBoundary>
│   │   └── index.ts
│   ├── router/             # Client SPA routing
│   │   ├── router.tsx      # <Router>, <Routes>, <Route>, <Link>, useParams, lazy
│   │   └── index.ts
│   ├── form/               # Reactive forms & validation
│   │   ├── form.ts         # createForm, fine-grained field tracking, bindings
│   │   ├── schema.ts       # Built-in validator 'v' & Standard Schema v1 (ArkType, Zod)
│   │   └── index.ts
│   ├── virtual/            # Zero-VDOM list & grid virtualization
│   │   ├── virtualizer.ts  # createVirtualizer, binary search offsets, dynamic height
│   │   ├── virtual-list.tsx# <VirtualList> and <VirtualGrid>
│   │   └── index.ts
│   ├── template/           # Native template cloning engine
│   │   ├── template.ts     # template() cloning & html tagged template
│   │   └── index.ts
│   ├── server/             # SSR & progressive streaming
│   │   ├── render-to-string.ts # Fast synchronous HTML serializer
│   │   ├── render-to-stream.ts # Progressive Web Streams renderer
│   │   ├── hydrate.ts          # Client-side hydration engine
│   │   └── index.ts
│   ├── jsx-runtime/        # JSX factory and typings
│   │   ├── index.ts        # Direct DOM jsx(), jsxs(), Fragment factory
│   │   └── jsx.d.ts        # JSX.IntrinsicElements with T | Signal<T> | (() => T)
│   └── index.ts            # Root package export
├── tests/                  # Headless unit test suite (DOM Mock)
│   ├── dom-mock.ts         # Zero-dependency in-memory DOM simulation
│   ├── signals.test.ts     # Push-pull reactivity, store proxies, context
│   ├── jsx.test.tsx        # Direct DOM bindings, <Show>, <For>
│   ├── async.test.tsx      # createResource, Suspense, ErrorBoundary
│   ├── router.test.tsx     # Client routing, params, links, 404
│   ├── template.test.ts    # Template cloning & tagged template literal
│   ├── server.test.tsx     # SSR renderToString, renderToStream, hydrate
│   ├── form.test.tsx       # Reactive forms, schema 'v', Standard Schema
│   └── virtual.test.tsx    # List and Grid virtualization tests
├── biome.json              # Biome linting and formatting configuration
├── package.json
└── tsconfig.json
```

---

## 3. Completed Modules & API Surface

### 1. `visage/signals`
* `signal<T>(initialValue)`: Writable push-pull signal with `.get()`, `.set()`, `.update()`, and callable getter/setter.
* `computed<T>(fn)`: Memoized derived computation with lazy evaluation and dependency tracking.
* `effect(fn)`: Side-effect runner with automatic dependency tracking and nested scope cleanup.
* `batch(fn)`: Defers effect flushes until the batch callback completes.
* `untrack(fn)`: Executes code without registering active dependencies.
* `createStore<T>(initialObj)`: Deep Proxy store for granular object/array property mutations without shallow copying.
* `createContext<T>()` / `useContext<T>()`: Scoped hierarchical dependency injection.

### 2. `visage/dom`
* `render(fn, container)`: Mounts component tree to a DOM container.
* `<Show when={...} fallback={...}>`: Conditional rendering with fine-grained scope teardown.
* `<For each={...} fallback={...}>`: Keyed list reconciliation preserving DOM nodes across order changes.
* `createResource(fetcher)` / `<Suspense>`: First-class async resource coordination with fallback states.
* `<ErrorBoundary fallback={...}>`: Isolated subtree error catching.

### 3. `visage/router`
* `<Router>`, `<Routes>`, `<Route>`, `<Link>`: Declarative client SPA routing.
* `useParams()`, `useLocation()`, `useNavigate()`, `useSearchParams()`: Reactive URL signals.
* `lazy(() => import(...))`: Dynamic component code splitting.

### 4. `visage/form`
* `createForm({ initialValues, schema, onSubmit })`: Two-way input binding (`form.bind("field")`), per-field touched/dirty/error tracking, and reactive `form.isValid()`.
* `v`: Built-in zero-dependency schema validator (`v.string().min(3).email()`, `v.number()`, `v.object()`).
* **Standard Schema v1**: Seamless drop-in compatibility with **ArkType**, **Zod**, and **Valibot**.

### 5. `visage/virtual`
* `createVirtualizer(options)`: Binary search offset calculations with dynamic item height support.
* `<VirtualList>` & `<VirtualGrid>`: Zero-VDOM windowing capable of handling 1,000,000+ items at 120 FPS.

### 6. `visage/server`
* `renderToString(fn)`: Synchronous HTML string serialization.
* `renderToStream(fn)`: Progressive Web Streams HTML streaming for Edge/Cloudflare/Bun.
* `hydrate(fn, container)`: Seamless client-side event and signal hydration over server-rendered markup.

---

## 4. Prioritized Next Steps for Incoming Agents

When continuing development on Visage, implement features in this recommended sequence:

### Priority 1: `visage/query` (Signal-Native Server State & Cache)
* **Goal**: Build a zero-dependency async data fetching & cache manager (alternative to TanStack Query).
* **Key Requirements**:
  * Query keys with hierarchical cache invalidation (`queryClient.invalidateQueries(["issues"])`).
  * `staleTime` and `gcTime` (garbage collection) with automatic background revalidation.
  * Window focus (`focus`) and network reconnect (`online`) event listeners.
  * Optimistic mutations (`createMutation`) with automatic rollback on failure.
  * Integration with `createResource` and `<Suspense>`.

### Priority 2: Hardened Secure API & Type-Safe RPC Layer (`visage/server` + `visage/client`)
* **Goal**: Build an end-to-end type-safe RPC wire protocol over Web Standards (`Request`/`Response`).
* **Key Requirements**:
  * Contract-first procedure declaration with mandatory input/output schemas (Standard Schema v1 / `v`).
  * Zero-copy `fetch` handler compatible with Bun, Node, and Cloudflare Workers.
  * Secure-by-default headers: Automatic CORS, CSRF tokens, strict CSP, and signed cookies.
  * Native Server-Sent Events (SSE) and WebSocket streams feeding directly into Visage signals.
  * `createClient<AppRouter>({ baseUrl })` client SDK for multi-repo type safety.

### Priority 3: `visage/motion` & UI Transitions
* **Goal**: Web Animations API (WAAPI) and FLIP layout transitions without Framer Motion bloat.
* **Key Requirements**:
  * `<Transition name="fade">` for smooth enter/leave animations on `<Show>`.
  * `<TransitionGroup>` with automatic FLIP translation calculation when `<For>` list items reorder.
  * Native View Transitions API integration with `<Router>` (`document.startViewTransition`).

### Priority 4: Headless Accessible UI Primitives (`visage/ui`)
* **Goal**: Zero-dependency, unstyled, WAI-ARIA compliant accessible components.
* **Key Requirements**:
  * `<Dialog>` / `<Modal>`: Body portals, focus trapping, Escape key listener, backdrop dismissal.
  * `<Popover>` / `<DropdownMenu>`: Floating anchor calculation and outside-click detection.
  * `<Tabs>` & `<Accordion>`: Keyboard arrow navigation and ARIA attributes.
  * `<Combobox>`: Searchable autocomplete with highlighted item selection.

---

## 5. Development & Verification Workflow

Always verify changes using the following toolchain before committing:

```bash
# 1. Run complete unit test suite (must maintain 100% pass rate)
bun test

# 2. Strict TypeScript type check (0 errors required)
bun run typecheck

# 3. Biome linting and formatting
bun run check
```

---

## 6. Constraints & Guidelines for Future Agents

1. **Zero Runtime Dependencies**: Do not add third-party runtime packages to `dependencies` in `package.json`. All primitives must be self-contained within `src/`.
2. **Maintain Strict Typing**: Ensure `noUncheckedIndexedAccess: true` and `strict: true` pass cleanly on `bun x tsc --noEmit`.
3. **Clean, Minimalist Aesthetics**: Avoid emojis or AI-generated design tropes in any official examples or UI primitives. Focus on clean typography, high information density, and rock-solid performance.
