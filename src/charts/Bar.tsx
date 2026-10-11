import type { Child } from "../dom";
import { onCleanup } from "../signals";
import { useChartContext } from "./context";

export interface BarProps {
  dataKey: string;
  fill?: string;
  radius?: number;
  maxWidth?: number;
  name?: string;
  opacity?: number | string;
}

export function Bar(props: BarProps): Child {
  return () => {
    const ctx = useChartContext();

    const fill = props.fill ?? "#6366f1";
    const radius = props.radius ?? 4;
    const id = `bar-${props.dataKey}-${Math.random().toString(36).slice(2, 7)}`;

    ctx.registerSeries({
      id,
      dataKey: props.dataKey,
      type: "bar",
      color: fill,
      name: props.name ?? props.dataKey
    });

    onCleanup(() => {
      ctx.unregisterSeries(id);
    });

    return (
      <g class={`visage-bar-${props.dataKey}`} opacity={props.opacity ?? 1}>
        {() => {
          const dataArr = ctx.data();
          if (dataArr.length === 0) return null;

          const xScale = ctx.xScale();
          const yScale = ctx.yScale();
          const baselineY = ctx.innerHeight();

          // Check if there are other Bar series to calculate grouped offsets
          const allBars = ctx.series().filter((s) => s.type === "bar");
          const barIndex = allBars.findIndex((s) => s.id === id);
          const totalBars = Math.max(1, allBars.length);

          const bars: Child[] = [];

          for (let i = 0; i < dataArr.length; i++) {
            const item = dataArr[i];
            const val = item[props.dataKey];
            if (typeof val !== "number" || Number.isNaN(val)) continue;

            let slotX = 0;
            let slotW = 20;

            if (xScale.type === "band") {
              slotX = xScale(i);
              slotW = xScale.bandwidth();
            } else {
              const stepW = ctx.innerWidth() / Math.max(1, dataArr.length);
              slotX = xScale(i) - stepW / 2;
              slotW = stepW * 0.8;
            }

            // Grouped bar width
            const subBarW = slotW / totalBars;
            const barW = props.maxWidth ? Math.min(props.maxWidth, subBarW) : subBarW;
            const barX = slotX + (barIndex >= 0 ? barIndex * subBarW : 0) + (subBarW - barW) / 2;

            const y = yScale(val);
            const h = Math.max(0, baselineY - y);

            bars.push(
              <rect x={barX} y={y} width={barW} height={h} rx={radius} ry={radius} fill={fill} />
            );
          }

          return bars;
        }}
      </g>
    );
  };
}
