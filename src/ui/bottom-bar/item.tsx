import type { Child } from "../../dom/render";
import { computed } from "../../signals";
import { BottomBarBadge } from "./badge";
import { useBottomBarContext } from "./context";
import type { BottomBarItemProps } from "./types";

export function BottomBarItem(props: BottomBarItemProps): Child {
  const ctx = useBottomBarContext();
  const isSelected = computed(() => (ctx ? ctx.value() === props.value : false));

  const handleClick = (e: MouseEvent) => {
    const isDisabled =
      typeof props.disabled === "function"
        ? (props.disabled as () => boolean)()
        : Boolean(props.disabled);
    if (isDisabled) {
      e.preventDefault();
      return;
    }

    if (ctx) {
      ctx.setValue(props.value);
    }
    if (props.onClick) {
      props.onClick(e);
    }
  };

  const {
    as: Tag = "button",
    value,
    icon,
    label,
    badge,
    disabled,
    onClick: _oc,
    children,
    class: className,
    style,
    ...rest
  } = props;

  const defaultItemStyle = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "52px",
    minHeight: "44px",
    padding: "6px 8px",
    borderRadius: "16px",
    border: "none",
    background: () => (isSelected() ? "rgba(255, 255, 255, 0.08)" : "transparent"),
    color: () => (isSelected() ? "#ec4899" : "rgba(255, 255, 255, 0.65)"),
    cursor: "pointer",
    outline: "none",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transition: "color 0.15s ease, background-color 0.15s ease, transform 0.1s ease",
    boxSizing: "border-box"
  };

  const combinedStyle = style ? { ...defaultItemStyle, ...style } : defaultItemStyle;

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      role="tab"
      id={ctx ? `${ctx.baseId}-item-${value}` : undefined}
      aria-selected={() => isSelected()}
      data-state={() => (isSelected() ? "active" : "inactive")}
      data-value={value}
      disabled={disabled}
      class={`visage-bottom-bar-item ${className ?? ""}`.trim()}
      style={combinedStyle}
      onClick={handleClick}
      {...rest}
    >
      {badge !== undefined ? (
        typeof badge === "function" || typeof badge === "string" || typeof badge === "number" ? (
          <BottomBarBadge count={badge as any} />
        ) : (
          badge
        )
      ) : null}

      {children !== undefined ? (
        typeof children === "function" ? (
          children()
        ) : (
          children
        )
      ) : (
        <>
          {icon ? (
            <span
              class="visage-bottom-bar-icon"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px"
              }}
            >
              {typeof icon === "function" ? icon() : icon}
            </span>
          ) : null}
          {label ? (
            <span
              class="visage-bottom-bar-label"
              style={{
                fontSize: "10px",
                fontWeight: 500,
                lineHeight: 1.2,
                marginTop: "3px",
                letterSpacing: "0.01em"
              }}
            >
              {typeof label === "function" ? label() : label}
            </span>
          ) : null}
        </>
      )}
    </Tag>
  );
}
