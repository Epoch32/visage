/** @jsxImportSource visage */
import type { Child } from "../dom";
import { useChartContext } from "./context";
import { pathArc } from "./path";

export interface PieProps {
  dataKey: string;
  nameKey?: string;
  innerRadius?: number;
  outerRadius?: number;
  colors?: string[];
  cx?: number;
  cy?: number;
  padAngle?: number; // radians
}

const DEFAULT_PALETTE = [
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#ef4444" // Red
];

export function Pie(props: PieProps): Child {
  return () => {
    const ctx = useChartContext();

    const innerRadius = props.innerRadius ?? 0;
    const outerRadius = props.outerRadius ?? 80;
    const colors = props.colors ?? DEFAULT_PALETTE;
    const padAngle = props.padAngle ?? 0.02;

    return (
      <g class="visage-pie">
        {() => {
          const dataArr = ctx.data();
          if (dataArr.length === 0) return null;

          const w = ctx.innerWidth();
          const h = ctx.innerHeight();
          const centerX = props.cx ?? w / 2;
          const centerY = props.cy ?? h / 2;

          let total = 0;
          for (const item of dataArr) {
            const val = Number(item[props.dataKey]) || 0;
            total += val;
          }

          if (total === 0) return null;

          const slices: Child[] = [];
          let currentAngle = -Math.PI / 2; // start from 12 o'clock

          for (let i = 0; i < dataArr.length; i++) {
            const item = dataArr[i];
            const val = Number(item[props.dataKey]) || 0;
            const sliceAngle = (val / total) * (2 * Math.PI);
            const startAngle = currentAngle + (val > 0 ? padAngle / 2 : 0);
            const endAngle = currentAngle + sliceAngle - (val > 0 ? padAngle / 2 : 0);

            currentAngle += sliceAngle;

            if (val <= 0 || endAngle <= startAngle) continue;

            const d = pathArc({
              cx: centerX,
              cy: centerY,
              innerRadius,
              outerRadius,
              startAngle,
              endAngle
            });

            const fill = colors[i % colors.length];

            slices.push(<path d={d} fill={fill} stroke="#ffffff" stroke-width={1.5} />);
          }

          return slices;
        }}
      </g>
    );
  };
}
