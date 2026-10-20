import { type Child, resolveValue } from "@dom";
import type { ClassProp, ReactiveProp } from "@jsx-runtime/jsx";
import { computed, onCleanup, signal, untrack } from "@signals";
import { ChartContext, type ChartContextValue } from "./context";
import { createBandScale, createLinearScale } from "./scale";
import type { AnyScale, HoverState, Margin, SeriesMeta } from "./types";

export interface ChartProps {
  data: ReactiveProp<any[]>;
  width?: number | string;
  height?: number | string;
  margin?: Partial<Margin>;
  yDomain?: [number, number];
  class?: ClassProp;
  className?: ClassProp;
  style?: any;
  children?: Child;
  [key: string]: any;
}

const DEFAULT_MARGIN: Margin = {
  top: 16,
  right: 16,
  bottom: 24,
  left: 36
};

export function Chart(props: ChartProps): Child {
  const margin: Margin = {
    ...DEFAULT_MARGIN,
    ...props.margin
  };

  const initialW = typeof props.width === "number" ? props.width : 500;
  const initialH = typeof props.height === "number" ? props.height : 300;

  const measuredWidth = signal<number>(initialW);
  const measuredHeight = signal<number>(initialH);

  let containerEl: HTMLElement | null = null;

  const handleRef = (el: HTMLElement) => {
    if (!el || typeof el !== "object") return;
    containerEl = el;
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          if (cr.width > 0) measuredWidth.set(cr.width);
          if (cr.height > 0) measuredHeight.set(cr.height);
        }
      });
      ro.observe(el);
      onCleanup(() => ro.disconnect());
    } else {
      if (typeof el.clientWidth === "number" && el.clientWidth > 0)
        measuredWidth.set(el.clientWidth);
      if (typeof el.clientHeight === "number" && el.clientHeight > 0)
        measuredHeight.set(el.clientHeight);
    }
  };

  const innerWidth = computed(() => Math.max(10, measuredWidth() - margin.left - margin.right));
  const innerHeight = computed(() => Math.max(10, measuredHeight() - margin.top - margin.bottom));

  const rawData = () => resolveValue(props.data) || [];

  const seriesList = signal<SeriesMeta[]>([]);
  const xDataKey = signal<string | undefined>(undefined);

  const registerSeries = (meta: SeriesMeta) => {
    untrack(() => {
      seriesList.update((prev) => {
        const existingIdx = prev.findIndex((s) => s.id === meta.id || s.dataKey === meta.dataKey);
        if (existingIdx !== -1) {
          const existing = prev[existingIdx];
          if (
            existing &&
            existing.id === meta.id &&
            existing.dataKey === meta.dataKey &&
            existing.name === meta.name &&
            existing.color === meta.color &&
            existing.type === meta.type
          ) {
            return prev;
          }
          const updated = [...prev];
          updated[existingIdx] = meta;
          return updated;
        }
        return [...prev, meta];
      });
    });
  };

  const unregisterSeries = (id: string) => {
    untrack(() => {
      seriesList.update((prev) => prev.filter((s) => s.id !== id && s.dataKey !== id));
    });
  };

  const hoverState = signal<HoverState>({
    active: false,
    x: 0,
    y: 0,
    index: -1
  });

  const xScale = computed<AnyScale>(() => {
    const dataArr = rawData();
    const w = innerWidth();
    const key = xDataKey();

    const hasBarSeries = untrack(() => seriesList().some((s) => s.type === "bar"));

    if (hasBarSeries && key && dataArr.length > 0) {
      const categories = dataArr.map((d: any) => String(d[key]));
      return createBandScale(categories, [0, w], {
        paddingInner: 0.1,
        paddingOuter: 0.05
      });
    }

    const maxIdx = Math.max(1, dataArr.length - 1);
    return createLinearScale([0, maxIdx], [0, w]);
  });

  const yScale = computed(() => {
    const h = innerHeight();
    const dataArr = rawData();
    const currentSeries = seriesList();

    let minY = 0;
    let maxY = 10;

    if (props.yDomain) {
      minY = props.yDomain[0];
      maxY = props.yDomain[1];
    } else if (dataArr.length > 0 && currentSeries.length > 0) {
      let foundMin = Infinity;
      let foundMax = -Infinity;

      for (const item of dataArr) {
        for (const s of currentSeries) {
          const val = item[s.dataKey];
          if (typeof val === "number" && !Number.isNaN(val)) {
            if (val < foundMin) foundMin = val;
            if (val > foundMax) foundMax = val;
          }
        }
      }

      if (foundMax > -Infinity) {
        minY = Math.min(0, foundMin);
        maxY = foundMax === 0 ? 1 : foundMax * 1.1; // 10% headroom
      }
    }

    // SVG coordinate space: 0 is top, innerHeight is bottom
    return createLinearScale([minY, maxY], [h, 0], { nice: true });
  });

  const handlePointer = (clientX: number, clientY: number) => {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const relX = clientX - rect.left - margin.left;
    const relY = clientY - rect.top - margin.top;

    const w = innerWidth();
    const h = innerHeight();

    if (relX < 0 || relX > w || relY < 0 || relY > h) {
      hoverState.set({ active: false, x: 0, y: 0, index: -1 });
      return;
    }

    const dataArr = rawData();
    if (dataArr.length === 0) return;

    const count = dataArr.length;
    const stepW = w / Math.max(1, count - 1);
    const rawIdx = Math.round(relX / stepW);
    const clampedIdx = Math.max(0, Math.min(count - 1, rawIdx));

    hoverState.set({
      active: true,
      x: relX + margin.left,
      y: relY + margin.top,
      index: clampedIdx,
      datum: dataArr[clampedIdx]
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    handlePointer(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    hoverState.set({ active: false, x: 0, y: 0, index: -1 });
  };

  const handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (touch) handlePointer(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    hoverState.set({ active: false, x: 0, y: 0, index: -1 });
  };

  const ctxValue: ChartContextValue = {
    data: rawData,
    width: () => measuredWidth(),
    height: () => measuredHeight(),
    margin,
    innerWidth: () => innerWidth(),
    innerHeight: () => innerHeight(),
    xScale: () => xScale(),
    yScale: () => yScale(),
    hoverState: () => hoverState(),
    setHoverState: (s) => hoverState.set(s),
    xDataKey: () => xDataKey(),
    setXDataKey: (k) => xDataKey.set(k),
    series: () => seriesList(),
    registerSeries,
    unregisterSeries
  };

  const containerStyle = {
    position: "relative",
    width: typeof props.width === "number" ? `${props.width}px` : (props.width ?? "100%"),
    height: typeof props.height === "number" ? `${props.height}px` : (props.height ?? "300px"),
    touchAction: "none",
    userSelect: "none",
    ...props.style
  };

  const rawChildren = Array.isArray(props.children) ? props.children : [props.children];
  const childrenList: any[] = [];
  const stack = [...rawChildren];
  while (stack.length > 0) {
    const item = stack.shift();
    if (Array.isArray(item)) {
      stack.unshift(...item);
    } else if (item !== null && item !== undefined && item !== false) {
      childrenList.push(item);
    }
  }

  const svgChildren: Child[] = [];
  const overlayChildren: Child[] = [];

  for (const child of childrenList) {
    if (typeof child === "function" && (child as any).__visage_overlay) {
      overlayChildren.push(child);
    } else {
      svgChildren.push(child);
    }
  }

  return ChartContext.Provider({
    value: ctxValue,
    children: () => (
      <div
        ref={handleRef}
        class={props.class || props.className}
        style={containerStyle}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          role="img"
          aria-label={props["aria-label"] ?? "Data visualization chart"}
          viewBox={() => `0 0 ${measuredWidth()} ${measuredHeight()}`}
          width="100%"
          height="100%"
          style={{ overflow: "visible", display: "block" }}
        >
          <title>{props.title ?? "Data Visualization Chart"}</title>
          <g transform={`translate(${margin.left}, ${margin.top})`}>{svgChildren}</g>
        </svg>
        {overlayChildren}
      </div>
    )
  });
}
