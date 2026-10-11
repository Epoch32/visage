import type { Child } from "../dom/render";

export type IconNode = [string, Record<string, any>][];

export interface IconProps {
  size?: number | string | (() => number | string);
  color?: string | (() => string);
  strokeWidth?: number | string | (() => number | string);
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  [key: string]: any;
}

/**
 * Creates a native Visage SVG component from a Lucide / SVG icon node definition
 */
export function createIcon(name: string, iconNode: IconNode) {
  const IconComponent = function Icon(props: IconProps = {}): Child {
    const size = () =>
      typeof props.size === "function" ? (props.size as () => any)() : (props.size ?? 24);
    const color = () =>
      typeof props.color === "function"
        ? (props.color as () => any)()
        : (props.color ?? "currentColor");
    const strokeWidth = () =>
      typeof props.strokeWidth === "function"
        ? (props.strokeWidth as () => any)()
        : (props.strokeWidth ?? 2);

    const {
      size: _s,
      color: _c,
      strokeWidth: _sw,
      class: className,
      style,
      children,
      ...rest
    } = props;

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        stroke-width={strokeWidth}
        stroke-linecap="round"
        stroke-linejoin="round"
        class={className}
        style={style}
        role="img"
        aria-label={props["aria-label"] ?? name}
        {...rest}
      >
        <title>{props.title ?? name}</title>
        {iconNode.map(([Tag, attrs]) => (
          <Tag {...attrs} />
        ))}
        {typeof children === "function" ? (children as () => Child)() : children}
      </svg>
    );
  };

  IconComponent.displayName = name;
  return IconComponent;
}
