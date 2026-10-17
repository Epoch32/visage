# Visage Opinionated MPA Example

This example demonstrates Visage's file-system driven Multi-Page Application (MPA) pages router and build-time Static Site Generation (SSG).

## Features Showcased

- **Zero-Boilerplate Routing:** No manual HTML shells or router setup. Simply create `.tsx` files in `src/pages/`.
- **Shared Layouts (`_layout.tsx`):** Global layout wrapping all discovered routes with navigation and persistent styling.
- **Dynamic Segments (`[slug].tsx`):** Parameter matching for blog posts, products, or user pages (`/blog/:slug`).
- **Catch-All Routes (`[...all].tsx`):** Variable-depth routing capturing entire subpaths (`/docs/*`).
- **Custom 404 (`404.tsx`):** Branded not-found pages served in development and emitted as `dist/404.html` during build.
- **Client Reactivity:** Full access to fine-grained Visage signals (`createSignal`, `computed`, `effect`) on every page.
- **Static Site Generation (SSG):** `bun run build` emits physical `.html` documents into `dist/` ready for edge deployment.

## Running the Example

### Development Server
```bash
bun run dev
# or: npx vite
```
Open [http://localhost:5190](http://localhost:5190) in your browser.

### Build (Static Site Generation)
```bash
bun run build
# or: npx vite build
```

This generates:
```
dist/
├── index.html        # Pre-rendered from src/pages/index.tsx
├── 404.html          # Pre-rendered from src/pages/404.tsx
├── about/
│   └── index.html    # Pre-rendered from src/pages/about.tsx
├── blog/
│   └── index.html    # Pre-rendered from src/pages/blog/index.tsx
├── contact/
│   └── index.html    # Pre-rendered from src/pages/contact/index.tsx
└── assets/           # Compiled JS and CSS bundles
```
