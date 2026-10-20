import type { Child } from "@dom";
import type { ClassProp, HTMLAttributes } from "@jsx-runtime/jsx";
import { resolveDimension, space } from "./scale";

export const ALIGN_MAP: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline"
};

export const JUSTIFY_MAP: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
  stretch: "stretch"
};

export interface BaseLayoutProps extends HTMLAttributes<HTMLDivElement> {
  as?: string;
  gap?: number | string;
  p?: number | string;
  px?: number | string;
  py?: number | string;
  pt?: number | string;
  pb?: number | string;
  pl?: number | string;
  pr?: number | string;
  m?: number | string;
  mx?: number | string;
  my?: number | string;
  mt?: number | string;
  mb?: number | string;
  ml?: number | string;
  mr?: number | string;
  w?: number | string;
  h?: number | string;
  minW?: number | string;
  maxW?: number | string;
  minH?: number | string;
  maxH?: number | string;
  class?: ClassProp;
  className?: ClassProp;
  style?: any;
  children?: Child;
  [key: string]: any;
}

export function resolveBaseStyles(props: BaseLayoutProps): Record<string, string> {
  const s: Record<string, string> = {
    boxSizing: "border-box"
  };

  if (props.gap !== undefined) s.gap = space(props.gap);
  if (props.p !== undefined) s.padding = space(props.p);
  if (props.px !== undefined) {
    s.paddingLeft = space(props.px);
    s.paddingRight = space(props.px);
  }
  if (props.py !== undefined) {
    s.paddingTop = space(props.py);
    s.paddingBottom = space(props.py);
  }
  if (props.pt !== undefined) s.paddingTop = space(props.pt);
  if (props.pb !== undefined) s.paddingBottom = space(props.pb);
  if (props.pl !== undefined) s.paddingLeft = space(props.pl);
  if (props.pr !== undefined) s.paddingRight = space(props.pr);

  if (props.m !== undefined) s.margin = space(props.m);
  if (props.mx !== undefined) {
    s.marginLeft = space(props.mx);
    s.marginRight = space(props.mx);
  }
  if (props.my !== undefined) {
    s.marginTop = space(props.my);
    s.marginBottom = space(props.my);
  }
  if (props.mt !== undefined) s.marginTop = space(props.mt);
  if (props.mb !== undefined) s.marginBottom = space(props.mb);
  if (props.ml !== undefined) s.marginLeft = space(props.ml);
  if (props.mr !== undefined) s.marginRight = space(props.mr);

  if (props.w !== undefined) s.width = resolveDimension(props.w);
  if (props.h !== undefined) s.height = resolveDimension(props.h);
  if (props.minW !== undefined) s.minWidth = resolveDimension(props.minW);
  if (props.maxW !== undefined) s.maxWidth = resolveDimension(props.maxW);
  if (props.minH !== undefined) s.minHeight = resolveDimension(props.minH);
  if (props.maxH !== undefined) s.maxHeight = resolveDimension(props.maxH);

  return s;
}

export function mergeStyles(base: Record<string, string>, userStyle: any): any {
  if (!userStyle) return base;
  if (typeof userStyle === "string") {
    const baseStr = Object.entries(base)
      .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`)
      .join("; ");
    return `${baseStr}; ${userStyle}`;
  }
  if (typeof userStyle === "object") {
    return { ...base, ...userStyle };
  }
  return base;
}

export function cleanProps(
  props: Record<string, any>,
  excludeKeys: Set<string>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const k in props) {
    if (!excludeKeys.has(k)) {
      result[k] = props[k];
    }
  }
  return result;
}

export const COMMON_EXCLUDE = new Set([
  "as",
  "gap",
  "p",
  "px",
  "py",
  "pt",
  "pb",
  "pl",
  "pr",
  "m",
  "mx",
  "my",
  "mt",
  "mb",
  "ml",
  "mr",
  "w",
  "h",
  "minW",
  "maxW",
  "minH",
  "maxH"
]);
