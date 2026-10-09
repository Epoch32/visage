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
            <h3 style={{ margin: "0 0 6px 0", color: "#f8fafc", fontSize: "18px" }}>
              ⚡ Real-Time DOM Mutation Highlighter
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px", lineHeight: 1.5 }}>
              Visage uses zero Virtual DOM and fine-grained reactivity. Only exact text nodes and
              attributes update in-place.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: () => (props.hub.highlightDOM() ? "#10b981" : "#64748b")
              }}
            >
              {() => (props.hub.highlightDOM() ? "HIGHLIGHT ON" : "HIGHLIGHT OFF")}
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
          <h4 style={{ margin: "0 0 10px 0", color: "#38bdf8", fontSize: "14px" }}>
            How to use DOM Highlighting:
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
              Notice that <strong>only the exact updated node flashes green</strong> without
              re-rendering the whole component or tree!
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
            <div style={{ fontWeight: 700, color: "#ef4444", marginBottom: "6px" }}>
              ❌ Traditional VDOM Frameworks
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px", lineHeight: 1.5 }}>
              State changes re-run entire component functions, allocate temporary Virtual DOM nodes,
              and diff large trees.
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
            <div style={{ fontWeight: 700, color: "#10b981", marginBottom: "6px" }}>
              ✅ Visage Push-Pull Signals
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px", lineHeight: 1.5 }}>
              Component functions execute once during mounting. Signals push direct in-place
              mutations in microsecond times.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
