import type { Child } from "../dom";
import { onCleanup } from "../signals";
import { useChartContext } from "./context";

export interface XAxisProps {
  dataKey?: string;
  tickFormat?: (val: any, index: number) => string;
  tickCount?: number;
  stroke?: string;
  fontSize?: number | string;
  fontFamily?: string;
  hideLine?: boolean;
}

export function XAxis(props: XAxisProps): Child {
  return () => {
    const ctx = useChartContext();

    if (props.dataKey) {
      ctx.setXDataKey(props.dataKey);
      onCleanup(() => {
        if (ctx.xDataKey() === props.dataKey) {
          ctx.setXDataKey("");
        }
      });
    }

    const stroke = props.stroke ?? "#94a3b8";
    const fontSize = props.fontSize ?? 11;
    const hideLine = props.hideLine ?? false;

    const w = ctx.innerWidth();
    const h = ctx.innerHeight();
    const xScale = ctx.xScale();
    const dataArr = ctx.data();

    const elements: Child[] = [];

    if (!hideLine) {
      elements.push(<line x1={0} y1={h} x2={w} y2={h} stroke={stroke} stroke-width={1} />);
    }

    if (xScale.type === "band") {
      const ticks = xScale.ticks();
      const bw = xScale.bandwidth();
      for (let i = 0; i < ticks.length; i++) {
        const val = ticks[i];
        const x = xScale(i) + bw / 2;
        const text = props.tickFormat ? props.tickFormat(val, i) : String(val);
        elements.push(
          <text x={x} y={h + 16} text-anchor="middle" font-size={fontSize} fill={stroke}>
            {text}
          </text>
        );
      }
    } else {
      const count = props.tickCount ?? 5;
      const ticks = xScale.ticks(count);
      for (let i = 0; i < ticks.length; i++) {
        const tickIdx = ticks[i]!;
        const x = xScale(tickIdx);
        const idx = Math.max(0, Math.min(dataArr.length - 1, Math.round(tickIdx)));
        const rawItem = dataArr[idx];
        const rawVal = props.dataKey && rawItem ? rawItem[props.dataKey] : idx;
        const text = props.tickFormat ? props.tickFormat(rawVal, i) : String(rawVal ?? idx);

        elements.push(
          <text x={x} y={h + 16} text-anchor="middle" font-size={fontSize} fill={stroke}>
            {text}
          </text>
        );
      }
    }

    return <g class="visage-x-axis">{elements}</g>;
  };
}

export interface YAxisProps {
  dataKey?: string;
  tickFormat?: (val: any, index: number) => string;
  unit?: string;
  tickCount?: number;
  stroke?: string;
  fontSize?: number | string;
  hideLine?: boolean;
}

export function YAxis(props: YAxisProps): Child {
  return () => {
    const ctx = useChartContext();

    const stroke = props.stroke ?? "#94a3b8";
    const fontSize = props.fontSize ?? 11;
    const hideLine = props.hideLine ?? true;
    const unit = props.unit ?? "";

    const h = ctx.innerHeight();
    const yScale = ctx.yScale();
    const ticks = yScale.ticks(props.tickCount ?? 5);

    const elements: Child[] = [];

    if (!hideLine) {
      elements.push(<line x1={0} y1={0} x2={0} y2={h} stroke={stroke} stroke-width={1} />);
    }

    for (let i = 0; i < ticks.length; i++) {
      const val = ticks[i]!;
      const y = yScale(val);
      const formatted = props.tickFormat
        ? props.tickFormat(val, i)
        : unit
          ? `${val}${unit}`
          : String(val);

      elements.push(
        <text x={-8} y={y + 4} text-anchor="end" font-size={fontSize} fill={stroke}>
          {formatted}
        </text>
      );
    }

    return <g class="visage-y-axis">{elements}</g>;
  };
}
