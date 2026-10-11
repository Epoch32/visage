import { For, Show } from "../dom";
import type { WritableSignal } from "../signals";
import type { DevToolsHub } from "./hub";
import type { SignalRecord } from "./types";

interface SignalsTabProps {
  hub: DevToolsHub;
  selectedId: WritableSignal<string | null>;
  searchQuery: WritableSignal<string>;
  formatJSON: (val: any) => string;
}

export function SignalsTab(props: SignalsTabProps) {
  const filteredSignals = () => {
    const q = props.searchQuery().toLowerCase().trim();
    const list = props.hub.signalsList();
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  };

  const selectedSignal = () => {
    const id = props.selectedId();
    if (!id) return null;
    return props.hub.signalsList().find((s) => s.id === id) ?? null;
  };

  return (
    <div style={{ display: "flex", flex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Left List */}
      <div class="visage-devtools-sidebar">
        <div class="visage-devtools-search">
          <input
            class="visage-devtools-input"
            placeholder="Search signals..."
            value={props.searchQuery}
            onInput={(e: any) => props.searchQuery.set(e.target.value)}
          />
        </div>
        <div class="visage-devtools-list">
          <For each={filteredSignals}>
            {(sig: SignalRecord) => {
              const isSelected = () => props.selectedId() === sig.id;
              return (
                <div
                  class={() => `visage-devtools-item ${sig.type} ${isSelected() ? "selected" : ""}`}
                  onClick={() => props.selectedId.set(sig.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "1px 4px",
                        borderRadius: "3px",
                        background: sig.type === "computed" ? "#3b0764" : "#082f49",
                        color: sig.type === "computed" ? "#c084fc" : "#38bdf8",
                        border: `1px solid ${sig.type === "computed" ? "#581c87" : "#0369a1"}`
                      }}
                    >
                      {sig.type === "computed" ? "CMP" : "SIG"}
                    </span>
                    <span style={{ fontWeight: 500, color: "#f1f5f9" }}>{sig.name}</span>
                  </div>
                  <span class="visage-devtools-badge">v{() => sig.version()}</span>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* Right Details */}
      <div class="visage-devtools-main">
        <Show
          when={selectedSignal}
          fallback={
            <div
              style={{
                color: "#64748b",
                textAlign: "center",
                marginTop: "40px",
                fontSize: "13px"
              }}
            >
              Select a signal or computed from the left to inspect its live reactive value.
            </div>
          }
        >
          {(sig: () => SignalRecord) => (
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
                    {() => sig().name}
                  </h3>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>ID: {() => sig().id}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <span
                    class="visage-devtools-badge"
                    style={{
                      background: () => (sig().type === "computed" ? "#581c87" : "#0369a1"),
                      color: "#fff"
                    }}
                  >
                    {() => sig().type.toUpperCase()}
                  </span>
                  <span class="visage-devtools-badge">VERSION: {() => sig().version()}</span>
                </div>
              </div>

              <div style={{ marginBottom: "12px", fontSize: "12px", color: "#94a3b8" }}>
                Current Reactive Value:
              </div>
              <pre class="visage-devtools-json">{() => props.formatJSON(sig().getValue())}</pre>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}
