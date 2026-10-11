import { createContext, useContext } from "../signals";
import type { AnyScale, HoverState, LinearScale, Margin, SeriesMeta } from "./types";

export interface ChartContextValue {
  data: () => any[];
  width: () => number;
  height: () => number;
  margin: Margin;
  innerWidth: () => number;
  innerHeight: () => number;
  xScale: () => AnyScale;
  yScale: () => LinearScale;
  hoverState: () => HoverState;
  setHoverState: (state: HoverState) => void;
  xDataKey: () => string | undefined;
  setXDataKey: (key: string) => void;
  series: () => SeriesMeta[];
  registerSeries: (meta: SeriesMeta) => void;
  unregisterSeries: (id: string) => void;
}

export const ChartContext = createContext<ChartContextValue | undefined>(undefined);

export function useChartContext(): ChartContextValue {
  const ctx = useContext(ChartContext);
  if (!ctx) {
    throw new Error("Visage Chart child component must be rendered within a <Chart> container.");
  }
  return ctx;
}
