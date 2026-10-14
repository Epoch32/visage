import type { Child } from "../dom";
import type { ClassProp } from "../jsx-runtime/jsx";
import { useChartContext } from "./context";

export interface LegendProps {
  align?: "left" | "center" | "right";
  class?: ClassProp;
  className?: ClassProp;
}

export function ChartLegend(props: LegendProps): Child {
  const render = () => {
    const ctx = useChartContext();
    const align = props.align ?? "center";

    const justifyMap = {
      left: "flex-start",
      center: "center",
      right: "flex-end"
    };

    const series = ctx.series();
    const uniqueSeries = series.filter(
      (s, idx, arr) => arr.findIndex((item) => item.dataKey === s.dataKey) === idx
    );
    return (
      <div
        class={props.class || props.className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: justifyMap[align],
          gap: "16px",
          paddingTop: "8px",
          fontSize: "12px",
          color: "#475569"
        }}
      >
        {uniqueSeries.map((s) => (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "3px",
                background: s.color ?? "#8b5cf6"
              }}
            />
            <span>{s.name ?? s.dataKey}</span>
          </div>
        ))}
      </div>
    );
  };
  (render as any).__visage_overlay = true;
  return render;
}

export const Legend = ChartLegend;
