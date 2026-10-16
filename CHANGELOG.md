# Changelog

## [1.10.0](https://github.com/Epoch32/visage/compare/visage-v1.9.1...visage-v1.10.0) (2026-10-16)


### Features

* **rpc:** support both function shorthand and options object with resolve in query/mutation ([86c0b57](https://github.com/Epoch32/visage/commit/86c0b572be7d3ef4e9b68fcfe2368be2f8a3d404))

## [1.9.1](https://github.com/Epoch32/visage/compare/visage-v1.9.0...visage-v1.9.1) (2026-10-16)


### Bug Fixes

* **build:** add external node:* flag to preserve Node.js builtins in bundled Vite plugin ([d38168c](https://github.com/Epoch32/visage/commit/d38168cacf77437a7e08d69d5b0a6533ac2f95e2))
* **rpc:** gracefully fallback baseUrl to endpoint or default /api/rpc in createClient ([41f22ae](https://github.com/Epoch32/visage/commit/41f22ae3897f77bf941869ac977dc7d744a4452d))

## [1.9.0](https://github.com/Epoch32/visage/compare/visage-v1.8.1...visage-v1.9.0) (2026-10-16)


### Features

* **compiler:** add experimental security transforms suite ([0948961](https://github.com/Epoch32/visage/commit/094896198c9b83edda88665fae41a07dc19fc249))
* **native:** add experimental zig desktop compilation target and native ipc bridge ([6fc38bd](https://github.com/Epoch32/visage/commit/6fc38bd70cce05145cc7ae0f6585a68786d9dc20))
* **vite:** add experimental Content Security Policy generator and injector ([f0c1ed8](https://github.com/Epoch32/visage/commit/f0c1ed8086c361f45ad75a20108f08e247760a01))
* **vite:** add picocolors standardized subsystem logging to compiler and plugins ([90ab0ee](https://github.com/Epoch32/visage/commit/90ab0ee8cbbe5c28589aad798327d4003c06471a))
* **vite:** support explicit virtualOrigin and exact script hashing in CSP for native webviews ([3a6d27a](https://github.com/Epoch32/visage/commit/3a6d27ae73837e568bf80a6ea33ffd154e09d701))


### Bug Fixes

* **charts:** prevent duplicate series registration and add benchmark showcase ([06b09ee](https://github.com/Epoch32/visage/commit/06b09ee051f4399a5c465c628de42161de7b4481))
* **vite:** pre-scan project JSX and HTML for CSP origins and update native demo ([d7457a1](https://github.com/Epoch32/visage/commit/d7457a145c0117edfb496ed83463967adc17ce75))

## [1.8.1](https://github.com/Epoch32/visage/compare/visage-v1.8.0...visage-v1.8.1) (2026-10-14)


### Performance Improvements

* **dom:** implement zero-allocation event tuples and pre-cloned text node reuse ([164451e](https://github.com/Epoch32/visage/commit/164451e184c7362eba9ddb448312858cd694f2fb))

## [1.8.0](https://github.com/Epoch32/visage/compare/visage-v1.7.0...visage-v1.8.0) (2026-10-14)


### Features

* **compiler:** add AOT JSX compiler with static template hoisting and event delegation ([03c949a](https://github.com/Epoch32/visage/commit/03c949a956028d51ee917d7360ceb2efe3ed8d04))
* **dom:** add first-class two-way form bindings (bind:value and bind:checked) ([3bca5f0](https://github.com/Epoch32/visage/commit/3bca5f0a5df612ee040c0399d1dc042c0fc6d922))
* **dom:** add Index component for position-indexed list rendering ([af45e40](https://github.com/Epoch32/visage/commit/af45e40ba2ffca981747a3e440f986088ac49b16))
* **dom:** implement event delegation and primitive text child rendering ([f72285f](https://github.com/Epoch32/visage/commit/f72285f041ceced4bd3db2f568f4fa278d44f56a))
* **signals:** add createSelector primitive with inline subscriber slots ([4e62247](https://github.com/Epoch32/visage/commit/4e622474324bfbdaba5e14789863b54abd38f44a))
* **template:** add table element wrapping and cached node cloning ([d89f9bb](https://github.com/Epoch32/visage/commit/d89f9bba56cc22437f09eecb4310c9a76d410136))
* **vite:** include 'lucide' by default in visageLucide aliases ([e544316](https://github.com/Epoch32/visage/commit/e5443162cd62b106fa938a9fc35467079c65bde0))


### Performance Improvements

* **signals:** optimize signals and effects with inline slots and shared prototypes ([1774a99](https://github.com/Epoch32/visage/commit/1774a99a256f7a929e7ef03a3a97fd4301c81b0e))

## [1.7.0](https://github.com/Epoch32/visage/compare/visage-v1.6.0...visage-v1.7.0) (2026-10-13)


### Features

* **dom:** add 'by' key extractor to For component for stable item reconciliation ([e838671](https://github.com/Epoch32/visage/commit/e838671b593841451b9975541309c4f25e51a0c9))


### Bug Fixes

* **dom:** preserve input selection range and avoid redundant value assignment ([eec4cd0](https://github.com/Epoch32/visage/commit/eec4cd07ad1c26a650452515531858476ae94b02))

## [1.6.0](https://github.com/Epoch32/visage/compare/visage-v1.5.1...visage-v1.6.0) (2026-10-13)


### Features

* **form:** add optional() to ObjectSchema and add v.record() and v.any() ([1692080](https://github.com/Epoch32/visage/commit/1692080d12b85e3e2b79798f5684461afc9d4b0d))

## [1.5.1](https://github.com/Epoch32/visage/compare/visage-v1.5.0...visage-v1.5.1) (2026-10-12)


### Bug Fixes

* **test:** safely mock URL methods without clobbering global constructor ([d78b2de](https://github.com/Epoch32/visage/commit/d78b2deb02e59c8dbab8600e49149de334c85276))

## [1.5.0](https://github.com/Epoch32/visage/compare/visage-v1.4.0...visage-v1.5.0) (2026-10-12)


### Features

* **i18n:** add fine-grained localization engine with Crowdin/Weblate sync ([516cafa](https://github.com/Epoch32/visage/commit/516cafae8d74d93999caf407b7222d09bb573d57))
* **io:** add reactive drag-and-drop, clipboard, file picker primitives and showcase tab ([38a0b98](https://github.com/Epoch32/visage/commit/38a0b98455f2c331c9d95b078c8dfc464f94be22))

## [1.4.0](https://github.com/Epoch32/visage/compare/visage-v1.3.3...visage-v1.4.0) (2026-10-12)


### Features

* **ui:** add accessible Select and Slider primitives with showcase fixes ([bd33288](https://github.com/Epoch32/visage/commit/bd33288c75edd15aa6ab68d21a8939e7ecf7ea14))

## [1.3.3](https://github.com/Epoch32/visage/compare/visage-v1.3.2...visage-v1.3.3) (2026-10-12)


### Bug Fixes

* **ui:** add global window escape listener in useDismiss primitive ([#17](https://github.com/Epoch32/visage/issues/17)) ([0d1da54](https://github.com/Epoch32/visage/commit/0d1da547f043a348df8849e36447445080c47308))

## [1.3.2](https://github.com/Epoch32/visage/compare/visage-v1.3.1...visage-v1.3.2) (2026-10-12)


### Bug Fixes

* support class and className to prevent issues around active/inactive elements  ([#15](https://github.com/Epoch32/visage/issues/15)) ([600bb06](https://github.com/Epoch32/visage/commit/600bb06350b783ca069b3563ea638907ecae2991))

## [1.3.1](https://github.com/Epoch32/visage/compare/visage-v1.3.0...visage-v1.3.1) (2026-10-12)


### Bug Fixes

* various core engine bug fixes ([#12](https://github.com/Epoch32/visage/issues/12)) ([ce04950](https://github.com/Epoch32/visage/commit/ce04950e2c25db9d138e85074b151f488906e244))

## [1.3.0](https://github.com/Epoch32/visage/compare/visage-v1.2.0...visage-v1.3.0) (2026-10-12)


### Features

* **ui:** add modular BottomBar mobile toolbar primitives ([8694a35](https://github.com/Epoch32/visage/commit/8694a352e05a4babec2670213f1cf712aa6452e4))
* **ui:** export BottomBar primitives from root package entry ([cb3a5de](https://github.com/Epoch32/visage/commit/cb3a5deffc43f901385b1067854f935d0a0ea1a4))


### Bug Fixes

* **ui:** render icon and label alongside children in BottomBarItem ([6c66cea](https://github.com/Epoch32/visage/commit/6c66ceab106d5c70af809de2647b06f1b530b848))

## [1.2.0](https://github.com/Epoch32/visage/compare/visage-v1.1.5...visage-v1.2.0) (2026-10-12)


### Features

* **vite:** rewrite lucide imports and exports into virtual icon bundles ([3dcb941](https://github.com/Epoch32/visage/commit/3dcb9413044cfd0c085eec8297ea61936c008ecd))

## [1.1.5](https://github.com/Epoch32/visage/compare/visage-v1.1.4...visage-v1.1.5) (2026-10-12)


### Bug Fixes

* **vite:** support .mdx files in visageLucide and export icons safely in virtual module ([d5383f5](https://github.com/Epoch32/visage/commit/d5383f5e909ca81a117f2d525a018d262e247e87))

## [1.1.4](https://github.com/Epoch32/visage/compare/visage-v1.1.3...visage-v1.1.4) (2026-10-12)


### Bug Fixes

* **core:** resolve reactivity cross-chunk desync, listener lifecycle, and svg class errors ([ce53bfe](https://github.com/Epoch32/visage/commit/ce53bfe3b34d49ccd175d85c28a3c8a3842429d5))

## [1.1.3](https://github.com/Epoch32/visage/compare/visage-v1.1.2...visage-v1.1.3) (2026-10-12)


### Bug Fixes

* **signals:** maintain reactivity in Context.Provider and bind active class in TabsTrigger ([14bd2ff](https://github.com/Epoch32/visage/commit/14bd2ffe1b7c30fa051104447150b841ec56ad08))
* **signals:** remove unused untrack import ([5ebd48b](https://github.com/Epoch32/visage/commit/5ebd48b7823ed129efa0228b993548c222c5e3aa))

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
