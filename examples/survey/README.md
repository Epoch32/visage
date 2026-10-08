# Visage Survey & Insights Suite (Example Application)

A professional, real-time multi-step survey application showcasing Visage's fine-grained reactive architecture.

---

## Architecture & Features

- **`visage/form`**: Two-way fine-grained reactive form bindings (`form.bind("field")`) with live keystroke/blur validation.
- **`visage/rpc`**: Contract-first procedures (`getConfig`, `getStats`, `submit`, `liveFeed`) with standard Web `Request`/`Response` dispatching and Server-Sent Events (SSE).
- **`visage/query`**: Signal-native server state caching (`createQuery`), optimistic mutations (`createMutation`), and automatic query invalidation.
- **`visage/router`**: Declarative client SPA routing between the multi-step survey and the live analytics dashboard.
- **`visage/dom`**: Direct zero-VDOM node bindings (`<Show>`, `<For>`) with 0 external runtime dependencies.

---

## Running the Example

### Start the Live Full-Stack App & Dashboard
```bash
bun run example:survey
```

- **Survey Form**: [http://localhost:3000/](http://localhost:3000/)
- **Live SSE Dashboard**: [http://localhost:3000/analytics](http://localhost:3000/analytics)
- **RPC API**: [http://localhost:3000/api/rpc](http://localhost:3000/api/rpc)
