import { Portal, Show } from "@dom/control-flow";
import type { Child } from "@dom/render";
import { onCleanup, type ReadonlySignal } from "@signals";
import { createContext, useContext } from "@signals/context";
import { createControllableSignal, createId } from "./utils";

export interface TooltipContextValue {
  open: ReadonlySignal<boolean>;
  setOpen: (open: boolean) => void;
  openDelay: number;
  closeDelay: number;
  tooltipId: string;
  triggerRef: { current: HTMLElement | null };
  anchorName: string;
}

export const TooltipContext = createContext<TooltipContextValue | null>(null);

export function useTooltipContext(): TooltipContextValue | null {
  return useContext(TooltipContext);
}

export interface TooltipProps {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  closeDelay?: number;
  content?: Child | (() => Child);
  side?: "top" | "bottom" | "left" | "right";
  anchorName?: string;
  triggerClass?: any;
  triggerAs?: string;
  contentClass?: any;
  contentStyle?: any;
  portalled?: boolean;
  children?: Child | (() => Child);
}

export function TooltipRoot(props: TooltipProps): Child {
  const [open, setOpen] = createControllableSignal<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: props.onOpenChange
  });

  const tooltipId = createId("tooltip");
  const anchorName = props.anchorName ?? `--tooltip-${tooltipId}`;
  const triggerRef: { current: HTMLElement | null } = { current: null };

  const ctx: TooltipContextValue = {
    open,
    setOpen,
    openDelay: props.openDelay ?? 150,
    closeDelay: props.closeDelay ?? 100,
    tooltipId,
    triggerRef,
    anchorName
  };

  if (props.content !== undefined) {
    return TooltipContext.Provider({
      value: ctx,
      children: () => (
        <span
          class="visage-tooltip-root"
          style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
        >
          <TooltipTrigger
            as={props.triggerAs ?? "button"}
            class={props.triggerClass}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              cursor: "help"
            }}
          >
            {typeof props.children === "function" ? props.children() : props.children}
          </TooltipTrigger>
          <TooltipContent
            side={props.side}
            class={props.contentClass}
            style={props.contentStyle}
            portalled={props.portalled ?? false}
          >
            {typeof props.content === "function" ? props.content() : props.content}
          </TooltipContent>
        </span>
      )
    });
  }

  return TooltipContext.Provider({
    value: ctx,
    children: props.children
  });
}

