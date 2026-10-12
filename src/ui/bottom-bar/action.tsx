import type { Child } from "../../dom/render";
import type { BottomBarActionProps } from "./types";

export function BottomBarAction(props: BottomBarActionProps): Child {
  const {
    as: Tag = "button",
    icon,
    label,
    disabled,
    onClick,
    children,
    class: className,
    style,
    ...rest
  } = props;

  const defaultActionStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    minWidth: "44px",
    minHeight: "44px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)",
    color: "#ffffff",
    border: "none",
    boxShadow: "0 4px 14px rgba(236, 72, 153, 0.45)",
    cursor: "pointer",
    outline: "none",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    boxSizing: "border-box"
  };

  const combinedStyle = style ? { ...defaultActionStyle, ...style } : defaultActionStyle;

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      role="button"
      aria-label={label ?? "Primary action"}
      disabled={disabled}
      class={`visage-bottom-bar-action ${className ?? ""}`.trim()}
      style={combinedStyle}
      onClick={onClick}
      {...rest}
    >
      {children !== undefined
        ? typeof children === "function"
          ? children()
          : children
        : typeof icon === "function"
          ? icon()
          : icon}
    </Tag>
  );
}
