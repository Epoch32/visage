import { For, Show } from "@dom";
import type { WritableSignal } from "@signals";
import type { DevToolsHub } from "./hub";
import type { RpcRecord } from "./types";

interface RpcTabProps {
  hub: DevToolsHub;
  selectedId: WritableSignal<string | null>;
  searchQuery: WritableSignal<string>;
  formatJSON: (val: any) => string;
}

export function RpcTab(props: RpcTabProps) {
  const filteredRpc = () => {
    const q = props.searchQuery().toLowerCase().trim();
    const list = props.hub.rpcLogs();
    if (!q) return list;
    return list.filter((r) => r.path.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
  };

  const selectedRpc = () => {
    const id = props.selectedId();
    if (!id) return null;
    return props.hub.rpcLogs().find((r) => r.id === id) ?? null;
  };

  return (
    <div style={{ display: "flex", flex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
      {/* RPC Calls List */}
      <div class="visage-devtools-sidebar">
        <div class="visage-devtools-search" style={{ display: "flex", gap: "6px" }}>
          <input
            class="visage-devtools-input"
            placeholder="Filter RPC routes..."
            value={props.searchQuery}
            onInput={(e: any) => props.searchQuery.set(e.target.value)}
          />
          <button
            type="button"
            class="visage-devtools-btn"
            onClick={() => props.hub.clearLogs()}
            title="Clear RPC Logs"
          >
            Clear
          </button>
        </div>
        <div class="visage-devtools-list">
          <For
            each={filteredRpc}
            fallback={
              <div style={{ padding: "12px", color: "#64748b", fontSize: "12px" }}>
                No RPC activity recorded yet.
              </div>
            }
          >
            {(r: RpcRecord) => {
              const isSelected = () => props.selectedId() === r.id;
              return (
                <div
                  class={() => `visage-devtools-item ${isSelected() ? "selected" : ""}`}
                  onClick={() => props.selectedId.set(r.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      overflow: "hidden"
                    }}
                  >
                    <span
                      class="visage-devtools-badge"
                      style={{
                        background:
                          r.type === "mutation"
                            ? "#c026d3"
                            : r.type === "subscription"
                              ? "#7c3aed"
                              : "#0284c7",
                        color: "#fff"
                      }}
                    >
                      {r.type.slice(0, 3).toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {r.path}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        color:
                          r.status === "success"
                            ? "#10b981"
                            : r.status === "error"
                              ? "#ef4444"
                              : "#f59e0b"
                      }}
                    >
                      {r.status}
                    </span>
                    {r.duration !== undefined ? (
                      <span style={{ fontSize: "10px", color: "#64748b" }}>{r.duration}ms</span>
                    ) : null}
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* RPC Detail View */}
      <div class="visage-devtools-main">
        <Show
          when={selectedRpc}
          fallback={
            <div
              style={{ color: "#64748b", textAlign: "center", marginTop: "40px", fontSize: "13px" }}
            >
              Select an RPC procedure call from the left to inspect full payload, latency, and
              streaming SSE frames.
            </div>
          }
        >
          {(r: () => RpcRecord) => (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px"
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#f8fafc" }}>
                    {() => `${r().type.toUpperCase()}: ${r().path}`}
                  </h3>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    Call ID: {() => r().id}
                  </span>
                </div>
                <span
                  class="visage-devtools-badge"
                  style={{ fontSize: "12px", padding: "3px 8px" }}
                >
                  {() => (r().duration !== undefined ? `${r().duration}ms` : "Active")}
                </span>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                  Input Parameters:
                </div>
                <pre class="visage-devtools-json">{() => props.formatJSON(r().input)}</pre>
              </div>

              <Show when={() => r().response !== undefined}>
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                    Server Response:
                  </div>
                  <pre class="visage-devtools-json">{() => props.formatJSON(r().response)}</pre>
                </div>
              </Show>

              <Show when={() => (r().events?.length ?? 0) > 0}>
                <div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                    Live SSE Event Stream ({() => r().events?.length ?? 0} frames):
                  </div>
                  <pre class="visage-devtools-json">{() => props.formatJSON(r().events)}</pre>
                </div>
              </Show>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}
