import { Portal } from "@dom/control-flow";
import type { Child } from "@dom/render";
import type { ReadonlySignal } from "@signals";
import { createContext, useContext } from "@signals/context";
import { useDismiss } from "./overlay";
import { createControllableSignal, createId } from "./utils";

export interface PopoverContextValue {
  open: ReadonlySignal<boolean>;
  setOpen: (open: boolean) => void;
  triggerRef: { current: HTMLElement | null };
  contentRef: { current: HTMLElement | null };
  contentId: string;
  anchorName: string;
  native: boolean;
}

export const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopoverContext(): PopoverContextValue | null {
  return useContext(PopoverContext);
}

export interface PopoverProps {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: Child | (() => Child);
  content?: Child | (() => Child);
  triggerClass?: any;
  contentClass?: any;
  portalled?: boolean;
  anchorName?: string;
  native?: boolean;
  children?: Child | (() => Child);
}

export function PopoverRoot(props: PopoverProps): Child {
  const [open, setOpen] = createControllableSignal<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: props.onOpenChange
  });

  const triggerRef: { current: HTMLElement | null } = { current: null };
  const contentRef: { current: HTMLElement | null } = { current: null };
  const contentId = createId("popover-content");
  const anchorName = props.anchorName ?? `--popover-${contentId}`;
  const native = props.native ?? false;

  const ctx: PopoverContextValue = {
    open,
    setOpen,
    triggerRef,
    contentRef,
    contentId,
    anchorName,
    native
  };

  if (props.trigger !== undefined || props.content !== undefined) {
    return PopoverContext.Provider({
      value: ctx,
      children: () => (
        <>
          {props.trigger ? (
            <PopoverTrigger as="span" class={props.triggerClass}>
              {typeof props.trigger === "function" ? props.trigger() : props.trigger}
            </PopoverTrigger>
          ) : null}
          <PopoverContent portalled={props.portalled} class={props.contentClass}>
            {typeof props.content === "function" ? props.content() : props.content}
            {typeof props.children === "function" ? props.children() : props.children}
          </PopoverContent>
        </>
      )
    });
  }

  return PopoverContext.Provider({
    value: ctx,
    children: props.children
  });
}

export interface PopoverTriggerProps {
  as?: string;
  class?: any;
  style?: any;
  anchorName?: string;
  onClick?: (e: MouseEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function PopoverTrigger(props: PopoverTriggerProps): Child {
  const ctx = useContext(PopoverContext);

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented && ctx) {
      ctx.setOpen(!ctx.open());
    }
  };

  const {
    as: Tag = "button",
    children,
    onClick,
    class: className,
    style,
    anchorName: triggerAnchor,
    ...rest
  } = props;

  const resolvedAnchor = triggerAnchor ?? ctx?.anchorName;

  const triggerStyle = () => {
    const baseStyle = typeof style === "function" ? style() : style;
    if (resolvedAnchor) {
      return { anchorName: resolvedAnchor, ...baseStyle };
    }
    return baseStyle;
  };

  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        if (ctx) ctx.triggerRef.current = el;
      }}
      type={Tag === "button" ? "button" : undefined}
      popovertarget={ctx?.native ? ctx.contentId : undefined}
      popovertargetaction={ctx?.native ? "toggle" : undefined}
      aria-haspopup="dialog"
      aria-expanded={() => ctx?.open() ?? false}
      aria-controls={ctx?.contentId}
      data-state={() => (ctx?.open() ? "open" : "closed")}
      class={className}
      style={triggerStyle}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface PopoverPortalProps {
  mount?: HTMLElement | null;
  children: Child | (() => Child);
}

export function PopoverPortal(props: PopoverPortalProps): Child {
  return <Portal mount={props.mount}>{props.children}</Portal>;
}

