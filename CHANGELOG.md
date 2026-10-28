# Changelog

## [2.3.0](https://github.com/Epoch32/visage/compare/v2.2.0...v2.3.0) (2026-10-28)


### Features

* **rpc:** add TOO_MANY_REQUESTS (429) error code and allow procedure response headers ([e2b7072](https://github.com/Epoch32/visage/commit/e2b7072ec5717b916f5b2e30d81cb4c11c363141))


### Bug Fixes

* **io:** remove premature 300ms window blur/focus self-destruction from createFilePicker ([2005905](https://github.com/Epoch32/visage/commit/2005905b9a2978da4b37208d8f1153c9e3a1e949))
* **io:** support polymorphic options parameter in onPaste and createDropZone ([dbb6551](https://github.com/Epoch32/visage/commit/dbb6551f8a312f47aaff1717b3fba276b6b1ffd7))
* **rpc:** do not leak problem details fields into standard error payload unless negotiated ([cf7628a](https://github.com/Epoch32/visage/commit/cf7628ae1b12bc4e87102b32b97373915d7b7b58))
* **schema:** add optional() method to BooleanSchema ([cd0d627](https://github.com/Epoch32/visage/commit/cd0d62776c0989540bb152120b9e9fd6bc51c207))
* **schema:** allow object schemas with all optional fields to accept undefined input and improve error messages ([d0d2832](https://github.com/Epoch32/visage/commit/d0d28327a243065cdecb3eb9d8637c5bc33484de))
* **ui:** untrack hasTitle and hasDescription updates in Dialog to avoid reactive loops ([2b52d56](https://github.com/Epoch32/visage/commit/2b52d5675bb1278fac054d8a7036d323114c88d9))

## [2.2.0](https://github.com/Epoch32/visage/compare/v2.1.0...v2.2.0) (2026-10-22)


### Features

* **dom,vite:** add NoScript component and automated noscript fallback plugin ([4236960](https://github.com/Epoch32/visage/commit/423696068a40d8d54b32879581c9a78604295621))
* **examples:** add consumer-focused problem details decoder showcase ([6ae65f8](https://github.com/Epoch32/visage/commit/6ae65f86caf411d20b61a2343b1e2ecec4dea0ef))
* **rpc,io,form:** add multipart FormData uploads, recursive directory drops, and binary file schemas ([9135ffc](https://github.com/Epoch32/visage/commit/9135ffc6e5352ebcd83120168535e6ec0a88bc6f))
* security fixes, perforamcne improvements ([061cfe8](https://github.com/Epoch32/visage/commit/061cfe85c9dd693b70026118c883c462958dfedd))

## [2.1.0](https://github.com/Epoch32/visage/compare/v2.0.0...v2.1.0) (2026-10-20)


### Features

* **compiler:** support standard onClickCapture JSX event handler naming ([6618733](https://github.com/Epoch32/visage/commit/66187332a329557547c4c8b0bd04f5696724e934))
* **http:** implement RFC 9110 & RFC 9111 conditional requests and caching ([ff188c2](https://github.com/Epoch32/visage/commit/ff188c25cd42b95c9d7a16c505100035bed504d2))
* **http:** implement RFC 9457 Problem Details for HTTP APIs (application/problem+json) ([a6604cd](https://github.com/Epoch32/visage/commit/a6604cde78b3d27c7f601692e0394d61757c5381))
* **io:** support minSize validation in dropzone ([212a438](https://github.com/Epoch32/visage/commit/212a43840b0b913dc663c7e131db483a5177a84c))
* **router:** set aria-current="page" on active Link components ([39a7b9b](https://github.com/Epoch32/visage/commit/39a7b9bcd418ee27483014cdd4af8282a024a692))
* **vite:** add AOT compiler build summary dashboard and verbose transform diagnostics ([fa660f8](https://github.com/Epoch32/visage/commit/fa660f8d42ee8a2c14b4445efefab699a7641c04))
* **vite:** add automated build-time _headers generator for RFC 9111 & RFC 8246 ([bad5e26](https://github.com/Epoch32/visage/commit/bad5e26d93850f05479011f881e31696926ad04f))


### Bug Fixes

* **charts:** calculate bar geometry from zero-baseline dynamically ([cf63c9e](https://github.com/Epoch32/visage/commit/cf63c9eaf7004a980ad25b1d7cc3cbb62b46c78c))
* **charts:** prioritize domain value lookup over positional index in band scale ([65954f8](https://github.com/Epoch32/visage/commit/65954f862e3ffdcf87a958a53e42d21931c4e776))
* **charts:** split full circle 360-degree pie arcs to prevent blank SVG rendering ([445396e](https://github.com/Epoch32/visage/commit/445396eb33f7a41efed345364db5ed109558902e))
* **compiler:** guard nullish dynamic spread props with fallback empty object ([a9891e8](https://github.com/Epoch32/visage/commit/a9891e8d2609cae28dd25d0f292fd0adb1e58916))
* **compiler:** preserve JSX fragment children in custom components ([82e12ed](https://github.com/Epoch32/visage/commit/82e12edd427f92f5414d537056a87251d6d9c2a9))
* **compiler:** preserve raw text in JSX fragments ([372670c](https://github.com/Epoch32/visage/commit/372670c128ba1df79aa0936bc9e0d021c945de20))
* **devtools:** retain and invoke query client unsubscribe in DevToolsHub ([463dcff](https://github.com/Epoch32/visage/commit/463dcffbf936b2e156595e0040050ae9c3173d89))
* **dom:** catch InvalidStateError when reading selectionStart on non-text inputs ([a622b77](https://github.com/Epoch32/visage/commit/a622b77fdd48d2ecc6b618602f73e331dc57922b))
* **dom:** preserve sibling DOM nodes during 100% key replacement in For ([df5285e](https://github.com/Epoch32/visage/commit/df5285e9b322a3566a9fdbe292ec5e214106d528))
* **dom:** register onCleanup handlers for two-way binding input and change listeners ([2da43b8](https://github.com/Epoch32/visage/commit/2da43b8723d38fa018186a024c0a712cecff6e5b))
* **dom:** scope and dispose dynamic style object effects and unregister removed keys ([70e7dd0](https://github.com/Epoch32/visage/commit/70e7dd01f806e4a63083bfd46ad8af180a95333c))
* **form:** standardize ValidationIssue.path as string or array and export normalizeIssuePath ([020172b](https://github.com/Epoch32/visage/commit/020172bb8979a4c866630ef652d7d22e96d8565e))
* **i18n:** guard against prototype pollution in key traversal and dictionary merging ([447b09b](https://github.com/Epoch32/visage/commit/447b09b14bce291cd7149e30074b70b27d7c584d))
* **jsx:** expand SVG 2 tag registry for proper SVG namespace instantiation ([00849b5](https://github.com/Epoch32/visage/commit/00849b527125fb042690d98c14d9ba77e7c566fe))
* **native:** add configurable timeout eviction to pending IPC calls ([6b35a37](https://github.com/Epoch32/visage/commit/6b35a37ea99cc86f7f36ba371ce0dfbc7712d7d5))
* **native:** escape urgency and icon in platform.zig and add native test ([cd5b80b](https://github.com/Epoch32/visage/commit/cd5b80bfdf6e48c99d1cf614ef4ddad44673ebfb))
* **router:** strip base path prefix in useSearchParams and navigate to prevent exponential duplication ([9383e41](https://github.com/Epoch32/visage/commit/9383e410fe143da611e25487ea2d732496f2845b))
* **router:** use DOM-agnostic fallback to prevent document ReferenceError in SSR ([3988ddc](https://github.com/Epoch32/visage/commit/3988ddc4961b86faf60e88881623e42bbd8d0399))
* **rpc:** emit Access-Control-Allow-Methods and Access-Control-Allow-Headers on preflight ([c806bdb](https://github.com/Epoch32/visage/commit/c806bdb6f3c23e0e3706a2126b401f8d39452951))
* **security:** patch html-shield regex for slash separators and unquoted URLs ([95c650c](https://github.com/Epoch32/visage/commit/95c650cc1cd3d88e44cd8facf5e6761d9b4f05e1))
* **security:** return wrapped accessor function in _safeUrl for reactive signals ([422cdd4](https://github.com/Epoch32/visage/commit/422cdd4f74d73b6d7658fc2d0866a4f4e91ec9c5))
* **style:** ensure request-scoped ssr styles collect reliably in test and mock environments ([f07b1e9](https://github.com/Epoch32/visage/commit/f07b1e991dd71c1f24842e104f61b5ff38e4762f))
* **style:** scope SSR styles per request context and support clearing ([a68f0cd](https://github.com/Epoch32/visage/commit/a68f0cd495f2537210a8b3633334bc4c76e31035))
* **style:** use quote and comment aware balanced brace parsing for CSS blocks ([44045d0](https://github.com/Epoch32/visage/commit/44045d0090582c9b910051637fa7d4b77ca68c3b))
* **ui:** add aria-sort to table headers and accessible labels to DataTable checkboxes ([8cb4098](https://github.com/Epoch32/visage/commit/8cb40980d689c0d837289f7ef6dc7bc90090bc8f))
* **ui:** eliminate dangling ARIA references in Dialog and Tooltip components ([eda384c](https://github.com/Epoch32/visage/commit/eda384c0613ffb0cfad0f4e06acee15a54abb61d))
* **ui:** hide CommandEmpty when search results match ([0a5c2cc](https://github.com/Epoch32/visage/commit/0a5c2cc7ca9616aae20da5b8457c58e80138be3e))
* **ui:** implement accessible combobox semantics on CommandInput, listbox on CommandList, and option on CommandItem ([e4a75ed](https://github.com/Epoch32/visage/commit/e4a75ed5a041042e1394069975e3e66c48db14da))
* **ui:** implement focus trapping and focus restoration on Dialog and CommandDialog ([adf46c2](https://github.com/Epoch32/visage/commit/adf46c2a1e9042c0346ecc4550f978b201b40809))
* **ui:** pass row index to getRowId to prevent key collisions in DataTable ([2ae1350](https://github.com/Epoch32/visage/commit/2ae1350ff1e5dcb8e8c6e72d43ac19e404a16560))
* **ui:** remove native toggle event listener on cleanup in PopoverContent ([ccd1fea](https://github.com/Epoch32/visage/commit/ccd1feac013439bab053fe63ee4fa186a0a1c0b8))
* **ui:** remove window scroll listener on cleanup in BottomBarRoot ([0d33c82](https://github.com/Epoch32/visage/commit/0d33c82d8a583ce27137c6478df1f5aebfe8c0fa))
* **ui:** render hidden checkbox in Switch for form submissions ([ddba6ec](https://github.com/Epoch32/visage/commit/ddba6ec3dd71b5cb16e1ea8814a58e771a9256de))
* **ui:** shift focus into SelectContent on ArrowDown open ([be3df8b](https://github.com/Epoch32/visage/commit/be3df8b759293effae92f14c229405f0ce683c06))
* **ui:** use role="tablist" on BottomBarRoot to validate child tab roles ([ab4eec5](https://github.com/Epoch32/visage/commit/ab4eec5a92cd9c9c0cff299a892f8acebb26e6de))
* **vite:** auto-whitelist fonts.gstatic.com for Google Fonts and sync inline script hashes in CSP dev server headers ([81d1928](https://github.com/Epoch32/visage/commit/81d192897be9bf5db37ece86b7939e333e97212b))
* **vite:** clean up SSE stream reader and generator on client disconnect ([be2a865](https://github.com/Epoch32/visage/commit/be2a865e77239853332fc7c282ff44a392909132))
* **vite:** halt build on compiler security and syntax errors ([32c7d88](https://github.com/Epoch32/visage/commit/32c7d88815e4aad62178c668ad6be6f17504b8b2))
* **vite:** normalize Windows paths in MPA pages router and watcher ([dfd4529](https://github.com/Epoch32/visage/commit/dfd452982ded8bc43452406ee8fb80eb6fd17b28))
* **vite:** safely handle preboot body element targeting during head execution ([67a0da6](https://github.com/Epoch32/visage/commit/67a0da68dbba7d00803f9db55c6dedf99e62e198))
* **vite:** strip query parameters before matching file extensions in transformHmr ([164ad7a](https://github.com/Epoch32/visage/commit/164ad7a6201174d1a544442186cc01c5d062521c))
* **vite:** target only /assets/* by default in _headers to prevent Cloudflare header concatenation ([63eb08f](https://github.com/Epoch32/visage/commit/63eb08fcf5918ee26cc7b780fd0dab5278d80f4a))


### Performance Improvements

* **i18n:** cache Intl.PluralRules instances by locale ([f39852a](https://github.com/Epoch32/visage/commit/f39852ad5244c1d5dcc9a1ee27a2a75f18b37bc2))
* **i18n:** cache precompiled regular expressions in interpolate ([ca7aa0a](https://github.com/Epoch32/visage/commit/ca7aa0a0d60fb32403e85316019b992192cb5129))
* **ui:** disconnect global overlay listeners when closed in useDismiss ([ebb77c3](https://github.com/Epoch32/visage/commit/ebb77c3f662b740230ce85a6abaef3f5d583d1f2))

## [1.14.1](https://github.com/Epoch32/visage/compare/v1.14.0...v1.14.1) (2026-10-18)


### Bug Fixes

* **security:** enforce origin validation in CORS headers to prevent origin reflection ([e6089b9](https://github.com/Epoch32/visage/commit/e6089b9a7e7434eeb1eb8329e6c685c04f08be6a))

## [1.14.0](https://github.com/Epoch32/visage/compare/v1.13.1...v1.14.0) (2026-10-17)


### Features

* **native:** add custom window borders, frameless decorations, and drag regions on Linux GTK ([450099b](https://github.com/Epoch32/visage/commit/450099bbcdede23637a1431d2e5727ccd3aec297))
* **native:** add native OS dialogs, desktop notifications, and fix AOT compiler text child indexing ([1d331d4](https://github.com/Epoch32/visage/commit/1d331d4ff4b96ef209bdf58e76ed99ab4afc7a3a))
* **pages:** bundle real multi-page JS chunks and enable soft navigation with View Transitions ([1436cc9](https://github.com/Epoch32/visage/commit/1436cc9da657814150c2d42a03e1630e8be8e5bf))
* **pages:** support headTags in PagesOptions and enable Link prefetching across mpa-pages ([c03fb18](https://github.com/Epoch32/visage/commit/c03fb181b962efc4ae69dfe1130d4ce59a795787))


### Bug Fixes

* **pages:** resolve preview server clean URLs, mount recycling, and DOM cleanup in MPA soft nav ([b5825c5](https://github.com/Epoch32/visage/commit/b5825c52bd38375b5be13bbe06374381f84e9783))

## [1.13.1](https://github.com/Epoch32/visage/compare/v1.13.0...v1.13.1) (2026-10-17)


### Bug Fixes

* **ci:** remove tsconfig from api-showcase so unit test SSR uses root path mappings ([067cb9c](https://github.com/Epoch32/visage/commit/067cb9c47fbf0dc255f494eca955112603db4aff))
* **test:** update jsxImportSource to @epoch32/visage and use real package in api-showcase App ([511c60d](https://github.com/Epoch32/visage/commit/511c60dbcfaccc242a150c96e20e8a1f01c99953))
* **vite:** use function invocations instead of raw JSX in pages entry generator ([4cc957d](https://github.com/Epoch32/visage/commit/4cc957dc5e64c7d8650f425e1bf29cdad73942a9))

## [1.13.0](https://github.com/Epoch32/visage/compare/v1.12.0...v1.13.0) (2026-10-17)


### Features

* **examples:** add 256x256 BML traffic simulation showcase ([1ad54e8](https://github.com/Epoch32/visage/commit/1ad54e80619104d9344af55fcbae976824fc587a))
* **router:** add native View Transitions API support to Router, Link, and useNavigate ([f7b8ffa](https://github.com/Epoch32/visage/commit/f7b8ffa6e23805f44db7bb76d78749858bddd7a8))
* **router:** add speculative prefetching via Speculation Rules API and Link prefetch prop ([3f00299](https://github.com/Epoch32/visage/commit/3f00299e6af8411ba1dacc24f94b701e8efc3f42))
* **ui:** add native Popover API and CSS Anchor Positioning to Popover and Tooltip ([948b22e](https://github.com/Epoch32/visage/commit/948b22e183debf70266ccad10a71483eb2063d80))
* **vite:** add experimental storagePreboot transform and modularize plugin pipeline ([e3b7a73](https://github.com/Epoch32/visage/commit/e3b7a738aca748146ef85f9c4ba5451c34aa62b2))
* **vite:** add file-system driven MPA pages router ([f0ad8bc](https://github.com/Epoch32/visage/commit/f0ad8bc97b44d42de3a1c4b386a67463a00d03be))

## [1.12.0](https://github.com/Epoch32/visage/compare/v1.11.0...v1.12.0) (2026-10-17)


### Features

* **compiler:** inline static class arrays/objects into HTML templates and omit null attributes ([8c8499b](https://github.com/Epoch32/visage/commit/8c8499b002cb1fa854d1761bab23a92dae97abcc))
* **compiler:** inline static style objects into HTML templates at compile time ([5b1b66f](https://github.com/Epoch32/visage/commit/5b1b66f8563ae3709028e04fa84e467d3f01b4ed))
* **compiler:** normalize JSX attribute aliases and format boolean and aria/data attributes ([c00af9d](https://github.com/Epoch32/visage/commit/c00af9d4c839114c86692cd280fe81621d7d6d73))
* **server:** implement true DOM hydration adopting server-rendered nodes ([5f105f9](https://github.com/Epoch32/visage/commit/5f105f99302157498303b37330b59264daf6b3bb))


### Bug Fixes

* **compiler:** escape static string and number expression values in static attributes ([83a98de](https://github.com/Epoch32/visage/commit/83a98de60b5bd902021cac85a6b5fb9c4b5e7d54))
* **compiler:** support arbitrary nesting depth in component member expressions ([4bb4383](https://github.com/Epoch32/visage/commit/4bb4383b4d7f0d066156b5197161c1316e2eccbd))
* **dom:** prevent event listener leaks and support listener updates in setAttribute ([943d298](https://github.com/Epoch32/visage/commit/943d298bff3ebfaf324cdb5102e2ff91478be65f))
* **router:** escape regex characters, cache compiled routes, and unregister on unmount ([e5453d3](https://github.com/Epoch32/visage/commit/e5453d3e3061654ad4533e674df936c95db33cb5))
* **style:** adopt existing SSR style tags in styleManager to eliminate duplicate injections ([1c88fe0](https://github.com/Epoch32/visage/commit/1c88fe022c80584a571634b72d0b72ded4a2ced6))
* **template:** support SVG elements and table sections in template parsing ([e8ff8f6](https://github.com/Epoch32/visage/commit/e8ff8f67e426c89335aca1528760d620a9ea969b))
* **types:** install @types/bun, configure tsconfig types, and accept FetchFn in client options ([fb9fc68](https://github.com/Epoch32/visage/commit/fb9fc68918dc17de4895f667cc27a15ea804a2b9))


### Performance Improvements

* **compiler:** inline return block statements to eliminate IIFE wrapper closures ([77de293](https://github.com/Epoch32/visage/commit/77de293d55aa3a46fd655055bded00ecb5011a91))
* **query:** fast-path primitive query key serialization and avoid reduce allocations in hashKey ([4020317](https://github.com/Epoch32/visage/commit/4020317c85f2a0a60b7053bb44a84db55d0f4e18))
* **signals:** apply inline slot optimization to Computed dependencies and subscribers ([4cec314](https://github.com/Epoch32/visage/commit/4cec314780ba2454ca0aa78e3c621748b6633fcb))
* **signals:** eliminate transient Set allocations in createSelector cleanup ([1b07ffb](https://github.com/Epoch32/visage/commit/1b07ffb36fe0948d8bd6f09f8e65e04bb232aa98))
* **ui:** memoize DataTable queries with computed and key rows by getRowId in For ([5f77df4](https://github.com/Epoch32/visage/commit/5f77df4afc2dafe28ef24d4cbb605af6aec7a131))
* **virtual:** eliminate reactive cell style closures and support getItemKey in VirtualGrid ([69d3877](https://github.com/Epoch32/visage/commit/69d38772186c062d3ebbeefd4e07a0fdec96d865))
* **virtual:** key VirtualList rows by item key to preserve DOM elements across scrolling ([2000c8d](https://github.com/Epoch32/visage/commit/2000c8dc27d205bfb8035cc50a28f820b98cccec))
* **vite:** bypass heavy AST compilation for files without URL patterns during CSP origin scan ([af42cab](https://github.com/Epoch32/visage/commit/af42cab548f57674c87550d6e9d51b28f6dee158))

## [1.11.0](https://github.com/Epoch32/visage/compare/v1.10.0...v1.11.0) (2026-10-16)


### Features

* add devtools, scoped css engine, vite plugin, and ergonomic rpc queries/mutations ([5300247](https://github.com/Epoch32/visage/commit/5300247da434bbc53e521907ca49372811d54a33))
* **api:** add file-based API router with directive pragma middleware cascades ([40d7cc7](https://github.com/Epoch32/visage/commit/40d7cc716dc9b8464e385c6ac1cc023ba75ab355))
* **build:** export compiled bundles and d.ts declarations with vite alias support ([4d44bd4](https://github.com/Epoch32/visage/commit/4d44bd493c7edd788095367b914b05d81308ead9))
* **charts:** add charts showcase, monotone spline curves, and compiler-level jsxImportSource ([4f506ca](https://github.com/Epoch32/visage/commit/4f506ca13562f328e15a349e2b2e4826d2d81bc4))
* **charts:** add composable fine-grained reactive charts module (Chart, Line, Area, Bar, Pie, Axis, Grid, Tooltip) ([1695450](https://github.com/Epoch32/visage/commit/16954507b83b2b2c77c3994de64f531a9e554da3))
* **compiler:** add AOT JSX compiler with static template hoisting and event delegation ([03c949a](https://github.com/Epoch32/visage/commit/03c949a956028d51ee917d7360ceb2efe3ed8d04))
* **compiler:** add experimental security transforms suite ([0948961](https://github.com/Epoch32/visage/commit/094896198c9b83edda88665fae41a07dc19fc249))
* **devtools, ui:** add Live DAG dependency visualizer, &lt;Command /&gt; palette, and &lt;DataTable /&gt; primitives ([609ebf3](https://github.com/Epoch32/visage/commit/609ebf3f5f5f0cef4a5511ffe7b5979c60d184d8))
* **dom, devtools:** add lazy component loader and redesign DAG visualizer ([37c2a9f](https://github.com/Epoch32/visage/commit/37c2a9fbaad5149661d33793915a9e1d55a9c763))
* **dom:** add 'by' key extractor to For component for stable item reconciliation ([e838671](https://github.com/Epoch32/visage/commit/e838671b593841451b9975541309c4f25e51a0c9))
* **dom:** add first-class two-way form bindings (bind:value and bind:checked) ([3bca5f0](https://github.com/Epoch32/visage/commit/3bca5f0a5df612ee040c0399d1dc042c0fc6d922))
* **dom:** add Index component for position-indexed list rendering ([af45e40](https://github.com/Epoch32/visage/commit/af45e40ba2ffca981747a3e440f986088ac49b16))
* **dom:** implement event delegation and primitive text child rendering ([f72285f](https://github.com/Epoch32/visage/commit/f72285f041ceced4bd3db2f568f4fa278d44f56a))
* **examples:** add full-stack visage/api showcase with directive middleware cascades and SSE ([8a0faae](https://github.com/Epoch32/visage/commit/8a0faae9ae84b4b3953e42823de32392e738cbe0))
* **form:** add optional() to ObjectSchema and add v.record() and v.any() ([1692080](https://github.com/Epoch32/visage/commit/1692080d12b85e3e2b79798f5684461afc9d4b0d))
* **i18n:** add fine-grained localization engine with Crowdin/Weblate sync ([516cafa](https://github.com/Epoch32/visage/commit/516cafae8d74d93999caf407b7222d09bb573d57))
* initial commit for visage - zero-vdom fine-grained reactive UI library ([31e8905](https://github.com/Epoch32/visage/commit/31e8905b81ed0dccfb741dc9c7bee31a68aa0dfd))
* **io:** add reactive drag-and-drop, clipboard, file picker primitives and showcase tab ([38a0b98](https://github.com/Epoch32/visage/commit/38a0b98455f2c331c9d95b078c8dfc464f94be22))
* **native:** add experimental zig desktop compilation target and native ipc bridge ([6fc38bd](https://github.com/Epoch32/visage/commit/6fc38bd70cce05145cc7ae0f6585a68786d9dc20))
* **query:** implement signal-native server state and cache management (visage/query) ([d44793b](https://github.com/Epoch32/visage/commit/d44793bafc205ebad318df301718cfc6ad9682d3))
* release 0.1.0 - typed api client, formalized docs, and reactive submodules ([7973f6c](https://github.com/Epoch32/visage/commit/7973f6cffa26fecd2b396987156732c79cf7dd20))
* **rpc:** add declarative route rules, header injection, and guard support ([35a2863](https://github.com/Epoch32/visage/commit/35a2863219a3c72cbe66c9ccb3c93498522b6669))
* **rpc:** implement type-safe RPC and wire protocol (visage/rpc) ([602fe83](https://github.com/Epoch32/visage/commit/602fe8352e174ea6265c7eef4509130efb7a2208))
* **rpc:** support both function shorthand and options object with resolve in query/mutation ([86c0b57](https://github.com/Epoch32/visage/commit/86c0b572be7d3ef4e9b68fcfe2368be2f8a3d404))
* **signals:** add createSelector primitive with inline subscriber slots ([4e62247](https://github.com/Epoch32/visage/commit/4e622474324bfbdaba5e14789863b54abd38f44a))
* **signals:** add cyclic update detection and infinite loop circuit breaker ([ef69662](https://github.com/Epoch32/visage/commit/ef696627976c1f8c99eed7017cf1e255992bd18a))
* **signals:** add first-class signal persistence with PersistOptions ([b0251b7](https://github.com/Epoch32/visage/commit/b0251b7a8ff523584e2a63c588f946faf3488973))
* **style:** add Spatial Engine, direct signal-to-style binding, and semantic layout primitives (&lt;Stack&gt;, &lt;Row&gt;, &lt;Center&gt;, &lt;Grid&gt;, &lt;Spacer&gt;) ([d60eaaf](https://github.com/Epoch32/visage/commit/d60eaaf35a1ccbc52605789fa212b4a7aaee261e))
* **template:** add table element wrapping and cached node cloning ([d89f9bb](https://github.com/Epoch32/visage/commit/d89f9bba56cc22437f09eecb4310c9a76d410136))
* **ui:** add accessible headless UI primitives (Dialog, Tabs, Popover, DropdownMenu, Accordion, Switch, Tooltip, Toast) ([2ce4888](https://github.com/Epoch32/visage/commit/2ce48886eb6713163cb82e624ca0085f770256cd))
* **ui:** add accessible Select and Slider primitives with showcase fixes ([bd33288](https://github.com/Epoch32/visage/commit/bd33288c75edd15aa6ab68d21a8939e7ecf7ea14))
* **ui:** add modular BottomBar mobile toolbar primitives ([8694a35](https://github.com/Epoch32/visage/commit/8694a352e05a4babec2670213f1cf712aa6452e4))
* **ui:** enhance UI primitives with shorthands and add enterprise auth showcase ([f9f1b5e](https://github.com/Epoch32/visage/commit/f9f1b5e844488e5519a9442a08aea07fd4e8eedc))
* **ui:** export BottomBar primitives from root package entry ([cb3a5de](https://github.com/Epoch32/visage/commit/cb3a5deffc43f901385b1067854f935d0a0ea1a4))
* **ui:** re-export Command, DataTable, createIcon from root index ([0ebc5ae](https://github.com/Epoch32/visage/commit/0ebc5ae303dc719b2adb7735d33b677293d71540))
* **vite:** add experimental Content Security Policy generator and injector ([f0c1ed8](https://github.com/Epoch32/visage/commit/f0c1ed8086c361f45ad75a20108f08e247760a01))
* **vite:** add picocolors standardized subsystem logging to compiler and plugins ([90ab0ee](https://github.com/Epoch32/visage/commit/90ab0ee8cbbe5c28589aad798327d4003c06471a))
* **vite:** add separate visageLucide Vite plugin for build-time icon translation ([8ec45e6](https://github.com/Epoch32/visage/commit/8ec45e63a6643ba2747a86826a7a127a8258afff))
* **vite:** include 'lucide' by default in visageLucide aliases ([e544316](https://github.com/Epoch32/visage/commit/e5443162cd62b106fa938a9fc35467079c65bde0))
* **vite:** rewrite lucide imports and exports into virtual icon bundles ([3dcb941](https://github.com/Epoch32/visage/commit/3dcb9413044cfd0c085eec8297ea61936c008ecd))
* **vite:** support explicit virtualOrigin and exact script hashing in CSP for native webviews ([3a6d27a](https://github.com/Epoch32/visage/commit/3a6d27ae73837e568bf80a6ea33ffd154e09d701))


### Bug Fixes

* add explicit jsxImportSource pragma to tsx library files ([561c06b](https://github.com/Epoch32/visage/commit/561c06bab145e66256b05b1c658dd8e8601b7252))
* **build:** add external node:* flag to preserve Node.js builtins in bundled Vite plugin ([d38168c](https://github.com/Epoch32/visage/commit/d38168cacf77437a7e08d69d5b0a6533ac2f95e2))
* **charts:** prevent duplicate series registration and add benchmark showcase ([06b09ee](https://github.com/Epoch32/visage/commit/06b09ee051f4399a5c465c628de42161de7b4481))
* copy jsx.d.ts to dist/jsx-runtime on build ([14c16ec](https://github.com/Epoch32/visage/commit/14c16ec3f94e2d30d9156f1213208cf2ce49d031))
* **core:** resolve reactivity cross-chunk desync, listener lifecycle, and svg class errors ([ce53bfe](https://github.com/Epoch32/visage/commit/ce53bfe3b34d49ccd175d85c28a3c8a3842429d5))
* **devtools:** mark internal UI and devtools signals as internal to avoid DAG pollution ([695983a](https://github.com/Epoch32/visage/commit/695983a7b41f098c09abe389c04b0010aca3d5a9))
* **dom:** anchor Show marker before effect and support function fallback ([a754187](https://github.com/Epoch32/visage/commit/a754187971de820cf91578304a7c4b2fd840ba5a))
* **dom:** preserve input selection range and avoid redundant value assignment ([eec4cd0](https://github.com/Epoch32/visage/commit/eec4cd07ad1c26a650452515531858476ae94b02))
* **dom:** untrack child rendering in Show and For to preserve item event handlers ([c48cbda](https://github.com/Epoch32/visage/commit/c48cbdac7fe687cf9f6c974b9c1cd63a490767b5))
* **rpc:** gracefully fallback baseUrl to endpoint or default /api/rpc in createClient ([41f22ae](https://github.com/Epoch32/visage/commit/41f22ae3897f77bf941869ac977dc7d744a4452d))
* **signals:** check window, globalThis, and storage identifier for localStorage ([784d568](https://github.com/Epoch32/visage/commit/784d568d1971b6bb980451c4790c42ca6f22ae2e))
* **signals:** deduplicate cyclic update warning to prevent console spam ([1f46bc9](https://github.com/Epoch32/visage/commit/1f46bc95afc7a93d0d31c502136031320c1748bb))
* **signals:** maintain reactivity in Context.Provider and bind active class in TabsTrigger ([14bd2ff](https://github.com/Epoch32/visage/commit/14bd2ffe1b7c30fa051104447150b841ec56ad08))
* **signals:** remove unused untrack import ([5ebd48b](https://github.com/Epoch32/visage/commit/5ebd48b7823ed129efa0228b993548c222c5e3aa))
* support class and className to prevent issues around active/inactive elements  ([#15](https://github.com/Epoch32/visage/issues/15)) ([600bb06](https://github.com/Epoch32/visage/commit/600bb06350b783ca069b3563ea638907ecae2991))
* **test:** safely mock URL methods without clobbering global constructor ([d78b2de](https://github.com/Epoch32/visage/commit/d78b2deb02e59c8dbab8600e49149de334c85276))
* **ui:** add global window escape listener in useDismiss primitive ([#17](https://github.com/Epoch32/visage/issues/17)) ([0d1da54](https://github.com/Epoch32/visage/commit/0d1da547f043a348df8849e36447445080c47308))
* **ui:** render icon and label alongside children in BottomBarItem ([6c66cea](https://github.com/Epoch32/visage/commit/6c66ceab106d5c70af809de2647b06f1b530b848))
* various core engine bug fixes ([#12](https://github.com/Epoch32/visage/issues/12)) ([ce04950](https://github.com/Epoch32/visage/commit/ce04950e2c25db9d138e85074b151f488906e244))
* **vite:** avoid TypeScript type assertion in injected HMR footer ([62144c1](https://github.com/Epoch32/visage/commit/62144c171c8f8b597d1f49c9a34b2b30405f1566))
* **vite:** exclude visage packages from optimizeDeps to prevent react/jsx-runtime pre-bundling ([0c6c787](https://github.com/Epoch32/visage/commit/0c6c787844eeda5bc6fcd7627ab85527cef2f11c))
* **vite:** pre-scan project JSX and HTML for CSP origins and update native demo ([d7457a1](https://github.com/Epoch32/visage/commit/d7457a145c0117edfb496ed83463967adc17ce75))
* **vite:** support .mdx files in visageLucide and export icons safely in virtual module ([d5383f5](https://github.com/Epoch32/visage/commit/d5383f5e909ca81a117f2d525a018d262e247e87))
* **vite:** use oxc configuration for Vite 8 without esbuild deprecation warning ([4eac7bf](https://github.com/Epoch32/visage/commit/4eac7bfa4ab16105886cee3437865167d240dd61))


### Performance Improvements

* **dom:** implement zero-allocation event tuples and pre-cloned text node reuse ([164451e](https://github.com/Epoch32/visage/commit/164451e184c7362eba9ddb448312858cd694f2fb))
* **signals:** optimize signals and effects with inline slots and shared prototypes ([1774a99](https://github.com/Epoch32/visage/commit/1774a99a256f7a929e7ef03a3a97fd4301c81b0e))

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
