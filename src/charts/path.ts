import type { CurveType, Point } from "./types";

export interface PathLineOptions {
  curve?: CurveType;
}

/**
 * Generates an SVG path `d` string representing a polyline or smooth spline curve.
 */
export function pathLine(points: Point[], options: PathLineOptions = {}): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0]!;
    return `M ${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }

  const curve = options.curve ?? "linear";

  if (curve === "smooth" && points.length >= 2) {
    if (points.length === 2) {
      const p0 = points[0]!;
      const p1 = points[1]!;
      return `M ${p0.x.toFixed(2)},${p0.y.toFixed(2)} L ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
    }

    const n = points.length;
    const dx: number[] = [];
    const dy: number[] = [];
    const slopes: number[] = [];

    for (let i = 0; i < n - 1; i++) {
      const pA = points[i]!;
      const pB = points[i + 1]!;
      const deltaX = pB.x - pA.x;
      const deltaY = pB.y - pA.y;
      dx.push(deltaX);
      dy.push(deltaY);
      slopes.push(deltaX === 0 ? 0 : deltaY / deltaX);
    }

    const m: number[] = new Array(n).fill(0);
    m[0] = slopes[0]!;
    m[n - 1] = slopes[n - 2]!;

    for (let i = 1; i < n - 1; i++) {
      const sPrev = slopes[i - 1]!;
      const sNext = slopes[i]!;
      if (sPrev * sNext <= 0) {
        m[i] = 0;
      } else {
        const dxPrev = dx[i - 1]!;
        const dxNext = dx[i]!;
        const common = dxPrev + dxNext;
        m[i] =
          common === 0 ? 0 : (3 * common) / ((common + dxNext) / sPrev + (common + dxPrev) / sNext);
      }
    }

    let d = `M ${points[0]!.x.toFixed(2)},${points[0]!.y.toFixed(2)}`;
    for (let i = 0; i < n - 1; i++) {
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const deltaX = dx[i]!;
      const cp1x = p1.x + deltaX / 3;
      const cp1y = p1.y + (m[i]! * deltaX) / 3;
      const cp2x = p2.x - deltaX / 3;
      const cp2y = p2.y - (m[i + 1]! * deltaX) / 3;

      d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
    }
    return d;
  }

  if (curve === "step") {
    let d = `M ${points[0]!.x.toFixed(2)},${points[0]!.y.toFixed(2)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const midX = (p1.x + p2.x) / 2;
      d += ` L ${midX.toFixed(2)},${p1.y.toFixed(2)} L ${midX.toFixed(2)},${p2.y.toFixed(2)} L ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
    }
    return d;
  }

  // Linear
  let d = `M ${points[0]!.x.toFixed(2)},${points[0]!.y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i]!.x.toFixed(2)},${points[i]!.y.toFixed(2)}`;
  }
  return d;
}

export interface PathAreaOptions {
  curve?: CurveType;
}

/**
 * Generates an SVG path `d` string for a closed area polygon, anchored to a baseline Y coordinate.
 */
export function pathArea(
  points: Point[],
  baselineY: number,
  options: PathAreaOptions = {}
): string {
  if (points.length === 0) return "";

  const lineD = pathLine(points, options);
  if (!lineD) return "";

  const first = points[0]!;
  const last = points[points.length - 1]!;

  return `${lineD} L ${last.x.toFixed(2)},${baselineY.toFixed(2)} L ${first.x.toFixed(2)},${baselineY.toFixed(2)} Z`;
}

export interface ArcOptions {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number; // in radians
  endAngle: number; // in radians
}

/**
 * Generates an SVG arc path string for a pie or donut slice.
 */
export function pathArc(options: ArcOptions): string {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = options;

  const cosStart = Math.cos(startAngle);
  const sinStart = Math.sin(startAngle);
  const cosEnd = Math.cos(endAngle);
  const sinEnd = Math.sin(endAngle);

  const x0 = cx + outerRadius * cosStart;
  const y0 = cy + outerRadius * sinStart;
  const x1 = cx + outerRadius * cosEnd;
  const y1 = cy + outerRadius * sinEnd;

  const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;

  if (innerRadius <= 0) {
    // Pie slice (wedge down to center)
    return `M ${cx.toFixed(2)},${cy.toFixed(2)} L ${x0.toFixed(2)},${y0.toFixed(2)} A ${outerRadius.toFixed(2)},${outerRadius.toFixed(2)} 0 ${largeArcFlag} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
  }

  // Donut slice (arc from outer down to inner arc and back)
  const x2 = cx + innerRadius * cosEnd;
  const y2 = cy + innerRadius * sinEnd;
  const x3 = cx + innerRadius * cosStart;
  const y3 = cy + innerRadius * sinStart;

  return `M ${x0.toFixed(2)},${y0.toFixed(2)} A ${outerRadius.toFixed(2)},${outerRadius.toFixed(2)} 0 ${largeArcFlag} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L ${x2.toFixed(2)},${y2.toFixed(2)} A ${innerRadius.toFixed(2)},${innerRadius.toFixed(2)} 0 ${largeArcFlag} 0 ${x3.toFixed(2)},${y3.toFixed(2)} Z`;
}
