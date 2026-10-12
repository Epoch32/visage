# Changelog

## [1.1.2](https://github.com/Epoch32/visage/compare/visage-v1.1.1...visage-v1.1.2) (2026-10-11)


### Bug Fixes

* **dom:** anchor Show marker before effect and support function fallback ([a754187](https://github.com/Epoch32/visage/commit/a754187971de820cf91578304a7c4b2fd840ba5a))

## [1.1.1](https://github.com/Epoch32/visage/compare/visage-v1.1.0...visage-v1.1.1) (2026-10-11)


### Bug Fixes

* copy jsx.d.ts to dist/jsx-runtime on build ([14c16ec](https://github.com/Epoch32/visage/commit/14c16ec3f94e2d30d9156f1213208cf2ce49d031))

## [1.1.0](https://github.com/Epoch32/visage/compare/visage-v1.0.0...visage-v1.1.0) (2026-10-11)


### Features

* **build:** export compiled bundles and d.ts declarations with vite alias support ([4d44bd4](https://github.com/Epoch32/visage/commit/4d44bd493c7edd788095367b914b05d81308ead9))
* **signals:** add first-class signal persistence with PersistOptions ([b0251b7](https://github.com/Epoch32/visage/commit/b0251b7a8ff523584e2a63c588f946faf3488973))


### Bug Fixes

* **signals:** check window, globalThis, and storage identifier for localStorage ([784d568](https://github.com/Epoch32/visage/commit/784d568d1971b6bb980451c4790c42ca6f22ae2e))

## 1.0.0 (2026-10-11)


### Features

* add devtools, scoped css engine, vite plugin, and ergonomic rpc queries/mutations ([5300247](https://github.com/Epoch32/visage/commit/5300247da434bbc53e521907ca49372811d54a33))
* **api:** add file-based API router with directive pragma middleware cascades ([40d7cc7](https://github.com/Epoch32/visage/commit/40d7cc716dc9b8464e385c6ac1cc023ba75ab355))
* **charts:** add charts showcase, monotone spline curves, and compiler-level jsxImportSource ([4f506ca](https://github.com/Epoch32/visage/commit/4f506ca13562f328e15a349e2b2e4826d2d81bc4))
* **charts:** add composable fine-grained reactive charts module (Chart, Line, Area, Bar, Pie, Axis, Grid, Tooltip) ([1695450](https://github.com/Epoch32/visage/commit/16954507b83b2b2c77c3994de64f531a9e554da3))
* **devtools, ui:** add Live DAG dependency visualizer, &lt;Command /&gt; palette, and &lt;DataTable /&gt; primitives ([609ebf3](https://github.com/Epoch32/visage/commit/609ebf3f5f5f0cef4a5511ffe7b5979c60d184d8))
* **dom, devtools:** add lazy component loader and redesign DAG visualizer ([37c2a9f](https://github.com/Epoch32/visage/commit/37c2a9fbaad5149661d33793915a9e1d55a9c763))
* **examples:** add full-stack visage/api showcase with directive middleware cascades and SSE ([8a0faae](https://github.com/Epoch32/visage/commit/8a0faae9ae84b4b3953e42823de32392e738cbe0))
* initial commit for visage - zero-vdom fine-grained reactive UI library ([31e8905](https://github.com/Epoch32/visage/commit/31e8905b81ed0dccfb741dc9c7bee31a68aa0dfd))
* **query:** implement signal-native server state and cache management (visage/query) ([d44793b](https://github.com/Epoch32/visage/commit/d44793bafc205ebad318df301718cfc6ad9682d3))
* release 0.1.0 - typed api client, formalized docs, and reactive submodules ([7973f6c](https://github.com/Epoch32/visage/commit/7973f6cffa26fecd2b396987156732c79cf7dd20))
* **rpc:** add declarative route rules, header injection, and guard support ([35a2863](https://github.com/Epoch32/visage/commit/35a2863219a3c72cbe66c9ccb3c93498522b6669))
* **rpc:** implement type-safe RPC and wire protocol (visage/rpc) ([602fe83](https://github.com/Epoch32/visage/commit/602fe8352e174ea6265c7eef4509130efb7a2208))
* **signals:** add cyclic update detection and infinite loop circuit breaker ([ef69662](https://github.com/Epoch32/visage/commit/ef696627976c1f8c99eed7017cf1e255992bd18a))
* **style:** add Spatial Engine, direct signal-to-style binding, and semantic layout primitives (&lt;Stack&gt;, &lt;Row&gt;, &lt;Center&gt;, &lt;Grid&gt;, &lt;Spacer&gt;) ([d60eaaf](https://github.com/Epoch32/visage/commit/d60eaaf35a1ccbc52605789fa212b4a7aaee261e))
* **ui:** add accessible headless UI primitives (Dialog, Tabs, Popover, DropdownMenu, Accordion, Switch, Tooltip, Toast) ([2ce4888](https://github.com/Epoch32/visage/commit/2ce48886eb6713163cb82e624ca0085f770256cd))
* **ui:** enhance UI primitives with shorthands and add enterprise auth showcase ([f9f1b5e](https://github.com/Epoch32/visage/commit/f9f1b5e844488e5519a9442a08aea07fd4e8eedc))
* **ui:** re-export Command, DataTable, createIcon from root index ([0ebc5ae](https://github.com/Epoch32/visage/commit/0ebc5ae303dc719b2adb7735d33b677293d71540))
* **vite:** add separate visageLucide Vite plugin for build-time icon translation ([8ec45e6](https://github.com/Epoch32/visage/commit/8ec45e63a6643ba2747a86826a7a127a8258afff))


### Bug Fixes

* add explicit jsxImportSource pragma to tsx library files ([561c06b](https://github.com/Epoch32/visage/commit/561c06bab145e66256b05b1c658dd8e8601b7252))
* **devtools:** mark internal UI and devtools signals as internal to avoid DAG pollution ([695983a](https://github.com/Epoch32/visage/commit/695983a7b41f098c09abe389c04b0010aca3d5a9))
* **dom:** untrack child rendering in Show and For to preserve item event handlers ([c48cbda](https://github.com/Epoch32/visage/commit/c48cbdac7fe687cf9f6c974b9c1cd63a490767b5))
* **signals:** deduplicate cyclic update warning to prevent console spam ([1f46bc9](https://github.com/Epoch32/visage/commit/1f46bc95afc7a93d0d31c502136031320c1748bb))
* **vite:** avoid TypeScript type assertion in injected HMR footer ([62144c1](https://github.com/Epoch32/visage/commit/62144c171c8f8b597d1f49c9a34b2b30405f1566))
* **vite:** exclude visage packages from optimizeDeps to prevent react/jsx-runtime pre-bundling ([0c6c787](https://github.com/Epoch32/visage/commit/0c6c787844eeda5bc6fcd7627ab85527cef2f11c))
* **vite:** use oxc configuration for Vite 8 without esbuild deprecation warning ([4eac7bf](https://github.com/Epoch32/visage/commit/4eac7bfa4ab16105886cee3437865167d240dd61))
