import type { Child } from "../../dom/render";
import { signal } from "../../signals";
import { createControllableSignal, createId } from "../utils";
import { BottomBarContext } from "./context";
import { BottomBarItem } from "./item";
import type { BottomBarContextValue, BottomBarProps } from "./types";

export function BottomBarRoot(props: BottomBarProps): Child {
  const [value, setValue] = createControllableSignal<string>({
    value: props.value,
    defaultValue:
      props.defaultValue ?? (props.items && props.items.length > 0 ? props.items[0]?.value : ""),
    onChange: props.onValueChange
  });

  const baseId = createId("bottom-bar");
  const variant = props.variant ?? "floating";
  const hideOnScroll = props.hideOnScroll ?? false;
  const threshold = props.scrollThreshold ?? 20;

  const isVisible = signal(true);

  if (hideOnScroll && typeof window !== "undefined") {
    let lastScrollY = window.scrollY || 0;
    const onScroll = () => {
      const currentScrollY = window.scrollY || 0;
      const diff = currentScrollY - lastScrollY;
      if (Math.abs(diff) < 5) return;

      if (currentScrollY > threshold && diff > 0) {
        if (isVisible()) isVisible.set(false);
      } else if (diff < 0) {
        if (!isVisible()) isVisible.set(true);
      }
      lastScrollY = Math.max(0, currentScrollY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const ctx: BottomBarContextValue = {
    value,
    setValue,
    baseId,
    variant
  };

  const {
    as: Tag = "nav",
    value: _v,
    defaultValue: _dv,
    onValueChange: _ovc,
    variant: _var,
    hideOnScroll: _hos,
    scrollThreshold: _st,
    items,
    itemClass,
    itemStyle,
    children,
    class: className,
    style,
    ...rest
  } = props;

  const defaultFloatingStyle = {
    position: "fixed",
    bottom: "max(16px, env(safe-area-inset-bottom, 16px))",
    left: "50%",
    zIndex: 50,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "9999px",
    backgroundColor: "rgba(18, 18, 24, 0.88)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
    transform: () =>
      isVisible() ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(160%)",
    opacity: () => (isVisible() ? 1 : 0),
    pointerEvents: () => (isVisible() ? "auto" : "none"),
    transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
    maxWidth: "calc(100vw - 32px)",
    boxSizing: "border-box"
  };

  const defaultDockedStyle = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: "8px",
    paddingBottom: "max(10px, env(safe-area-inset-bottom, 10px))",
    paddingLeft: "12px",
    paddingRight: "12px",
    backgroundColor: "rgba(18, 18, 24, 0.94)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.35)",
    transform: () => (isVisible() ? "translateY(0)" : "translateY(110%)"),
    opacity: () => (isVisible() ? 1 : 0),
    pointerEvents: () => (isVisible() ? "auto" : "none"),
    transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
    boxSizing: "border-box"
  };

  const computedDefaultStyle = variant === "floating" ? defaultFloatingStyle : defaultDockedStyle;
  const combinedStyle = style ? { ...computedDefaultStyle, ...style } : computedDefaultStyle;

  return BottomBarContext.Provider({
    value: ctx,
    children: () => (
      <Tag
        role="toolbar"
        aria-label="Mobile toolbar"
        data-variant={variant}
        data-state={() => (isVisible() ? "visible" : "hidden")}
        class={`visage-bottom-bar visage-bottom-bar-${variant} ${className ?? ""}`.trim()}
        style={combinedStyle}
        {...rest}
      >
        {items
          ? items.map((item) => (
              <BottomBarItem
                value={item.value}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
                disabled={item.disabled}
                onClick={item.onClick}
                class={item.class ?? itemClass}
                style={item.style ?? itemStyle}
              />
            ))
          : typeof children === "function"
            ? children()
            : children}
      </Tag>
    )
  });
}
