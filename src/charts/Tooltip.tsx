/** @jsxImportSource visage */
import type { Child } from "../dom";
import type { ClassProp } from "../jsx-runtime/jsx";
import { useChartContext } from "./context";
import type { SeriesMeta } from "./types";

export interface TooltipProps {
  format?: (val: any, name: string) => string;
  labelFormat?: (label: any) => string;
  content?: (datum: any, series: SeriesMeta[]) => Child;
  class?: ClassProp;
  className?: ClassProp;
}

export function ChartTooltip(props: TooltipProps): Child {
  return () => {
    const ctx = useChartContext();
    const hover = ctx.hoverState();
    if (!hover.active || !hover.datum) return null;

    const w = ctx.width();
    const datum = hover.datum;
    const series = ctx.series();
    const xKey = ctx.xDataKey();

    // Avoid tooltip escaping the right edge
    const cardWidth = 160;
    let left = hover.x + 14;
    if (left + cardWidth > w) {
      left = Math.max(10, hover.x - cardWidth - 14);
    }
    const top = Math.max(10, hover.y - 30);

    if (props.content) {
      return (
        <div
          style={{
            position: "absolute",
            left: `${left}px`,
            top: `${top}px`,
            pointerEvents: "none",
            zIndex: 50
          }}
        >
          {props.content(datum, series)}
        </div>
      );
    }

    const label = xKey && datum[xKey] !== undefined ? datum[xKey] : `#${hover.index + 1}`;
    const formattedLabel = props.labelFormat ? props.labelFormat(label) : String(label);

    return (
      <div
        class={props.class || props.className}
        style={{
          position: "absolute",
          left: `${left}px`,
          top: `${top}px`,
          pointerEvents: "none",
          zIndex: 50,
          minWidth: `${cardWidth}px`,
          padding: "8px 12px",
          borderRadius: "10px",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
          fontSize: "12px",
          color: "#1e293b",
          lineHeight: "1.4"
        }}
      >
        <div
          style={{
            fontWeight: "600",
            color: "#475569",
            marginBottom: "6px",
            borderBottom: "1px solid #f1f5f9",
            paddingBottom: "4px"
          }}
        >
          {formattedLabel}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {series.map((s) => {
            const rawVal = datum[s.dataKey];
            if (rawVal === undefined || rawVal === null) return null;

            const valStr = props.format
              ? props.format(rawVal, s.name ?? s.dataKey)
              : String(rawVal);

            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: s.color ?? "#8b5cf6"
                    }}
                  />
                  <span style={{ color: "#64748b" }}>{s.name ?? s.dataKey}</span>
                </div>
                <span style={{ fontWeight: "600", color: "#0f172a" }}>{valStr}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
}

export const Tooltip = ChartTooltip;
