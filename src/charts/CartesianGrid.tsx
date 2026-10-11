/** @jsxImportSource visage */
import type { Child } from "../dom";
import { useChartContext } from "./context";

export interface CartesianGridProps {
  horizontal?: boolean;
  vertical?: boolean;
  stroke?: string;
  strokeWidth?: number | string;
  strokeDasharray?: string;
  opacity?: number | string;
}

export function CartesianGrid(props: CartesianGridProps): Child {
  return () => {
    const ctx = useChartContext();

    const horizontal = props.horizontal ?? true;
    const vertical = props.vertical ?? false;
    const stroke = props.stroke ?? "#e2e8f0";
    const strokeWidth = props.strokeWidth ?? 1;
    const strokeDasharray = props.strokeDasharray;
    const opacity = props.opacity ?? 0.8;

    const lines: Child[] = [];
    const w = ctx.innerWidth();
    const h = ctx.innerHeight();
    const yScale = ctx.yScale();
    const xScale = ctx.xScale();

    if (horizontal) {
      const ticks = yScale.ticks(5);
      for (const t of ticks) {
        const y = yScale(t);
        lines.push(
          <line
            x1={0}
            y1={y}
            x2={w}
            y2={y}
            stroke={stroke}
            stroke-width={strokeWidth}
            stroke-dasharray={strokeDasharray}
          />
        );
      }
    }

    if (vertical) {
      const ticks = xScale.ticks(5);
      for (const t of ticks) {
        const x = xScale(t);
        lines.push(
          <line
            x1={x}
            y1={0}
            x2={x}
            y2={h}
            stroke={stroke}
            stroke-width={strokeWidth}
            stroke-dasharray={strokeDasharray}
          />
        );
      }
    }

    return (
      <g class="visage-cartesian-grid" opacity={opacity}>
        {lines}
      </g>
    );
  };
}
