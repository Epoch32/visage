import { Show } from "@dom";
import type { WritableSignal } from "@signals";
import type { SignalRecord } from "./types";

interface GraphInspectorProps {
  selectedNode: () => SignalRecord | null;
  selectedId: WritableSignal<string | null>;
  getDependencies: (node: SignalRecord) => SignalRecord[];
  getDependents: (node: SignalRecord) => SignalRecord[];
  formatJSON: (val: any) => string;
}

export function GraphInspector(props: GraphInspectorProps) {
  return (
    <div
      style={{
        width: "320px",
        borderLeft: "1px solid #1e293b",
        background: "#090d16",
        padding: "16px",
        overflowY: "auto"
      }}
    >
      <Show
        when={props.selectedNode}
        fallback={
          <div
            style={{
              color: "#64748b",
              textAlign: "center",
              marginTop: "30px",
              fontSize: "12px",
              lineHeight: 1.6
            }}
          >
            <p>
              Select any DAG node to inspect live dependencies, downstream subscribers, and reactive
              version history.
            </p>
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                background: "#0f172a",
                borderRadius: "6px",
                textAlign: "left"
              }}
            >
              <div
                style={{ color: "#94a3b8", fontWeight: 600, marginBottom: "4px", fontSize: "11px" }}
              >
                Legend:
              </div>
              <div style={{ color: "#38bdf8", fontSize: "11px" }}>
                [SIG] Upstream Source Signals
              </div>
              <div style={{ color: "#c084fc", fontSize: "11px" }}>[CMP] Derived Computeds</div>
            </div>
          </div>
        }
      >
        {(node: () => SignalRecord) => {
          const deps = () => props.getDependencies(node());
          const targets = () => props.getDependents(node());

          return (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px"
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 2px 0", color: "#f1f5f9", fontSize: "15px" }}>
                    {() => node().name}
                  </h4>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>ID: {() => node().id}</span>
                </div>
                <button
                  type="button"
                  class="visage-devtools-btn"
                  onClick={() => props.selectedId.set(null)}
                  title="Clear Selection"
                >
                  Clear
                </button>
              </div>

              <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
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

              {/* Current Value */}
              <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                Live Value:
              </div>
              <pre class="visage-devtools-json" style={{ marginBottom: "16px" }}>
                {() => props.formatJSON(node().getValue())}
              </pre>

              {/* Upstream Dependencies (Inputs) */}
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "#38bdf8",
                    marginBottom: "6px"
                  }}
                >
                  Upstream Inputs ({() => deps().length})
                </div>
                {() =>
                  deps().length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {deps().map((d) => (
                        <div
                          class="visage-graph-pill source"
                          style={{
                            width: "100%",
                            justifyContent: "space-between",
                            padding: "6px 8px"
                          }}
                          onClick={() => props.selectedId.set(d.id)}
                        >
                          <span>{d.name}</span>
                          <span style={{ color: "#94a3b8" }}>v{d.version()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      None (Root Reactive Source)
                    </div>
                  )
                }
              </div>

              {/* Downstream Consumers (Outputs) */}
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "#c084fc",
                    marginBottom: "6px"
                  }}
                >
                  Downstream Consumers ({() => targets().length})
                </div>
                {() =>
                  targets().length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {targets().map((t) => (
                        <div
                          class="visage-graph-pill target"
                          style={{
                            width: "100%",
                            justifyContent: "space-between",
                            padding: "6px 8px"
                          }}
                          onClick={() => props.selectedId.set(t.id)}
                        >
                          <span>{t.name}</span>
                          <span style={{ color: "#94a3b8" }}>v{t.version()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      None (Leaf / UI Consumer)
                    </div>
                  )
                }
              </div>
            </div>
          );
        }}
      </Show>
    </div>
  );
}
