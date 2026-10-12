import type { Child } from "../../dom/render";
import type { BottomBarSeparatorProps } from "./types";

export function BottomBarSeparator(props: BottomBarSeparatorProps): Child {
  const { as: Tag = "div", class: className, style, ...rest } = props;

  const defaultSeparatorStyle = {
    width: "1px",
    height: "22px",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    margin: "0 2px",
    flexShrink: 0
  };

  const combinedStyle = style ? { ...defaultSeparatorStyle, ...style } : defaultSeparatorStyle;

  return (
    <Tag
      role="separator"
      aria-orientation="vertical"
      class={`visage-bottom-bar-separator ${className ?? ""}`.trim()}
      style={combinedStyle}
      {...rest}
    />
  );
}
