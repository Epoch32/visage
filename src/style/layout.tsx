/** @jsxImportSource visage */
import type { Child } from "../dom";
import { jsx } from "../jsx-runtime";
import type { ClassProp, HTMLAttributes } from "../jsx-runtime/jsx";
import { resolveDimension, space } from "./scale";

const ALIGN_MAP: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline"
};

const JUSTIFY_MAP: Record<string, string> = {
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

function resolveBaseStyles(props: BaseLayoutProps): Record<string, string> {
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

function mergeStyles(base: Record<string, string>, userStyle: any): any {
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

// Strip layout-specific helper props so they are not set as DOM attributes
function cleanProps(props: Record<string, any>, excludeKeys: Set<string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const k in props) {
    if (!excludeKeys.has(k)) {
      result[k] = props[k];
    }
  }
  return result;
}

const COMMON_EXCLUDE = new Set([
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

export interface StackProps extends BaseLayoutProps {
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  direction?: "vertical" | "horizontal";
  reversed?: boolean;
  wrap?: boolean | "wrap" | "nowrap" | "wrap-reverse";
  inline?: boolean;
}

const STACK_EXCLUDE = new Set([
  ...COMMON_EXCLUDE,
  "align",
  "justify",
  "direction",
  "reversed",
  "wrap",
  "inline"
]);

/**
 * <Stack> Layout Primitive
 *
 * Vertical (column) layout by default. Provides zero margin collapse,
 * built-in spatial scale gap, and automatic flex overflow containment.
 *
 * @example
 * <Stack gap={4} align="center">
 *   <Header />
 *   <Content />
 * </Stack>
 */
export function Stack(props: StackProps): Child {
  const { as = "div", children, ...rest } = props;
  const layoutStyles = resolveBaseStyles(props);

  layoutStyles.display = props.inline ? "inline-flex" : "flex";
  layoutStyles.flexDirection =
    props.direction === "horizontal"
      ? props.reversed
        ? "row-reverse"
        : "row"
      : props.reversed
        ? "column-reverse"
        : "column";

  if (props.align && ALIGN_MAP[props.align]) {
    layoutStyles.alignItems = ALIGN_MAP[props.align]!;
  }
  if (props.justify && JUSTIFY_MAP[props.justify]) {
    layoutStyles.justifyContent = JUSTIFY_MAP[props.justify]!;
  }
  if (props.wrap) {
    layoutStyles.flexWrap = props.wrap === true ? "wrap" : props.wrap;
  }

  const domProps = cleanProps(rest, STACK_EXCLUDE);
  domProps.style = mergeStyles(layoutStyles, props.style);
  domProps.children = children;

  return jsx(as, domProps);
}

export interface RowProps extends BaseLayoutProps {
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  reversed?: boolean;
  wrap?: boolean | "wrap" | "nowrap" | "wrap-reverse";
  inline?: boolean;
}

const ROW_EXCLUDE = new Set([
  ...COMMON_EXCLUDE,
  "align",
  "justify",
  "reversed",
  "wrap",
  "inline"
]);

/**
 * <Row> Layout Primitive
 *
 * Horizontal row layout with sensible vertical centering (align="center") by default.
 *
 * @example
 * <Row gap={3} justify="between">
 *   <Avatar />
 *   <Typography>Online</Typography>
 * </Row>
 */
export function Row(props: RowProps): Child {
  const { as = "div", children, ...rest } = props;
  const layoutStyles = resolveBaseStyles(props);

  layoutStyles.display = props.inline ? "inline-flex" : "flex";
  layoutStyles.flexDirection = props.reversed ? "row-reverse" : "row";
  layoutStyles.alignItems = props.align ? ALIGN_MAP[props.align] ?? props.align : "center";

  if (props.justify && JUSTIFY_MAP[props.justify]) {
    layoutStyles.justifyContent = JUSTIFY_MAP[props.justify]!;
  }
  if (props.wrap) {
    layoutStyles.flexWrap = props.wrap === true ? "wrap" : props.wrap;
  }

  const domProps = cleanProps(rest, ROW_EXCLUDE);
  domProps.style = mergeStyles(layoutStyles, props.style);
  domProps.children = children;

  return jsx(as, domProps);
}

export interface CenterProps extends BaseLayoutProps {
  inline?: boolean;
}

const CENTER_EXCLUDE = new Set([...COMMON_EXCLUDE, "inline"]);

/**
 * <Center> Layout Primitive
 *
 * Centers child content horizontally and vertically without CSS boilerplate.
 *
 * @example
 * <Center h="screen">
 *   <Spinner />
 * </Center>
 */
export function Center(props: CenterProps): Child {
  const { as = "div", children, ...rest } = props;
  const layoutStyles = resolveBaseStyles(props);

  layoutStyles.display = props.inline ? "inline-flex" : "flex";
  layoutStyles.alignItems = "center";
  layoutStyles.justifyContent = "center";

  const domProps = cleanProps(rest, CENTER_EXCLUDE);
  domProps.style = mergeStyles(layoutStyles, props.style);
  domProps.children = children;

  return jsx(as, domProps);
}

export interface GridProps extends BaseLayoutProps {
  columns?: number | string;
  minChildWidth?: number | string;
  rows?: number | string;
  rowGap?: number | string;
  colGap?: number | string;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "stretch";
  inline?: boolean;
}

const GRID_EXCLUDE = new Set([
  ...COMMON_EXCLUDE,
  "columns",
  "minChildWidth",
  "rows",
  "rowGap",
  "colGap",
  "align",
  "justify",
  "inline"
]);

/**
 * <Grid> Layout Primitive
 *
 * Effortless CSS Grid. Specify fixed columns or a responsive minChildWidth
 * to achieve fluid wrapping grids without writing complex media queries.
 *
 * @example
 * // Responsive auto-wrapping grid
 * <Grid minChildWidth={260} gap={4}>
 *   <Card />
 *   <Card />
 * </Grid>
 */
export function Grid(props: GridProps): Child {
  const { as = "div", children, ...rest } = props;
  const layoutStyles = resolveBaseStyles(props);

  layoutStyles.display = props.inline ? "inline-grid" : "grid";

  if (props.minChildWidth !== undefined) {
    const minW = resolveDimension(props.minChildWidth);
    layoutStyles.gridTemplateColumns = `repeat(auto-fit, minmax(min(100%, ${minW}), 1fr))`;
  } else if (props.columns !== undefined) {
    if (typeof props.columns === "number") {
      layoutStyles.gridTemplateColumns = `repeat(${props.columns}, minmax(0, 1fr))`;
    } else {
      layoutStyles.gridTemplateColumns = String(props.columns);
    }
  }

  if (props.rows !== undefined) {
    if (typeof props.rows === "number") {
      layoutStyles.gridTemplateRows = `repeat(${props.rows}, minmax(0, 1fr))`;
    } else {
      layoutStyles.gridTemplateRows = String(props.rows);
    }
  }

  if (props.rowGap !== undefined) layoutStyles.rowGap = space(props.rowGap);
  if (props.colGap !== undefined) layoutStyles.columnGap = space(props.colGap);

  if (props.align) {
    layoutStyles.alignItems = ALIGN_MAP[props.align] ?? props.align;
  }
  if (props.justify) {
    layoutStyles.justifyItems = props.justify;
  }

  const domProps = cleanProps(rest, GRID_EXCLUDE);
  domProps.style = mergeStyles(layoutStyles, props.style);
  domProps.children = children;

  return jsx(as, domProps);
}

export interface SpacerProps extends BaseLayoutProps {
  size?: number | string;
  x?: number | string;
  y?: number | string;
  flex?: boolean | number;
}

const SPACER_EXCLUDE = new Set([...COMMON_EXCLUDE, "size", "x", "y", "flex"]);

/**
 * <Spacer> Layout Primitive
 *
 * Creates flexible pushing space in Rows/Stacks (defaults to flex: 1)
 * or creates a dedicated spatial gap block when given size.
 *
 * @example
 * <Row>
 *   <Logo />
 *   <Spacer />
 *   <UserProfile />
 * </Row>
 */
export function Spacer(props: SpacerProps): Child {
  const { as = "div", ...rest } = props;
  const layoutStyles = resolveBaseStyles(props);

  if (props.size !== undefined) {
    const s = space(props.size);
    layoutStyles.width = s;
    layoutStyles.height = s;
    layoutStyles.flexShrink = "0";
  } else if (props.x !== undefined || props.y !== undefined) {
    if (props.x !== undefined) layoutStyles.width = space(props.x);
    if (props.y !== undefined) layoutStyles.height = space(props.y);
    layoutStyles.flexShrink = "0";
  } else {
    layoutStyles.flex = typeof props.flex === "number" ? String(props.flex) : "1 1 0%";
    layoutStyles.alignSelf = "stretch";
  }

  const domProps = cleanProps(rest, SPACER_EXCLUDE);
  domProps.style = mergeStyles(layoutStyles, props.style);

  return jsx(as, domProps);
}
