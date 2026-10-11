# Contributing to Visage

Thank you for your interest in contributing to Visage! We welcome pull requests, bug fixes, feature proposals, and improvements.

---

## How to Contribute

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/Epoch32/visage.git
   cd visage
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```

4. **Make your changes** and keep commits concise and descriptive.

5. **Open a Detailed Pull Request**:
   - Provide a clear, detailed description explaining **what** changed and **why**.
   - If UI or chart changes are involved, include before/after screenshots or GIFs.
   - Link any relevant issues.

---

## Verifying Your Changes

Before opening your PR, make sure all checks and tests pass locally:

```bash
# Run full test suite (includes unit tests, Biome check, and TypeScript typecheck)
bun test

# Run TypeScript compiler check
bun run typecheck

# Run Biome linting and formatting check
bun run check

# Build core distribution bundles
bun run build
```

---

## Development Guidelines

- **Zero-VDOM, Fine-Grained Reactivity**: Components run once to construct the reactive DOM graph; only signals update reactively. Avoid recreating entire component subtrees when fine-grained signal bindings suffice.
- **TypeScript First**: Ensure all primitives, components, and props have strict TypeScript types.
- **Keep it fast**: Visage prioritizes microsecond updates, minimal bundle footprint, and zero runtime bloat.
