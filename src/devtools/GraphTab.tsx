/** @jsxImportSource visage */
import { For, Show } from "../dom";
import { createSignal, type WritableSignal } from "../signals";
import type { DevToolsHub } from "./hub";
import type { SignalRecord } from "./types";

interface GraphTabProps {
  hub: DevToolsHub;
  selectedId: WritableSignal<string | null>;
  searchQuery: WritableSignal<string>;
  formatJSON: (val: any) => string;
}

export function GraphTab(props: GraphTabProps) {
  const [filterType, setFilterType] = createSignal<"all" | "signal" | "computed">("all");

  const rawSignals = () =>
    props.hub.signalsList().filter((s) => {
      const q = props.searchQuery().toLowerCase().trim();
      const matchQuery = !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
      const matchType = filterType() === "all" || s.type === filterType();
      return matchQuery && matchType;
    });

  const stateSignals = () => rawSignals().filter((s) => s.type === "signal");
  const computedSignals = () => rawSignals().filter((s) => s.type === "computed");

  const selectedNode = () => {
    const id = props.selectedId();
    if (!id) return null;
    return props.hub.signalsList().find((s) => s.id === id) ?? null;
  };

  return (
    <div class="visage-graph-container">
      {/* Top Controls Toolbar */}
      <div class="visage-graph-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            class="visage-devtools-input"
            style={{ width: "200px" }}
            placeholder="Search DAG nodes..."
            value={props.searchQuery}
            onInput={(e: any) => props.searchQuery.set(e.target.value)}
          />

          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              class={() => `visage-devtools-btn ${filterType() === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")}
            >
              All Nodes ({() => rawSignals().length})
            </button>
            <button
              type="button"
              class={() => `visage-devtools-btn ${filterType() === "signal" ? "active" : ""}`}
              onClick={() => setFilterType("signal")}
            >
              Signals ({() => stateSignals().length})
            </button>
            <button
              type="button"
              class={() => `visage-devtools-btn ${filterType() === "computed" ? "active" : ""}`}
              onClick={() => setFilterType("computed")}
            >
              Computeds ({() => computedSignals().length})
            </button>
          </div>
        </div>

        <div style={{ fontSize: "11px", color: "#64748b", display: "flex", gap: "12px" }}>
          <span>
            <strong style={{ color: "#10b981" }}>● Signal</strong> (Source / State)
          </span>
          <span>
            <strong style={{ color: "#a855f7" }}>ƒ Computed</strong> (Derived DAG Node)
          </span>
        </div>
      </div>

      {/* Main DAG Graph Canvas */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div class="visage-graph-canvas">
          {/* Column 1: State Signals (Sources) */}
          <div class="visage-graph-column">
            <div class="visage-graph-col-header">
              <span class="visage-graph-pulse" />
              <span>Reactive Sources ({() => stateSignals().length})</span>
            </div>

            <For each={stateSignals}>
              {(node: SignalRecord) => {
                const isSelected = () => props.selectedId() === node.id;
                return (
                  <div
                    class={() => `visage-graph-node ${isSelected() ? "selected" : ""}`}
                    onClick={() => props.selectedId.set(node.id)}
                  >
                    <div class="visage-graph-node-title">
                      <span style={{ color: "#38bdf8" }}>{node.name}</span>
                      <span class="visage-devtools-badge">v{() => node.version()}</span>
                    </div>
                    <div class="visage-graph-node-val">{() => JSON.stringify(node.getValue())}</div>
                  </div>
                );
              }}
            </For>
          </div>

          {/* Connectors Visual Divider */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              color: "#334155",
              fontSize: "20px"
            }}
          >
            <span>→</span>
          </div>

          {/* Column 2: Derived Computeds */}
          <div class="visage-graph-column">
            <div class="visage-graph-col-header">
              <span class="visage-graph-pulse computed" />
              <span>Derived Computeds ({() => computedSignals().length})</span>
            </div>

            <For each={computedSignals}>
              {(node: SignalRecord) => {
                const isSelected = () => props.selectedId() === node.id;
                return (
                  <div
                    class={() => `visage-graph-node ${isSelected() ? "selected" : ""}`}
                    onClick={() => props.selectedId.set(node.id)}
                  >
                    <div class="visage-graph-node-title">
                      <span style={{ color: "#c084fc" }}>{node.name}</span>
                      <span
                        class="visage-devtools-badge"
                        style={{ background: "#581c87", color: "#fff" }}
                      >
                        v{() => node.version()}
                      </span>
                    </div>
                    <div class="visage-graph-node-val">{() => JSON.stringify(node.getValue())}</div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        {/* Node Detail Side Inspector */}
        <div
          style={{
            width: "300px",
            borderLeft: "1px solid #1e293b",
            background: "#090d16",
            padding: "16px",
            overflowY: "auto"
          }}
        >
          <Show
            when={selectedNode}
            fallback={
              <div
                style={{
                  color: "#64748b",
                  textAlign: "center",
                  marginTop: "30px",
                  fontSize: "12px"
                }}
              >
                Click any DAG node to inspect its live state and update history.
              </div>
            }
          >
            {(node: () => SignalRecord) => (
              <div>
                <h4 style={{ margin: "0 0 4px 0", color: "#f1f5f9" }}>{() => node().name}</h4>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "12px" }}>
                  ID: {() => node().id}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    marginBottom: "16px"
                  }}
                >
                  <span
                    class="visage-devtools-badge"
                    style={{
                      background: () => (node().type === "computed" ? "#581c87" : "#0369a1"),
                      color: "#fff"
                    }}
                  >
                    {() => node().type.toUpperCase()}
                  </span>
                  <span class="visage-devtools-badge">VERSION: {() => node().version()}</span>
                </div>

                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                  Live Value:
                </div>
                <pre class="visage-devtools-json">{() => props.formatJSON(node().getValue())}</pre>
              </div>
            )}
          </Show>
        </div>
      </div>
    </div>
  );
}
