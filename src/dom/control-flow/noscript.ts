import { type Child, insertChild } from "../render";

export interface NoScriptProps {
  children?: Child;
  message?: string;
  class?: string;
  className?: string;
  style?: string | Record<string, any>;
}

/**
 * Renders an accessible <noscript> element for browsers with JavaScript disabled.
 * In SSR and static site generation, this outputs semantic <noscript> HTML content
 * that the browser displays only when JavaScript execution is turned off.
 *
 * @example
 * ```tsx
 * <NoScript>
 *   <div class="warning-banner">Please enable JavaScript to use this application.</div>
 * </NoScript>
 *
 * // Or with a convenience message prop:
 * <NoScript message="JavaScript is required to use this application." />
 * ```
 */
export function NoScript(props: NoScriptProps): any {
  const content = props.message ?? props.children;
  const className = props.class ?? props.className;

  const isSSR = typeof document === "undefined" || ((globalThis as any).__visage_ssr || 0) > 0;

  if (isSSR) {
    const attributes = new Map<string, any>();
    if (className) {
      attributes.set("class", className);
    }
    if (props.style && typeof props.style === "string") {
      attributes.set("style", props.style);
    }

    return {
      tagName: "noscript",
      attributes,
      style: typeof props.style === "object" ? props.style : undefined,
      childNodes:
        content !== undefined && content !== null
          ? Array.isArray(content)
            ? content
            : [content]
          : []
    };
  }

  const el = document.createElement("noscript");
  if (className) {
    el.className = className;
  }

  if (props.style) {
    if (typeof props.style === "string") {
      el.style.cssText = props.style;
    } else {
      Object.assign(el.style, props.style);
    }
  }

  if (props.message) {
    el.textContent = props.message;
  } else if (props.children !== undefined && props.children !== null) {
    insertChild(el, props.children);
  }

  return el;
}