export interface PopoverContentProps {
  as?: string;
  portalled?: boolean;
  mount?: HTMLElement | null;
  class?: any;
  style?: any;
  popover?: "auto" | "manual" | boolean;
  side?: "top" | "bottom" | "left" | "right";
  positionArea?: string;
  positionAnchor?: string;
  positionTryFallbacks?: string;
  onKeyDown?: (e: KeyboardEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function PopoverContent(props: PopoverContentProps): Child {
  const ctx = useContext(PopoverContext);

  const useNativePopover =
    props.popover !== undefined ? Boolean(props.popover) : (ctx?.native ?? false);
  const popoverMode = typeof props.popover === "string" ? props.popover : "auto";

  const dismiss = useDismiss(() => ctx?.contentRef.current, {
    enabled: () => (ctx?.open() ?? false) && !useNativePopover,
    onDismiss: () => ctx?.setOpen(false),
    escapeKey: true,
    outsidePointer: true,
    outsideIgnore: () => [ctx?.triggerRef.current],
    closeSelector: "[data-popover-close]",
    onEscapeKeyDown: (e) => {
      if (props.onKeyDown) props.onKeyDown(e);
      if (!e.defaultPrevented) {
        ctx?.triggerRef.current?.focus();
      }
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (!useNativePopover) {
      dismiss.handleKeyDown(e);
    }
  };

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!useNativePopover) {
      dismiss.handleClick(e);
    }
  };

  const {
    as: Tag = "div",
    children,
    onKeyDown,
    onClick: _onClick,
    class: className,
    style,
    portalled = true,
    mount,
    popover: _popoverProp,
    side,
    positionArea,
    positionAnchor,
    positionTryFallbacks,
    ...rest
  } = props;

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
    const fallbacks = positionTryFallbacks ?? "flip-block, flip-inline, flip-block flip-inline";

    return {
      ...(resolvedAnchor ? { positionAnchor: resolvedAnchor } : {}),
      ...(area ? { positionArea: area } : {}),
      ...(area ? { positionTryFallbacks: fallbacks } : {}),
      ...(area ? { inset: "auto" } : {})
    };
  };

  const content = (
    <Tag
      ref={(el: HTMLElement | null) => {
        if (ctx) {
          ctx.contentRef.current = el;
        }
        if (el && useNativePopover) {
          const onToggle = (e: any) => {
            const newState = e.newState ?? (el.matches?.(":popover-open") ? "open" : "closed");
            if (newState === "closed" && ctx?.open()) {
              ctx?.setOpen(false);
            } else if (newState === "open" && !ctx?.open()) {
              ctx?.setOpen(true);
            }
          };
          el.addEventListener("toggle", onToggle);
        }
      }}
      id={ctx?.contentId}
      popover={useNativePopover ? popoverMode : undefined}
      role="dialog"
      data-state={() => (ctx?.open() ? "open" : "closed")}
      class={className}
      style={() => {
        const baseStyle = typeof style === "function" ? style() : style;
        const anchorStyles = resolveAnchorStyles();
        const isOpen = ctx?.open() ?? false;

        const el = ctx?.contentRef.current;
        if (el && useNativePopover && typeof (el as any).showPopover === "function") {
          try {
            if (isOpen) {
              (el as any).showPopover();
            } else {
              (el as any).hidePopover();
            }
          } catch {
            // Handled
          }
        }

        return {
          display: useNativePopover ? undefined : isOpen ? undefined : "none",
          ...anchorStyles,
          ...baseStyle
        };
      }}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      tabIndex={-1}
      {...rest}
    >
      {children}
    </Tag>
  );

  return portalled ? <Portal mount={mount}>{content}</Portal> : content;
}

export interface PopoverCloseProps {
  as?: string;
  class?: any;
  style?: any;
  onClick?: (e: MouseEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function PopoverClose(props: PopoverCloseProps): Child {
  const ctx = useContext(PopoverContext);

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented && ctx) {
      ctx.setOpen(false);
    }
  };

  const { as: Tag = "button", children, onClick, class: className, style, ...rest } = props;

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      data-popover-close=""
      class={className}
      style={style}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export const Popover = Object.assign(PopoverRoot, {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Portal: PopoverPortal,
  Content: PopoverContent,
  Close: PopoverClose
});
