export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type CurveType = "linear" | "smooth" | "step";

export interface Point {
  x: number;
  y: number;
}

export interface LinearScale {
  type: "linear";
  (val: number): number;
  domain: [number, number];
  range: [number, number];
  invert: (pixel: number) => number;
  ticks: (count?: number) => number[];
}

export interface BandScale {
  type: "band";
  (val: any): number;
  domain: any[];
  range: [number, number];
  bandwidth: () => number;
  step: () => number;
  ticks: () => any[];
}

export type AnyScale = LinearScale | BandScale;

export interface HoverState {
  active: boolean;
  x: number;
  y: number;
  index: number;
  datum?: any;
}

export interface SeriesMeta {
  id: string;
  dataKey: string;
  type: "line" | "area" | "bar";
  color?: string;
  name?: string;
}
