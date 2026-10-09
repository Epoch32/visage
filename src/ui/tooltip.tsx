/** @jsxImportSource visage */
import { Portal, Show } from "../dom/control-flow";
import type { Child } from "../dom/render";
import { onCleanup, type ReadonlySignal } from "../signals";
import { createContext, useContext } from "../signals/context";
import { createControllableSignal, createId } from "./utils";

export interface TooltipContextValue {
  open: ReadonlySignal<boolean>;
  setOpen: (open: boolean) => void;
  openDelay: number;
  closeDelay: number;
  tooltipId: string;
  triggerRef: { current: HTMLElement | null };
}

export const TooltipContext = createContext<TooltipContextValue | null>(null);

export function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) {
    throw new Error("Tooltip compound components must be rendered within a <Tooltip />");
  }
  return ctx;
}

export interface TooltipProps {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  closeDelay?: number;
  children: Child | (() => Child);
}

export function Tooltip(props: TooltipProps): Child {
  const [open, setOpen] = createControllableSignal<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: props.onOpenChange
  });

  const tooltipId = createId("tooltip");
  const triggerRef: { current: HTMLElement | null } = { current: null };

  const ctx: TooltipContextValue = {
    open,
    setOpen,
    openDelay: props.openDelay ?? 200,
    closeDelay: props.closeDelay ?? 100,
    tooltipId,
    triggerRef
  };

  return TooltipContext.Provider({
    value: ctx,
    children: props.children
  });
}

export interface TooltipTriggerProps {
  as?: string;
  class?: any;
  style?: any;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function TooltipTrigger(props: TooltipTriggerProps): Child {
  const ctx = useTooltipContext();
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
    if (ctx.openDelay > 0) {
      openTimer = setTimeout(() => ctx.setOpen(true), ctx.openDelay);
    } else {
      ctx.setOpen(true);
    }
  };

  const handleMouseLeave = (e: MouseEvent) => {
    if (props.onMouseLeave) props.onMouseLeave(e);
    clearTimers();
    if (ctx.closeDelay > 0) {
      closeTimer = setTimeout(() => ctx.setOpen(false), ctx.closeDelay);
    } else {
      ctx.setOpen(false);
    }
  };

  const handleFocus = (e: FocusEvent) => {
    if (props.onFocus) props.onFocus(e);
    clearTimers();
    ctx.setOpen(true);
  };

  const handleBlur = (e: FocusEvent) => {
    if (props.onBlur) props.onBlur(e);
    clearTimers();
    ctx.setOpen(false);
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
    ...rest
  } = props;

  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        ctx.triggerRef.current = el;
      }}
      type={Tag === "button" ? "button" : undefined}
      aria-describedby={ctx.tooltipId}
      data-state={() => (ctx.open() ? "open" : "closed")}
      class={className}
      style={style}
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
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export function TooltipContent(props: TooltipContentProps): Child {
  const ctx = useTooltipContext();

  const { forceMount, as: Tag = "div", children, class: className, style, ...rest } = props;

  if (forceMount) {
    return (
      <Tag
        id={ctx.tooltipId}
        role="tooltip"
        data-state={() => (ctx.open() ? "open" : "closed")}
        hidden={() => !ctx.open()}
        class={className}
        style={style}
        {...rest}
      >
        {children}
      </Tag>
    );
  }

  return (
    <Show when={ctx.open}>
      <Tag
        id={ctx.tooltipId}
        role="tooltip"
        data-state="open"
        class={className}
        style={style}
        {...rest}
      >
        {children}
      </Tag>
    </Show>
  );
}
