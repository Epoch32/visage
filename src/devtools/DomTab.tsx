/** @jsxImportSource visage */
import { Switch } from "../ui/switch";
import type { DevToolsHub } from "./hub";

interface DomTabProps {
  hub: DevToolsHub;
}

export function DomTab(props: DomTabProps) {
  return (
    <div style={{ flex: 1, padding: "24px", overflowY: "auto", background: "#090d16" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px"
          }}
        >
          <div>
            <h3
              style={{ margin: "0 0 6px 0", color: "#f8fafc", fontSize: "16px", fontWeight: 700 }}
            >
              Real-Time DOM Mutation Highlighter
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px", lineHeight: 1.5 }}>
              Visage uses zero Virtual DOM and fine-grained reactivity. Only exact text nodes and
              attributes update in-place.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: () => (props.hub.highlightDOM() ? "#10b981" : "#64748b")
              }}
            >
              {() => (props.hub.highlightDOM() ? "ENABLED" : "DISABLED")}
            </span>
            <Switch
              checked={props.hub.highlightDOM}
              onCheckedChange={(val) => props.hub.highlightDOM.set(val)}
            />
          </div>
        </div>

        <div
          style={{
            background: "#0c111d",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "20px"
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#38bdf8", fontSize: "13px", fontWeight: 600 }}>
            Usage Instructions:
          </h4>
          <ul
            style={{
              margin: 0,
              paddingLeft: "20px",
              color: "#cbd5e1",
              fontSize: "13px",
              lineHeight: 1.6
            }}
          >
            <li>Toggle the switch above to enable visual flashing outlines across your app.</li>
            <li>Interact with buttons, form inputs, tabs, and modals in your application.</li>
            <li>
              Notice that <strong>only the exact updated node flashes</strong> without re-rendering
              the whole component or tree.
            </li>
          </ul>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div
            style={{
              background: "#0c111d",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              padding: "14px"
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: "#f87171",
                marginBottom: "6px",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}
            >
              Virtual DOM Model
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px", lineHeight: 1.5 }}>
              State changes re-run entire component functions, allocate temporary Virtual DOM nodes,
              and diff tree structures.
            </p>
          </div>
          <div
            style={{
              background: "#0c111d",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              padding: "14px"
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: "#34d399",
                marginBottom: "6px",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}
            >
              Visage Reactive Engine
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px", lineHeight: 1.5 }}>
              Component functions execute once during mounting. Signals push direct in-place
              mutations at native DOM speed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
