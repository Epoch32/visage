import { For } from "../dom";
import { createSignal, type WritableSignal } from "../signals";
import { GraphInspector } from "./GraphInspector";
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
  const [hoveredId, setHoveredId] = createSignal<string | null>(null);

  const allSignals = () => props.hub.signalsList();

  const getDependencies = (node: SignalRecord): SignalRecord[] => {
    const depIds = node.dependencies ? node.dependencies() : [];
    if (depIds.length === 0) return [];
    return allSignals().filter((s) => depIds.includes(s.id));
  };

  const getDependents = (node: SignalRecord): SignalRecord[] => {
    const directDependents = node.dependents ? node.dependents() : [];
    return allSignals().filter(
      (s) => directDependents.includes(s.id) || s.dependencies?.().includes(node.id)
    );
  };

  const activeFocusId = () => hoveredId() ?? props.selectedId();

  const focusedDeps = () => {
    const id = activeFocusId();
    if (!id) return [];
    const node = allSignals().find((s) => s.id === id);
    if (!node) return [];
    return getDependencies(node).map((s) => s.id);
  };

  const focusedTargets = () => {
    const id = activeFocusId();
    if (!id) return [];
    const node = allSignals().find((s) => s.id === id);
    if (!node) return [];
    return getDependents(node).map((s) => s.id);
  };

  const filteredSignals = () =>
    allSignals().filter((s) => {
      const q = props.searchQuery().toLowerCase().trim();
      const matchQuery = !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
      const matchType = filterType() === "all" || s.type === filterType();
      return matchQuery && matchType;
    });

  const stateSignals = () => filteredSignals().filter((s) => s.type === "signal");
  const computedSignals = () => filteredSignals().filter((s) => s.type === "computed");

  const selectedNode = () => {
    const id = props.selectedId();
    if (!id) return null;
    return allSignals().find((s) => s.id === id) ?? null;
  };

  return (
    <div class="visage-graph-container">
      {/* Top Toolbar */}
      <div class="visage-graph-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            class="visage-devtools-input"
            style={{ width: "200px" }}
            placeholder="Filter DAG graph..."
            value={props.searchQuery}
            onInput={(e: any) => props.searchQuery.set(e.target.value)}
          />

          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              class={() => `visage-devtools-btn ${filterType() === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")}
            >
              All ({() => filteredSignals().length})
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

        <div
          style={{
            fontSize: "11px",
            color: "#64748b",
            display: "flex",
            gap: "14px",
            alignItems: "center"
          }}
        >
          <span style={{ color: "#38bdf8" }}>[SIG] Upstream</span>
          <span style={{ color: "#c084fc" }}>[CMP] Derived</span>
          <span style={{ color: "#10b981" }}>Glitch-Free DAG</span>
        </div>
      </div>

      {/* Main Reactive Canvas */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div class="visage-graph-canvas">
          {/* Column 1: Root Reactive State (Sources) */}
          <div class="visage-graph-column">
            <div class="visage-graph-col-header">
              <span class="visage-graph-pulse" />
              <span>Reactive Sources ({() => stateSignals().length})</span>
            </div>

            <For each={stateSignals}>
              {(node: SignalRecord) => {
                const isSelected = () => props.selectedId() === node.id;
                const isDep = () => focusedDeps().includes(node.id);
                const isTarget = () => focusedTargets().includes(node.id);
                const isDimmed = () =>
                  activeFocusId() !== null && !isSelected() && !isDep() && !isTarget();

                const dependents = () => getDependents(node);

                return (
                  <div
                    class={() =>
                      `visage-graph-node ${isSelected() ? "selected" : ""} ${isDep() ? "is-dependency" : ""} ${isTarget() ? "is-dependent" : ""} ${isDimmed() ? "is-dimmed" : ""}`
                    }
                    onClick={() => props.selectedId.set(node.id)}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div class="visage-graph-node-title">
                      <span
                        style={{
                          color: "#f8fafc",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            padding: "1px 4px",
                            borderRadius: "3px",
                            background: "#082f49",
                            color: "#38bdf8",
                            border: "1px solid #0369a1"
                          }}
                        >
                          SIG
                        </span>
                        <span>{node.name}</span>
                      </span>
                      <span class="visage-devtools-badge">v{() => node.version()}</span>
                    </div>

                    <div class="visage-graph-node-val">{() => JSON.stringify(node.getValue())}</div>

                    <div
                      style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}
                    >
                      {() =>
                        dependents().length > 0 ? (
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                            {dependents().length} consumer{dependents().length > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span style={{ fontSize: "10px", color: "#475569" }}>Root State</span>
                        )
                      }
                    </div>
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
              fontSize: "14px",
              fontWeight: 700,
              padding: "0 10px"
            }}
          >
            <span>&gt;</span>
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
                const isDep = () => focusedDeps().includes(node.id);
                const isTarget = () => focusedTargets().includes(node.id);
                const isDimmed = () =>
                  activeFocusId() !== null && !isSelected() && !isDep() && !isTarget();

                const deps = () => getDependencies(node);

                return (
                  <div
                    class={() =>
                      `visage-graph-node ${isSelected() ? "selected" : ""} ${isDep() ? "is-dependency" : ""} ${isTarget() ? "is-dependent" : ""} ${isDimmed() ? "is-dimmed" : ""}`
                    }
                    onClick={() => props.selectedId.set(node.id)}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div class="visage-graph-node-title">
                      <span
                        style={{
                          color: "#f8fafc",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            padding: "1px 4px",
                            borderRadius: "3px",
                            background: "#3b0764",
                            color: "#c084fc",
                            border: "1px solid #581c87"
                          }}
                        >
                          CMP
                        </span>
                        <span>{node.name}</span>
                      </span>
                      <span
                        class="visage-devtools-badge"
                        style={{ background: "#581c87", color: "#fff" }}
                      >
                        v{() => node.version()}
                      </span>
                    </div>

                    <div class="visage-graph-node-val">{() => JSON.stringify(node.getValue())}</div>

                    <div
                      style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}
                    >
                      {() =>
                        deps().length > 0 ? (
                          deps().map((d) => (
                            <span
                              class="visage-graph-pill source"
                              onClick={(e: MouseEvent) => {
                                e.stopPropagation();
                                props.selectedId.set(d.id);
                              }}
                            >
                              in: {d.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: "10px", color: "#64748b" }}>Memoized</span>
                        )
                      }
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        {/* Modular Node Detail Side Inspector */}
        <GraphInspector
          selectedNode={selectedNode}
          selectedId={props.selectedId}
          getDependencies={getDependencies}
          getDependents={getDependents}
          formatJSON={props.formatJSON}
        />
      </div>
    </div>
  );
}
