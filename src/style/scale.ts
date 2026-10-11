/**
 * Visage Spatial Engine & Style Primitives
 *
 * Eliminates measurement fatigue, layout bugs, and manual viewport calculations.
 * Standardizes on a crisp 4px spatial scale, semantic viewport intents,
 * fluid clamp calculations, and typed visual design tokens.
 */

export const UNITLESS_PROPERTIES = new Set([
  "animationIterationCount",
  "aspectRatio",
  "borderImageSlice",
  "columnCount",
  "columns",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexOrder",
  "fontWeight",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
  "fillOpacity",
  "strokeOpacity"
]);

export const DIMENSION_KEYWORDS: Record<string, string> = {
  screen: "100dvh",
  "screen-h": "100dvh",
  "screen-w": "100dvw",
  full: "100%",
  half: "50%",
  third: "33.333333%",
  "two-thirds": "66.666667%",
  quarter: "25%",
  "three-quarters": "75%",
  auto: "auto",
  min: "min-content",
  max: "max-content",
  fit: "fit-content"
};

/**
 * Resolves a spatial scale step or dimensional intent to a valid CSS measurement.
 * Numbers map to the 4px engineering grid (1 = 4px, 2 = 8px, 4 = 16px, 8 = 32px).
 *
 * @example
 * space(1)        // "4px"
 * space(2)        // "8px"
 * space(4)        // "16px"
 * space(6)        // "24px"
 * space("full")   // "100%"
 * space("screen") // "100dvh"
 */
export function space(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "";
  if (typeof val === "number") {
    if (val === 0) return "0px";
    return `${val * 4}px`;
  }
  const str = String(val).trim();
  if (str in DIMENSION_KEYWORDS) {
    return DIMENSION_KEYWORDS[str]!;
  }
  return str;
}

/**
 * Resolves width, height, or grid sizing into valid CSS.
 * Small numbers (<= 48) map to the 4px scale, while larger numbers (> 48)
 * are treated as explicit pixel dimensions.
 */
export function resolveDimension(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "";
  if (typeof val === "number") {
    if (val === 0) return "0px";
    if (val > 48) return `${val}px`;
    return `${val * 4}px`;
  }
  const str = String(val).trim();
  if (str in DIMENSION_KEYWORDS) {
    return DIMENSION_KEYWORDS[str]!;
  }
  return str;
}

/**
 * Explicit raw pixel measurement helper.
 */
export function px(val: number): string {
  return `${val}px`;
}

/**
 * Explicit rem measurement helper.
 */
export function rem(val: number): string {
  return `${val}rem`;
}

/**
 * Explicit em measurement helper.
 */
export function em(val: number): string {
  return `${val}em`;
}

/**
 * Computes an optimal fluid clamp() expression.
 * Eliminates the math nightmare of manual linear viewport interpolation slopes.
 *
 * @param minPx Minimum size in pixels at mobile viewport
 * @param maxPx Maximum size in pixels at desktop viewport
 * @param options Min/max viewport bounds (defaults to 375px mobile and 1280px desktop)
 *
 * @example
 * fluid(16, 32)
 * // clamp(16px, 9.38px + 1.77vw, 32px)
 */
export function fluid(
  minPx: number,
  maxPx: number,
  options?: { minVw?: number; maxVw?: number }
): string {
  const minVw = options?.minVw ?? 375;
  const maxVw = options?.maxVw ?? 1280;
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const yIntercept = -minVw * slope + minPx;
  const slopeVw = slope * 100;
  const preferred = `${yIntercept.toFixed(2)}px + ${slopeVw.toFixed(2)}vw`;
  const min = Math.min(minPx, maxPx);
  const max = Math.max(minPx, maxPx);
  return `clamp(${min}px, ${preferred}, ${max}px)`;
}

export type ShadowVariant = "none" | "sm" | "md" | "lg" | "xl" | "soft" | "glow" | "inner";

export const SHADOW_PRESETS: Record<ShadowVariant, string> = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  soft: "0 8px 30px rgba(0, 0, 0, 0.06)",
  glow: "0 0 24px rgba(168, 85, 247, 0.35)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)"
};

/**
 * Returns typed box-shadow tokens designed for high-contrast optical depth.
 */
export function shadow(variant: ShadowVariant | string): string {
  if (variant in SHADOW_PRESETS) {
    return SHADOW_PRESETS[variant as ShadowVariant]!;
  }
  return variant;
}

export type RadiusVariant = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full" | number;

export const RADIUS_PRESETS: Record<string, string> = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  "3xl": "24px",
  full: "9999px"
};

/**
 * Returns typed border-radius tokens or scale numbers.
 */
export function radius(variant: RadiusVariant): string {
  if (typeof variant === "number") {
    return `${variant}px`;
  }
  if (variant in RADIUS_PRESETS) {
    return RADIUS_PRESETS[variant]!;
  }
  return String(variant);
}

export interface GlassOptions {
  blur?: number | string;
  tint?: string;
  border?: string;
}

/**
 * Generates tactile glassmorphism CSS styles with backdrop filters and frosted borders.
 */
export function glass(options: GlassOptions = {}): Record<string, string> {
  const blurVal = typeof options.blur === "number" ? `${options.blur}px` : (options.blur ?? "20px");
  const tintVal = options.tint ?? "rgba(255, 255, 255, 0.65)";
  const borderVal = options.border ?? "1px solid rgba(255, 255, 255, 0.75)";

  return {
    backdropFilter: `blur(${blurVal})`,
    WebkitBackdropFilter: `blur(${blurVal})`,
    backgroundColor: tintVal,
    border: borderVal
  };
}

/**
 * Formats a style property value for direct DOM binding or SSR generation.
 * Handles automatic unit resolution, dimension keywords, and custom CSS variables.
 */
export function formatStyleProp(prop: string, val: any): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number") {
    if (val === 0 || UNITLESS_PROPERTIES.has(prop)) {
      return String(val);
    }
    return `${val}px`;
  }

  const str = String(val).trim();
  if (str in DIMENSION_KEYWORDS) {
    const lowerProp = prop.toLowerCase();
    if (str === "screen") {
      if (lowerProp.includes("width")) return "100dvw";
      return "100dvh";
    }
    return DIMENSION_KEYWORDS[str]!;
  }

  return str;
}
