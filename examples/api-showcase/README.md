# Visage File-Based API Showcase

This example demonstrates how to build an opinionated full-stack application using **`visage/api`** — an ultra-fast, zero-baggage, file-based RPC framework.

## Key Features

- **File-Based Routing**: Endpoints and procedures automatically mapped from filesystem structure.
- **Directive Pragmas (`// @visage-middleware`)**:
  - `cascade: true | false`: Controls whether middleware cascades down into child subdirectories.
  - `exclude: [...]`: Easily bypass middleware on specific public routes (e.g. `/health`).
  - `match: [...]`: Target specific route globs.
- **Type-Safe Context Propagation**: Middlewares enrich `ctx` (e.g. `ctx.admin`, `ctx.requestId`) and pass it directly to downstream procedures.
- **Unified Standard Schema Validation**: Full input validation powered by `visage/form` (`v.object`, `v.string`, `v.boolean`).
- **Real-Time SSE Streaming**: Async generator procedures streaming directly to client `EventSource` and Visage Signals.

## Running the Example

```bash
bun run example:api
```

Visit `http://localhost:3030` to test public endpoints, guarded admin queries, and real-time SSE streams.
