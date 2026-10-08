import { For, Show } from "../dom";
import { onCleanup, signal } from "../signals";
import { Style } from "../style";
import { setupDomMutationHighlighter } from "./highlighter";
import { devtoolsHub } from "./hub";
import type { DevToolsOptions } from "./types";

export function VisageDevTools(props: DevToolsOptions = {}) {
  const hub = devtoolsHub;
  if (props.initialOpen !== undefined) {
    hub.isOpen.set(props.initialOpen);
  }
  if (props.initialTab !== undefined) {
    hub.activeTab.set(props.initialTab);
  }
  if (props.highlightDOM !== undefined) {
    hub.highlightDOM.set(props.highlightDOM);
  }

  // Set up real-time visual DOM mutation highlighting
  setupDomMutationHighlighter(() => hub.highlightDOM());

  const selectedId = signal<string | null>(null, { internal: true });

  const selectedSignal = () => {
    const id = selectedId();
    if (!id) return null;
    return hub.signalsList().find((s) => s.id === id) ?? null;
  };

  const selectedQuery = () => {
    const id = selectedId();
    if (!id) return null;
    return hub.queriesList().find((q) => q.hash === id) ?? null;
  };

  const selectedRpc = () => {
    const id = selectedId();
    if (!id) return null;
    return hub.rpcLogs().find((r) => r.id === id) ?? null;
  };

  // Keyboard shortcut: Shift + Alt + V to toggle DevTools
  if (typeof window !== "undefined") {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        hub.toggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  }

  const formatJSON = (val: any) => {
    try {
      if (val === undefined) return "undefined";
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  const filteredSignals = () => {
    const q = hub.searchQuery().toLowerCase().trim();
    if (!q) return hub.signalsList();
    return hub.signalsList().filter((s) => s.name.toLowerCase().includes(q));
  };

  const filteredQueries = () => {
    const q = hub.searchQuery().toLowerCase().trim();
    if (!q) return hub.queriesList();
    return hub.queriesList().filter((qr) => JSON.stringify(qr.key).toLowerCase().includes(q));
  };

  const filteredRpc = () => {
    const q = hub.searchQuery().toLowerCase().trim();
    if (!q) return hub.rpcLogs();
    return hub.rpcLogs().filter((r) => r.path.toLowerCase().includes(q));
  };

  return (
    <div class="visage-devtools-root">
      {/* Floating Launcher Trigger Badge */}
      <button
        type="button"
        class={["visage-devtools-trigger", { open: () => hub.isOpen() }]}
        onClick={() => hub.toggle()}
        title="Toggle Visage DevTools (Shift + Alt + V)"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          role="img"
          aria-label="Visage Logo"
        >
          <title>Visage Logo</title>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span>Visage</span>
        <span class="badge-count">{() => hub.signalsList().length + hub.queriesList().length}</span>
      </button>

      {/* Expanded DevTools Drawer Panel */}
      <Show when={() => hub.isOpen()}>
        <div class="visage-devtools-panel">
          {/* Header Bar */}
          <div class="devtools-header">
            <div class="header-brand">
              <span class="brand-title">Visage Inspector</span>
              <span class="brand-version">v0.1.0</span>
            </div>

            {/* Tab Navigation */}
            <div class="devtools-tabs">
              <button
                type="button"
                class={["tab-btn", { active: () => hub.activeTab() === "signals" }]}
                onClick={() => {
                  hub.setTab("signals");
                  selectedId.set(null);
                }}
              >
                Signals <span class="tab-count">{() => hub.signalsList().length}</span>
              </button>
              <button
                type="button"
                class={["tab-btn", { active: () => hub.activeTab() === "query" }]}
                onClick={() => {
                  hub.setTab("query");
                  selectedId.set(null);
                }}
              >
                Query Cache <span class="tab-count">{() => hub.queriesList().length}</span>
              </button>
              <button
                type="button"
                class={["tab-btn", { active: () => hub.activeTab() === "rpc" }]}
                onClick={() => {
                  hub.setTab("rpc");
                  selectedId.set(null);
                }}
              >
                RPC & SSE <span class="tab-count">{() => hub.rpcLogs().length}</span>
              </button>
              <button
                type="button"
                class={["tab-btn", { active: () => hub.activeTab() === "concepts" }]}
                onClick={() => {
                  hub.setTab("concepts");
                  selectedId.set(null);
                }}
              >
                Guide & Concepts
              </button>
            </div>

            {/* Filter Search */}
            <div class="devtools-search">
              <input
                type="text"
                placeholder="Filter items..."
                value={hub.searchQuery}
                onInput={(e: any) => hub.searchQuery.set(e.target.value)}
              />
            </div>

            {/* Controls */}
            <div class="devtools-actions">
              <button
                type="button"
                class={["btn-toggle-highlight", { active: () => hub.highlightDOM() }]}
                onClick={() => hub.highlightDOM.update((v) => !v)}
                title="Highlight DOM element mutations"
              >
                Highlight DOM
              </button>
              <button
                type="button"
                class="btn-close"
                onClick={() => hub.isOpen.set(false)}
                title="Close DevTools"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Main Body Content */}
          <div class="devtools-body">
            {/* TAB 1: Signals Inspector */}
            <Show when={() => hub.activeTab() === "signals"}>
              <div class="panel-layout">
                <div class="panel-list">
                  <For
                    each={filteredSignals}
                    fallback={<div class="empty-hint">No signals registered yet.</div>}
                  >
                    {(sig) => (
                      <button
                        type="button"
                        class={["item-row", { active: () => selectedId() === sig.id }]}
                        onClick={() => selectedId.set(sig.id)}
                      >
                        <div class="item-title">
                          <span class={["type-pill", sig.type]}>{sig.type}</span>
                          <span class="name">{sig.name}</span>
                        </div>
                        <div class="item-meta">
                          <span class="version">v{() => sig.version()}</span>
                          <span class="val-preview">{() => String(sig.getValue())}</span>
                        </div>
                      </button>
                    )}
                  </For>
                </div>
                <div class="panel-detail">
                  <Show
                    when={selectedSignal}
                    fallback={
                      <div class="empty-hint">
                        Select a signal to inspect its live reactive state, or open{" "}
                        <strong>Guide & Concepts</strong> to learn more.
                      </div>
                    }
                  >
                    {(sig) => (
                      <div class="detail-content">
                        <h4>{() => sig().name}</h4>

                        {/* Signal vs Computed Contextual Callout */}
                        <div class={["concept-callout", () => sig().type]}>
                          <Show when={() => sig().type === "signal"}>
                            <div>
                              <strong>Writable Signal (Root State):</strong> Holds mutable
                              application state. Updated via <code>.set()</code> or{" "}
                              <code>.update()</code> to push fine-grained updates directly to
                              subscribed DOM nodes.
                            </div>
                          </Show>
                          <Show when={() => sig().type === "computed"}>
                            <div>
                              <strong>Derived Computed (Memoized Calculation):</strong> Pure
                              read-only formula derived from other signals. Evaluates lazily
                              on-demand, caches the result, and recomputes glitch-free.
                            </div>
                          </Show>
                        </div>

                        <div class="detail-props">
                          <div class="prop-line">
                            <strong>Type:</strong> <span>{() => sig().type}</span>
                          </div>
                          <div class="prop-line">
                            <strong>Mutations:</strong> <span>v{() => sig().version()}</span>
                          </div>
                          <div class="prop-line">
                            <strong>Current Value:</strong>
                          </div>
                          <pre class="json-box">{() => formatJSON(sig().getValue())}</pre>
                        </div>
                      </div>
                    )}
                  </Show>
                </div>
              </div>
            </Show>

            {/* TAB 2: Query Cache Inspector */}
            <Show when={() => hub.activeTab() === "query"}>
              <div class="panel-layout">
                <div class="panel-list">
                  <For
                    each={filteredQueries}
                    fallback={<div class="empty-hint">No active queries in cache.</div>}
                  >
                    {(qr) => (
                      <button
                        type="button"
                        class={["item-row", { active: () => selectedId() === qr.hash }]}
                        onClick={() => selectedId.set(qr.hash)}
                      >
                        <div class="item-title">
                          <span class={["status-pill", qr.status()]}>{() => qr.status()}</span>
                          <span class="name">{JSON.stringify(qr.key)}</span>
                        </div>
                        <div class="item-meta">
                          <span class="fetch-status">{() => qr.fetchStatus()}</span>
                        </div>
                      </button>
                    )}
                  </For>
                </div>
                <div class="panel-detail">
                  <Show
                    when={selectedQuery}
                    fallback={<div class="empty-hint">Select a query to inspect.</div>}
                  >
                    {(qr) => (
                      <div class="detail-content">
                        <h4>{() => JSON.stringify(qr().key)}</h4>
                        <div class="detail-actions">
                          <button type="button" class="action-btn" onClick={() => qr().refetch?.()}>
                            Refetch Now
                          </button>
                          <button
                            type="button"
                            class="action-btn"
                            onClick={() => qr().invalidate?.()}
                          >
                            Invalidate Cache
                          </button>
                        </div>
                        <div class="detail-props">
                          <div class="prop-line">
                            <strong>Status:</strong>{" "}
                            {() => `${qr().status()} (${qr().fetchStatus()})`}
                          </div>
                          <div class="prop-line">
                            <strong>Updated:</strong>{" "}
                            {() =>
                              qr().dataUpdatedAt()
                                ? new Date(qr().dataUpdatedAt()).toLocaleTimeString()
                                : "Never"
                            }
                          </div>
                          <div class="prop-line">
                            <strong>Cached Data:</strong>
                          </div>
                          <pre class="json-box">{() => formatJSON(qr().data())}</pre>
                        </div>
                      </div>
                    )}
                  </Show>
                </div>
              </div>
            </Show>

            {/* TAB 3: RPC & SSE Network */}
            <Show when={() => hub.activeTab() === "rpc"}>
              <div class="panel-layout">
                <div class="panel-list">
                  <For
                    each={filteredRpc}
                    fallback={<div class="empty-hint">No RPC network activity logged.</div>}
                  >
                    {(r) => (
                      <button
                        type="button"
                        class={["item-row", { active: () => selectedId() === r.id }]}
                        onClick={() => selectedId.set(r.id)}
                      >
                        <div class="item-title">
                          <span class={["type-pill", r.type]}>{r.type}</span>
                          <span class="name">{r.path}</span>
                        </div>
                        <div class="item-meta">
                          <span class={["status-pill", r.status]}>{r.status}</span>
                          {r.duration !== undefined && <span class="duration">{r.duration}ms</span>}
                        </div>
                      </button>
                    )}
                  </For>
                </div>
                <div class="panel-detail">
                  <Show
                    when={selectedRpc}
                    fallback={<div class="empty-hint">Select an RPC event to inspect.</div>}
                  >
                    {(r) => (
                      <div class="detail-content">
                        <h4>{() => `${r().type.toUpperCase()}: ${r().path}`}</h4>
                        <div class="detail-props">
                          <div class="prop-line">
                            <strong>Status:</strong> {() => r().status}
                          </div>
                          <div class="prop-line">
                            <strong>Time:</strong>{" "}
                            {() => new Date(r().startTime).toLocaleTimeString()}
                          </div>
                          <div class="prop-line">
                            <strong>Input Payload:</strong>
                          </div>
                          <pre class="json-box">{() => formatJSON(r().input)}</pre>

                          <Show when={() => r().response !== undefined}>
                            <div class="prop-line">
                              <strong>Response:</strong>
                            </div>
                            <pre class="json-box">{() => formatJSON(r().response)}</pre>
                          </Show>

                          <Show when={() => (r().events?.length ?? 0) > 0}>
                            <div class="prop-line">
                              <strong>SSE Live Events ({() => r().events?.length ?? 0}):</strong>
                            </div>
                            <pre class="json-box">{() => formatJSON(r().events)}</pre>
                          </Show>
                        </div>
                      </div>
                    )}
                  </Show>
                </div>
              </div>
            </Show>

            {/* TAB 4: Concepts & Architecture Guide */}
            <Show when={() => hub.activeTab() === "concepts"}>
              <div class="concepts-view">
                <div class="concepts-header">
                  <h3>⚡ Visage Reactive Architecture & Primitives Guide</h3>
                  <p>
                    Fine-grained reactive signals, zero-VDOM direct DOM manipulation, deterministic
                    query caching, and end-to-end type-safe wire protocols.
                  </p>
                </div>

                <div class="concepts-grid">
                  {/* Card 1: signal vs computed */}
                  <div class="concept-card highlight">
                    <div class="card-badge-row">
                      <span class="type-pill signal">signal(value)</span>
                      <span class="badge-vs">vs</span>
                      <span class="type-pill computed">computed(fn)</span>
                    </div>
                    <h4>Reactivity: State vs Derived Computation</h4>
                    <p class="card-desc">
                      The core distinction that powers fine-grained reactive applications:
                    </p>
                    <div class="comparison-table">
                      <div class="comp-col">
                        <span class="comp-title signal-color">Writable Signal</span>
                        <ul>
                          <li>
                            <strong>Root State:</strong> Holds primary application data.
                          </li>
                          <li>
                            <strong>Direct Mutation:</strong> Updated via <code>.set()</code> or{" "}
                            <code>.update()</code>.
                          </li>
                          <li>
                            <strong>Eager Push:</strong> Pushes updates directly to subscribed DOM
                            nodes.
                          </li>
                        </ul>
                      </div>
                      <div class="comp-col">
                        <span class="comp-title computed-color">Derived Computed</span>
                        <ul>
                          <li>
                            <strong>Calculated Value:</strong> Pure formula derived from other
                            signals.
                          </li>
                          <li>
                            <strong>Read-Only:</strong> Cannot be set manually; updates on
                            dependency change.
                          </li>
                          <li>
                            <strong>Lazy & Memoized:</strong> Evaluates once on demand, caches until
                            dirty.
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div class="code-compare">
                      <pre class="code-box">{`// 1. Writable State
const price = signal(100);

// 2. Derived Calculation (Memoized)
const withTax = computed(() => price() * 1.15);`}</pre>
                    </div>
                  </div>

                  {/* Card 2: visage/query Cache */}
                  <div class="concept-card">
                    <div class="card-badge-row">
                      <span class="type-pill query">visage/query</span>
                    </div>
                    <h4>Deterministic Query Cache</h4>
                    <p class="card-desc">
                      Asynchronous data synchronization with automatic deduplication, garbage
                      collection, and hierarchical prefix invalidation.
                    </p>
                    <ul class="concept-points">
                      <li>
                        <strong>Deterministic Hashing:</strong> Query keys like{" "}
                        <code>{"['user', { id: 1 }]"}</code> hash identically regardless of key
                        order.
                      </li>
                      <li>
                        <strong>Fine-Grained Invalidation:</strong>{" "}
                        <code>{"cache.invalidateQueries(['surveys'])"}</code> invalidates all
                        matching sub-queries.
                      </li>
                      <li>
                        <strong>Zero Polling Bloat:</strong> Automatic observer reference counting
                        cleans up unobserved queries.
                      </li>
                    </ul>
                  </div>

                  {/* Card 3: visage/rpc Protocol */}
                  <div class="concept-card">
                    <div class="card-badge-row">
                      <span class="type-pill subscription">visage/rpc</span>
                    </div>
                    <h4>Type-Safe RPC Wire Protocol</h4>
                    <p class="card-desc">
                      Zero-codegen end-to-end fullstack RPC built on standard Web Fetch, JSON-RPC
                      batching, and Server-Sent Events.
                    </p>
                    <ul class="concept-points">
                      <li>
                        <strong>Pure TypeScript Types:</strong> Client proxy transparently inherits
                        input schemas and return types.
                      </li>
                      <li>
                        <strong>Batching Engine:</strong> Parallel client queries combine
                        automatically into a single HTTP request.
                      </li>
                      <li>
                        <strong>Streaming Subscriptions:</strong> Real-time asynchronous generator
                        streams via native SSE.
                      </li>
                    </ul>
                  </div>

                  {/* Card 4: DOM Mutation Highlighter */}
                  <div class="concept-card">
                    <div class="card-badge-row">
                      <span class="type-pill dom-pill">Highlight DOM</span>
                    </div>
                    <h4>Fine-Grained DOM Inspection</h4>
                    <p class="card-desc">
                      Visualizer demonstrating zero-VDOM reactivity in real time.
                    </p>
                    <ul class="concept-points">
                      <li>
                        <strong>Direct DOM Mutation:</strong> When a signal changes, Visage only
                        updates the exact Text node or attribute.
                      </li>
                      <li>
                        <strong>Visual Feedback:</strong> Enable <strong>Highlight DOM</strong> to
                        see instantaneous cyan flashes on mutated elements without full component
                        re-renders.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* Component Scoped Styles */}
      <Style>{`
        .visage-devtools-root {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 999999;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          color: #f8fafc;
        }
        .visage-devtools-trigger {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0f172a;
          color: #38bdf8;
          border: 1px solid #334155;
          border-radius: 9999px;
          padding: 8px 14px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
          font-weight: 600;
          font-size: 12px;
          font-family: inherit;
          transition: all 0.15s ease;
        }
        .visage-devtools-trigger:hover {
          background: #1e293b;
          border-color: #38bdf8;
          transform: translateY(-1px);
        }
        .visage-devtools-trigger.open {
          background: #0284c7;
          color: #ffffff;
          border-color: #38bdf8;
        }
        .badge-count {
          background: #1e293b;
          color: #94a3b8;
          padding: 2px 6px;
          border-radius: 9999px;
          font-size: 11px;
          font-family: monospace;
        }
        .visage-devtools-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 380px;
          background: #0f172a;
          border-top: 1px solid #334155;
          display: flex;
          flex-direction: column;
          box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.6);
          z-index: 999998;
          color: #f8fafc;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .devtools-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 18px;
          background: #090d16;
          border-bottom: 1px solid #1e293b;
          gap: 14px;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .brand-title {
          font-weight: 700;
          font-size: 13px;
          color: #38bdf8;
          letter-spacing: -0.01em;
        }
        .brand-version {
          font-size: 10px;
          color: #64748b;
          font-family: monospace;
        }
        .devtools-tabs {
          display: flex;
          gap: 6px;
        }
        .tab-btn {
          background: transparent;
          border: 1px solid transparent;
          color: #94a3b8;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.1s ease;
        }
        .tab-btn:hover {
          color: #f8fafc;
          background: #1e293b;
        }
        .tab-btn.active {
          background: #1e293b;
          color: #38bdf8;
          border-color: #334155;
          font-weight: 600;
        }
        .tab-count {
          font-size: 10px;
          background: #090d16;
          padding: 1px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #cbd5e1;
        }
        .devtools-search {
          flex: 1;
          max-width: 240px;
        }
        .devtools-search input {
          width: 100%;
          background: #090d16;
          border: 1px solid #334155;
          color: #f8fafc;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-family: inherit;
          outline: none;
        }
        .devtools-search input:focus {
          border-color: #38bdf8;
        }
        .devtools-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .btn-toggle-highlight {
          background: #1e293b;
          border: 1px solid #334155;
          color: #cbd5e1;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-toggle-highlight.active {
          background: #0284c7;
          color: #ffffff;
          border-color: #38bdf8;
        }
        .btn-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 14px;
        }
        .btn-close:hover {
          color: #f8fafc;
        }
        .devtools-body {
          flex: 1;
          overflow: hidden;
        }
        .panel-layout {
          display: flex;
          height: 100%;
        }
        .panel-list {
          flex: 1;
          border-right: 1px solid #1e293b;
          overflow-y: auto;
          background: #0f172a;
        }
        .panel-detail {
          width: 380px;
          overflow-y: auto;
          padding: 18px;
          background: #0b0f19;
          color: #f8fafc;
        }
        .item-row {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          border: none;
          border-bottom: 1px solid #1e293b;
          background: transparent;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          color: #f8fafc;
          transition: background 0.1s ease;
        }
        .item-row:hover {
          background: rgba(56, 189, 248, 0.06);
        }
        .item-row.active {
          background: rgba(56, 189, 248, 0.14);
          border-left: 3px solid #38bdf8;
        }
        .item-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .item-title .name {
          color: #f8fafc;
          font-size: 12px;
          font-weight: 500;
        }
        .type-pill {
          font-size: 10px;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          font-family: monospace;
        }
        .type-pill.signal {
          background: #1e3a8a;
          color: #93c5fd;
        }
        .type-pill.computed {
          background: #3b0764;
          color: #d8b4fe;
        }
        .type-pill.query {
          background: #064e3b;
          color: #6ee7b7;
        }
        .type-pill.mutation {
          background: #701a75;
          color: #f0abfc;
        }
        .type-pill.subscription {
          background: #78350f;
          color: #fcd34d;
        }
        .status-pill {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 4px;
          font-weight: 600;
          font-family: monospace;
        }
        .status-pill.success {
          background: #064e3b;
          color: #6ee7b7;
        }
        .status-pill.pending {
          background: #78350f;
          color: #fcd34d;
        }
        .status-pill.streaming {
          background: #0c4a6e;
          color: #38bdf8;
        }
        .status-pill.error {
          background: #7f1d1d;
          color: #fca5a5;
        }
        .item-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          color: #94a3b8;
          font-family: monospace;
        }
        .item-meta .val-preview {
          color: #38bdf8;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .detail-content h4 {
          color: #38bdf8;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 14px;
          word-break: break-all;
        }
        .detail-props {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 12px;
          color: #cbd5e1;
        }
        .prop-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .prop-line strong {
          color: #94a3b8;
          font-weight: 600;
        }
        .json-box {
          background: #020617;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #1e293b;
          font-size: 11px;
          font-family: monospace;
          color: #38bdf8;
          overflow-x: auto;
          max-height: 200px;
          margin-top: 4px;
          line-height: 1.4;
        }
        .empty-hint {
          padding: 36px 20px;
          text-align: center;
          color: #64748b;
          font-size: 12px;
        }
        .detail-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }
        .action-btn {
          background: #1e293b;
          border: 1px solid #334155;
          color: #f8fafc;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .action-btn:hover {
          border-color: #38bdf8;
          color: #38bdf8;
          background: #0f172a;
        }
        .concept-callout {
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 11px;
          line-height: 1.45;
          margin-bottom: 12px;
          border: 1px solid #1e293b;
        }
        .concept-callout.signal {
          background: rgba(30, 58, 138, 0.25);
          border-color: rgba(147, 197, 253, 0.3);
          color: #bfdbfe;
        }
        .concept-callout.computed {
          background: rgba(59, 7, 100, 0.25);
          border-color: rgba(216, 180, 254, 0.3);
          color: #e9d5ff;
        }
        .concept-callout code {
          background: rgba(0, 0, 0, 0.4);
          padding: 1px 4px;
          border-radius: 3px;
          font-family: monospace;
        }
        .concepts-view {
          padding: 18px 24px;
          overflow-y: auto;
          height: 100%;
          background: #090d16;
        }
        .concepts-header {
          margin-bottom: 18px;
        }
        .concepts-header h3 {
          font-size: 15px;
          color: #38bdf8;
          margin-bottom: 4px;
          font-weight: 700;
        }
        .concepts-header p {
          font-size: 12px;
          color: #94a3b8;
        }
        .concepts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
        }
        .concept-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 16px;
        }
        .concept-card.highlight {
          border-color: #38bdf8;
          box-shadow: 0 0 16px rgba(56, 189, 248, 0.08);
          grid-column: 1 / -1;
        }
        .card-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .badge-vs {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }
        .dom-pill {
          background: #0369a1;
          color: #bae6fd;
        }
        .concept-card h4 {
          font-size: 13px;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 6px;
        }
        .concept-card .card-desc {
          font-size: 11.5px;
          color: #94a3b8;
          margin-bottom: 12px;
          line-height: 1.4;
        }
        .comparison-table {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: #090d16;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #1e293b;
          margin-bottom: 12px;
        }
        .comp-title {
          display: block;
          font-weight: 700;
          font-size: 11.5px;
          margin-bottom: 6px;
        }
        .signal-color {
          color: #93c5fd;
        }
        .computed-color {
          color: #d8b4fe;
        }
        .comp-col ul, .concept-points {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 11px;
          color: #cbd5e1;
        }
        .comp-col ul li strong, .concept-points li strong {
          color: #f8fafc;
        }
        .code-box {
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 8px 12px;
          font-family: monospace;
          font-size: 11px;
          color: #38bdf8;
          overflow-x: auto;
          margin: 0;
        }
      `}</Style>
    </div>
  );
}