export interface TooltipTriggerProps {
  as?: string;
  class?: any;
  style?: any;
  anchorName?: string;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function TooltipTrigger(props: TooltipTriggerProps): Child {
  const ctx = useContext(TooltipContext);
  let openTimer: any = null;
  let closeTimer: any = null;

  const clearTimers = () => {
    if (openTimer) clearTimeout(openTimer);
    if (closeTimer) clearTimeout(closeTimer);
    openTimer = null;
    closeTimer = null;
  };

  const handleMouseEnter = (e: MouseEvent) => {
    if (props.onMouseEnter) props.onMouseEnter(e);
    clearTimers();
    if (!ctx) return;
    if (ctx.openDelay > 0) {
      openTimer = setTimeout(() => ctx.setOpen(true), ctx.openDelay);
    } else {
      ctx.setOpen(true);
    }
  };

  const handleMouseLeave = (e: MouseEvent) => {
    if (props.onMouseLeave) props.onMouseLeave(e);
    clearTimers();
    if (!ctx) return;
    if (ctx.closeDelay > 0) {
      closeTimer = setTimeout(() => ctx.setOpen(false), ctx.closeDelay);
    } else {
      ctx.setOpen(false);
    }
  };

  const handleFocus = (e: FocusEvent) => {
    if (props.onFocus) props.onFocus(e);
    clearTimers();
    ctx?.setOpen(true);
  };

  const handleBlur = (e: FocusEvent) => {
    if (props.onBlur) props.onBlur(e);
    clearTimers();
    ctx?.setOpen(false);
  };

  onCleanup(clearTimers);

  const {
    as: Tag = "button",
    children,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    class: className,
    style,
    anchorName: triggerAnchor,
    ...rest
  } = props;

  const resolvedAnchor = triggerAnchor ?? ctx?.anchorName;

  const triggerStyle = () => {
    const baseStyle = typeof style === "function" ? style() : style;
    return {
      display: "inline-flex",
      alignItems: "center",
      ...(resolvedAnchor ? { anchorName: resolvedAnchor } : {}),
      ...baseStyle
    };
  };

  const ariaDescribedBy = () => {
    if (rest["aria-describedby"]) {
      return ctx?.open()
        ? `${rest["aria-describedby"]} ${ctx.tooltipId}`
        : rest["aria-describedby"];
    }
    return ctx?.open() ? ctx.tooltipId : undefined;
  };

  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        if (ctx) ctx.triggerRef.current = el;
      }}
      type={Tag === "button" ? "button" : undefined}
      tabIndex={Tag === "button" ? undefined : 0}
      aria-describedby={ariaDescribedBy}
      data-state={() => (ctx?.open() ? "open" : "closed")}
      class={className}
      style={triggerStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface TooltipPortalProps {
  mount?: HTMLElement | null;
  children: Child | (() => Child);
}

export function TooltipPortal(props: TooltipPortalProps): Child {
  return <Portal mount={props.mount}>{props.children}</Portal>;
}

export interface TooltipContentProps {
  forceMount?: boolean;
  portalled?: boolean;
  mount?: HTMLElement | null;
  as?: string;
  class?: any;
  style?: any;
  side?: "top" | "bottom" | "left" | "right";
  positionArea?: string;
  positionAnchor?: string;
  positionTryFallbacks?: string;
  popover?: "auto" | "manual" | "hint" | boolean;
  children: Child | (() => Child);
  [key: string]: any;
}

export function TooltipContent(props: TooltipContentProps): Child {
  const ctx = useContext(TooltipContext);
  const isOpen = () => (ctx ? ctx.open() : false);

  const {
    forceMount,
    as: Tag = "div",
    children,
    class: className,
    style,
    portalled = true,
    mount,
    side,
    positionArea,
    positionAnchor,
    positionTryFallbacks,
    popover: popoverProp,
    ...rest
  } = props;

  const useNativePopover = popoverProp !== undefined;
  const popoverMode = typeof popoverProp === "string" ? popoverProp : "hint";

  const resolveAnchorStyles = () => {
    const resolvedAnchor = positionAnchor ?? ctx?.anchorName;
    if (!resolvedAnchor && !side && !positionArea) return {};

    const sideAreaMap: Record<string, string> = {
      top: "block-start span-inline-end",
      bottom: "block-end span-inline-end",
      left: "inline-start",
      right: "inline-end"
    };

    const area = positionArea ?? (side ? sideAreaMap[side] : undefined);
    const fallbacks = positionTryFallbacks ?? "flip-block, flip-inline";

    return {
      ...(resolvedAnchor ? { positionAnchor: resolvedAnchor } : {}),
      ...(area ? { positionArea: area } : {}),
      ...(area ? { positionTryFallbacks: fallbacks } : {}),
      ...(area ? { inset: "auto" } : {})
    };
  };

  const computedStyle = () => {
    const baseStyle = typeof style === "function" ? style() : style;
    return {
      pointerEvents: "none",
      ...resolveAnchorStyles(),
      ...baseStyle
    };
  };

  const content = forceMount ? (
    <Tag
      id={ctx?.tooltipId}
      popover={useNativePopover ? popoverMode : undefined}
      role="tooltip"
      data-state={() => (isOpen() ? "open" : "closed")}
      hidden={() => !isOpen()}
      class={className}
      style={computedStyle}
      {...rest}
    >
      {children}
    </Tag>
  ) : (
    <Show when={isOpen}>
      <Tag
        id={ctx?.tooltipId}
        popover={useNativePopover ? popoverMode : undefined}
        role="tooltip"
        data-state="open"
        class={className}
        style={computedStyle}
        {...rest}
      >
        {children}
      </Tag>
    </Show>
  );

  return portalled ? <Portal mount={mount}>{content}</Portal> : content;
}

export const Tooltip = Object.assign(TooltipRoot, {
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Portal: TooltipPortal,
  Content: TooltipContent
});
