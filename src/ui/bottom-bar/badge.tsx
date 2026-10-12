import type { Child } from "../../dom/render";
import { computed } from "../../signals";
import type { BottomBarBadgeProps } from "./types";

export function BottomBarBadge(props: BottomBarBadgeProps): Child {
  const { as: Tag = "span", count, children, class: className, style, ...rest } = props;

  const displayContent = computed(() => {
    if (children !== undefined) {
      return typeof children === "function" ? children() : children;
    }
    if (count !== undefined) {
      return typeof count === "function" ? count() : count;
    }
    return "";
  });

  const defaultBadgeStyle = {
    position: "absolute",
    top: "3px",
    right: "8px",
    minWidth: "16px",
    height: "16px",
    padding: "0 4px",
    borderRadius: "9999px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    fontSize: "9px",
    fontWeight: 700,
    lineHeight: "16px",
    textAlign: "center",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 0 1.5px rgba(18, 18, 24, 0.9)",
    pointerEvents: "none",
    boxSizing: "border-box"
  };

  const combinedStyle = style ? { ...defaultBadgeStyle, ...style } : defaultBadgeStyle;

  return (
    <Tag
      class={`visage-bottom-bar-badge ${className ?? ""}`.trim()}
      style={combinedStyle}
      {...rest}
    >
      {displayContent}
    </Tag>
  );
}
