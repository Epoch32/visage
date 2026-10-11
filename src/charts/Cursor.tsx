import type { Child } from "../dom";
import { useChartContext } from "./context";

export interface ChartCursorProps {
  stroke?: string;
  strokeWidth?: number | string;
  strokeDasharray?: string;
  opacity?: number | string;
}

export function ChartCursor(props: ChartCursorProps): Child {
  return () => {
    const ctx = useChartContext();

    const stroke = props.stroke ?? "#94a3b8";
    const strokeWidth = props.strokeWidth ?? 1;
    const strokeDasharray = props.strokeDasharray ?? "4 4";
    const opacity = props.opacity ?? 0.8;

    const hover = ctx.hoverState();
    if (!hover.active) return null;

    const h = ctx.innerHeight();
    // hover.x is relative to container, subtract margin.left for group coordinate space
    const x = hover.x - ctx.margin.left;

    return (
      <g class="visage-chart-cursor">
        <line
          x1={x}
          y1={0}
          x2={x}
          y2={h}
          stroke={stroke}
          stroke-width={strokeWidth}
          stroke-dasharray={strokeDasharray}
          opacity={opacity}
        />
      </g>
    );
  };
}
