import { type Child, insertChild, setAttribute } from "../dom";

export type { JSX } from "./jsx";

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set([
  "svg",
  "path",
  "circle",
  "rect",
  "g",
  "line",
  "polyline",
  "polygon",
  "text",
  "defs",
  "clipPath",
  "linearGradient",
  "radialGradient",
  "stop"
]);

export function Fragment(props: { children?: Child }): Node {
  const fragment = document.createDocumentFragment();
  if (props.children !== undefined) {
    insertChild(fragment, props.children);
  }
  return fragment;
}

export function jsx(type: any, props: Record<string, any> = {}, key?: any): any {
  // If it's a Component function
  if (typeof type === "function") {
    return type(props, key);
  }

  // If it's a DOM element tag
  if (typeof type === "string") {
    const isSvg = SVG_TAGS.has(type);
    const element = isSvg ? document.createElementNS(SVG_NS, type) : document.createElement(type);

    const { children, ...restProps } = props;

    // Apply attributes and event listeners
    for (const propName in restProps) {
      setAttribute(element as HTMLElement, propName, restProps[propName]);
    }

    // Insert children
    if (children !== undefined) {
      insertChild(element, children);
    }

    return element;
  }

  return type;
}

export const jsxs = jsx;
export const jsxDEV = jsx;
