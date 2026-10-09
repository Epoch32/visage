/** @jsxImportSource visage */
import { onCleanup, signal } from "../signals";
import { Style } from "../style";
import { Tabs } from "../ui/tabs";
import { Tooltip } from "../ui/tooltip";
import { DomTab } from "./DomTab";
import { GraphTab } from "./GraphTab";
import { setupDomMutationHighlighter } from "./highlighter";
import { devtoolsHub } from "./hub";
import { QueryTab } from "./QueryTab";
import { RpcTab } from "./RpcTab";
import { SignalsTab } from "./SignalsTab";
import { devtoolsStyles } from "./styles";
import type { DevToolsOptions, DevToolsTab } from "./types";

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
  const searchQuery = signal("", { internal: true });

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

  return (
    <div class="visage-devtools-root">
      <Style>{devtoolsStyles}</Style>

      {/* Floating Toggle Launcher Button with Tooltip */}
      {() =>
        !hub.isOpen() ? (
          <Tooltip content="Press Shift+Alt+V to toggle Visage DevTools" side="top">
            <button
              type="button"
              class="visage-devtools-trigger"
              onClick={() => hub.toggle()}
              aria-label="Open Visage DevTools"
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span>DevTools</span>
            </button>
          </Tooltip>
        ) : (
          <div class="visage-devtools-drawer" role="dialog" aria-label="Visage In-Browser DevTools">
            {/* Header with Navigation Tabs */}
            <div class="visage-devtools-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#38bdf8"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <strong
                  style={{
                    fontSize: "12px",
                    letterSpacing: "0.04em",
                    color: "#f8fafc",
                    fontWeight: 700
                  }}
                >
                  VISAGE
                </strong>
              </div>

              {/* DevTools Tab Bar powered by visage/ui <Tabs> */}
              <Tabs
                value={() => hub.activeTab()}
                onValueChange={(val) => {
                  hub.setTab(val as DevToolsTab);
                  selectedId.set(null);
                }}
                listClass="visage-devtools-tabs"
                items={[
                  {
                    value: "signals",
                    label: () => (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span>Signals</span>
                        <span class="visage-devtools-badge">{() => hub.signalsList().length}</span>
                      </span>
                    )
                  },
                  {
                    value: "graph",
                    label: () => (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span>DAG Graph</span>
                        <span
                          class="visage-devtools-badge"
                          style={{ background: "#581c87", color: "#fff" }}
                        >
                          LIVE
                        </span>
                      </span>
                    )
                  },
                  {
                    value: "query",
                    label: () => (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span>Query Cache</span>
                        <span class="visage-devtools-badge">{() => hub.queriesList().length}</span>
                      </span>
                    )
                  },
                  {
                    value: "rpc",
                    label: () => (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span>RPC</span>
                        <span class="visage-devtools-badge">{() => hub.rpcLogs().length}</span>
                      </span>
                    )
                  },
                  {
                    value: "dom",
                    label: "DOM Inspector"
                  }
                ]}
              />

              {/* Close Button */}
              <div class="visage-devtools-actions">
                <button
                  type="button"
                  class="visage-devtools-btn"
                  onClick={() => hub.isOpen.set(false)}
                  title="Close DevTools (Shift+Alt+V)"
                >
                  Close
                </button>
              </div>
            </div>

            {/* DevTools Body Switch */}
            <div class="visage-devtools-body">
              {() => {
                const tab = hub.activeTab();
                if (tab === "signals") {
                  return (
                    <SignalsTab
                      hub={hub}
                      selectedId={selectedId}
                      searchQuery={searchQuery}
                      formatJSON={formatJSON}
                    />
                  );
                }
                if (tab === "graph") {
                  return (
                    <GraphTab
                      hub={hub}
                      selectedId={selectedId}
                      searchQuery={searchQuery}
                      formatJSON={formatJSON}
                    />
                  );
                }
                if (tab === "query") {
                  return (
                    <QueryTab
                      hub={hub}
                      selectedId={selectedId}
                      searchQuery={searchQuery}
                      formatJSON={formatJSON}
                    />
                  );
                }
                if (tab === "rpc") {
                  return (
                    <RpcTab
                      hub={hub}
                      selectedId={selectedId}
                      searchQuery={searchQuery}
                      formatJSON={formatJSON}
                    />
                  );
                }
                return <DomTab hub={hub} />;
              }}
            </div>
          </div>
        )
      }
    </div>
  );
}
