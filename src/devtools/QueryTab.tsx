import { For, Show } from "@dom";
import type { WritableSignal } from "@signals";
import type { DevToolsHub } from "./hub";
import type { QueryRecord } from "./types";

interface QueryTabProps {
  hub: DevToolsHub;
  selectedId: WritableSignal<string | null>;
  searchQuery: WritableSignal<string>;
  formatJSON: (val: any) => string;
}

export function QueryTab(props: QueryTabProps) {
  const filteredQueries = () => {
    const q = props.searchQuery().toLowerCase().trim();
    const list = props.hub.queriesList();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.hash.toLowerCase().includes(q) || JSON.stringify(item.key).toLowerCase().includes(q)
    );
  };

  const selectedQuery = () => {
    const id = props.selectedId();
    if (!id) return null;
    return props.hub.queriesList().find((qr) => qr.hash === id) ?? null;
  };

  return (
    <div style={{ display: "flex", flex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Query List */}
      <div class="visage-devtools-sidebar">
        <div class="visage-devtools-search">
          <input
            class="visage-devtools-input"
            placeholder="Search query cache..."
            value={props.searchQuery}
            onInput={(e: any) => props.searchQuery.set(e.target.value)}
          />
        </div>
        <div class="visage-devtools-list">
          <For
            each={filteredQueries}
            fallback={
              <div style={{ padding: "12px", color: "#64748b", fontSize: "12px" }}>
                No active queries in cache.
              </div>
            }
          >
            {(qr: QueryRecord) => {
              const isSelected = () => props.selectedId() === qr.hash;
              return (
                <div
                  class={() => `visage-devtools-item ${isSelected() ? "selected" : ""}`}
                  onClick={() => props.selectedId.set(qr.hash)}
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
                          qr.status() === "success"
                            ? "#065f46"
                            : qr.status() === "error"
                              ? "#991b1b"
                              : "#854d0e",
                        color: "#fff"
                      }}
                    >
                      {() => qr.status()}
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {JSON.stringify(qr.key)}
                    </span>
                  </div>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>
                    {() => qr.fetchStatus()}
                  </span>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* Query Detail */}
      <div class="visage-devtools-main">
        <Show
          when={selectedQuery}
          fallback={
            <div
              style={{ color: "#64748b", textAlign: "center", marginTop: "40px", fontSize: "13px" }}
            >
              Select a query from the cache list to view live cached response and trigger manual
              refetches.
            </div>
          }
        >
          {(qr: () => QueryRecord) => (
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
                  <h3 style={{ margin: 0, fontSize: "15px", color: "#f8fafc" }}>
                    {() => JSON.stringify(qr().key)}
                  </h3>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    Hash: {() => qr().hash}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    class="visage-devtools-btn"
                    onClick={() => qr().refetch?.()}
                  >
                    Refetch
                  </button>
                  <button
                    type="button"
                    class="visage-devtools-btn"
                    onClick={() => qr().invalidate?.()}
                  >
                    Invalidate Cache
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginBottom: "16px"
                }}
              >
                <div
                  style={{
                    background: "#0c111d",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #1e293b"
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#64748b" }}>STATUS</div>
                  <div style={{ fontWeight: 600, color: "#38bdf8" }}>
                    {() => `${qr().status()} (${qr().fetchStatus()})`}
                  </div>
                </div>
                <div
                  style={{
                    background: "#0c111d",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #1e293b"
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#64748b" }}>LAST UPDATED</div>
                  <div style={{ fontWeight: 600, color: "#f1f5f9" }}>
                    {() =>
                      qr().dataUpdatedAt()
                        ? new Date(qr().dataUpdatedAt()).toLocaleTimeString()
                        : "Never"
                    }
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                Cached Response Payload:
              </div>
              <pre class="visage-devtools-json">{() => props.formatJSON(qr().data())}</pre>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}
