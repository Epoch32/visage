import type { BandScale, LinearScale } from "./types";

/**
 * Calculates human-friendly rounded tick marks across a numerical interval.
 * Uses the standard Wilkinson-style step rounding algorithm.
 */
export function generateNiceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  if (count <= 0) return [];

  const span = max - min;
  const rawStep = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const err = rawStep / magnitude;

  let step: number;
  if (err >= 7.5) {
    step = 10 * magnitude;
  } else if (err >= 3.5) {
    step = 5 * magnitude;
  } else if (err >= 1.5) {
    step = 2 * magnitude;
  } else {
    step = 1 * magnitude;
  }

  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];

  for (let current = start; current <= end + step * 0.5; current += step) {
    // Avoid IEEE 754 precision noise (e.g. 0.30000000000000004)
    const rounded = Number(current.toPrecision(12));
    ticks.push(rounded);
  }

  return ticks;
}

export interface LinearScaleOptions {
  clamp?: boolean;
  nice?: boolean;
}

/**
 * Creates a continuous linear mathematical scale mapping input domain to SVG pixel range.
 */
export function createLinearScale(
  domain: [number, number],
  range: [number, number],
  options: LinearScaleOptions = {}
): LinearScale {
  let [d0, d1] = domain;
  const [r0, r1] = range;

  if (options.nice && d0 !== d1) {
    const ticks = generateNiceTicks(d0, d1, 5);
    if (ticks.length > 0) {
      d0 = Math.min(d0, ticks[0]!);
      d1 = Math.max(d1, ticks[ticks.length - 1]!);
    }
  }

  const fn = ((val: number): number => {
    let v = val;
    if (options.clamp) {
      const minD = Math.min(d0, d1);
      const maxD = Math.max(d0, d1);
      v = Math.max(minD, Math.min(maxD, v));
    }
    const ratio = d1 === d0 ? 0 : (v - d0) / (d1 - d0);
    return r0 + ratio * (r1 - r0);
  }) as LinearScale;

  fn.type = "linear";
  fn.domain = [d0, d1];
  fn.range = [r0, r1];

  fn.invert = (pixel: number): number => {
    const ratio = r1 === r0 ? 0 : (pixel - r0) / (r1 - r0);
    return d0 + ratio * (d1 - d0);
  };

  fn.ticks = (count = 5): number[] => {
    return generateNiceTicks(d0, d1, count);
  };

  return fn;
}

export interface BandScaleOptions {
  paddingInner?: number;
  paddingOuter?: number;
}

/**
 * Creates an ordinal band scale mapping categorical strings (e.g. months, labels)
 * to partitioned SVG pixel bands (used by Bar and column charts).
 */
export function createBandScale(
  domain: any[],
  range: [number, number],
  options: BandScaleOptions = {}
): BandScale {
  const paddingInner = options.paddingInner ?? 0.2;
  const paddingOuter = options.paddingOuter ?? 0.1;

  const n = domain.length;
  const totalSteps = Math.max(1, n - paddingInner + 2 * paddingOuter);
  const step = (range[1] - range[0]) / totalSteps;
  const bandwidth = step * (1 - paddingInner);

  const fn = ((val: any): number => {
    const idx = domain.indexOf(val);
    if (idx === -1) return range[0];
    return range[0] + (idx + paddingOuter) * step;
  }) as BandScale;

  fn.type = "band";
  fn.domain = [...domain];
  fn.range = [range[0], range[1]];

  fn.bandwidth = () => bandwidth;
  fn.step = () => step;
  fn.ticks = () => [...domain];

  return fn;
}
