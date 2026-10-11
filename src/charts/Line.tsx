/** @jsxImportSource visage */
import type { Child } from "../dom";
import { onCleanup } from "../signals";
import { useChartContext } from "./context";
import { pathLine } from "./path";
import type { CurveType, Point } from "./types";

export interface LineProps {
  dataKey: string;
  stroke?: string;
  strokeWidth?: number | string;
  strokeDasharray?: string;
  curve?: CurveType;
  dot?: boolean | { r?: number; fill?: string; stroke?: string; strokeWidth?: number };
  name?: string;
  opacity?: number | string;
}

export function Line(props: LineProps): Child {
  return () => {
    const ctx = useChartContext();

    const stroke = props.stroke ?? "#8b5cf6";
    const strokeWidth = props.strokeWidth ?? 2;
    const curve = props.curve ?? "linear";
    const id = `line-${props.dataKey}-${Math.random().toString(36).slice(2, 7)}`;

    ctx.registerSeries({
      id,
      dataKey: props.dataKey,
      type: "line",
      color: stroke,
      name: props.name ?? props.dataKey
    });

    onCleanup(() => {
      ctx.unregisterSeries(id);
    });

    return (
      <g class={`visage-line-${props.dataKey}`} opacity={props.opacity ?? 1}>
        {() => {
          const dataArr = ctx.data();
          if (dataArr.length === 0) return null;

          const xScale = ctx.xScale();
          const yScale = ctx.yScale();
          const xKey = ctx.xDataKey();

          const points: Point[] = [];
          for (let i = 0; i < dataArr.length; i++) {
            const item = dataArr[i];
            const val = item[props.dataKey];
            if (typeof val !== "number" || Number.isNaN(val)) continue;

            let x = 0;
            if (xScale.type === "band") {
              const cat = xKey ? item[xKey] : String(i);
              x = xScale(cat) + xScale.bandwidth() / 2;
            } else {
              x = xScale(i);
            }

            const y = yScale(val);
            points.push({ x, y });
          }

          const d = pathLine(points, { curve });

          const dots: Child[] = [];
          if (props.dot && points.length > 0) {
            const dotCfg = typeof props.dot === "object" ? props.dot : {};
            const r = dotCfg.r ?? 3.5;
            const fill = dotCfg.fill ?? "#ffffff";
            const dotStroke = dotCfg.stroke ?? stroke;
            const dotSw = dotCfg.strokeWidth ?? 2;

            for (let i = 0; i < points.length; i++) {
              const p = points[i]!;
              dots.push(
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={fill}
                  stroke={dotStroke}
                  stroke-width={dotSw}
                />
              );
            }
          }

          return [
            <path
              d={d}
              fill="none"
              stroke={stroke}
              stroke-width={strokeWidth}
              stroke-dasharray={props.strokeDasharray}
              stroke-linejoin="round"
              stroke-linecap="round"
            />,
            ...dots
          ];
        }}
      </g>
    );
  };
}
