import type { Child } from "@dom";
import { onCleanup } from "@signals";
import { useChartContext } from "./context";
import { pathArea, pathLine } from "./path";
import type { CurveType, Point } from "./types";

export interface AreaProps {
  id?: string;
  dataKey: string;
  stroke?: string;
  strokeWidth?: number | string;
  fill?: string;
  fillOpacity?: number | string;
  curve?: CurveType;
  dot?: boolean | { r?: number; fill?: string; stroke?: string };
  name?: string;
  opacity?: number | string;
}

export function Area(props: AreaProps): Child {
  const seriesId = props.id ?? `area-${props.dataKey}`;
  return () => {
    const ctx = useChartContext();

    const stroke = props.stroke ?? "#a855f7";
    const strokeWidth = props.strokeWidth ?? 2;
    const fill = props.fill ?? "rgba(168, 85, 247, 0.15)";
    const fillOpacity = props.fillOpacity ?? 1;
    const curve = props.curve ?? "smooth";

    ctx.registerSeries({
      id: seriesId,
      dataKey: props.dataKey,
      type: "area",
      color: stroke,
      name: props.name ?? props.dataKey
    });

    onCleanup(() => {
      ctx.unregisterSeries(seriesId);
    });

    return (
      <g class={`visage-area-${props.dataKey}`} opacity={props.opacity ?? 1}>
        {() => {
          const dataArr = ctx.data();
          if (dataArr.length === 0) return null;

          const xScale = ctx.xScale();
          const yScale = ctx.yScale();
          const baselineY = ctx.innerHeight();

          const points: Point[] = [];
          for (let i = 0; i < dataArr.length; i++) {
            const item = dataArr[i];
            const val = item[props.dataKey];
            if (typeof val !== "number" || Number.isNaN(val)) continue;

            let x = 0;
            if (xScale.type === "band") {
              x = xScale(i) + xScale.bandwidth() / 2;
            } else {
              x = xScale(i);
            }

            const y = yScale(val);
            points.push({ x, y });
          }

          const areaD = pathArea(points, baselineY, { curve });
          const lineD = pathLine(points, { curve });

          const dots: Child[] = [];
          if (props.dot && points.length > 0) {
            const dotCfg = typeof props.dot === "object" ? props.dot : {};
            const r = dotCfg.r ?? 3.5;
            const dotFill = dotCfg.fill ?? "#ffffff";
            const dotStroke = dotCfg.stroke ?? stroke;

            for (let i = 0; i < points.length; i++) {
              const p = points[i]!;
              dots.push(
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={dotFill}
                  stroke={dotStroke}
                  stroke-width={2}
                />
              );
            }
          }

          return [
            <path d={areaD} fill={fill} fill-opacity={fillOpacity} />,
            <path
              d={lineD}
              fill="none"
              stroke={stroke}
              stroke-width={strokeWidth}
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
