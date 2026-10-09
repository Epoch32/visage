/** @jsxImportSource visage */
import { Portal } from "../dom/control-flow";
import { type Child } from "../dom/render";
import { effect, onCleanup, type ReadonlySignal } from "../signals";
import { createContext, useContext } from "../signals/context";
import { createControllableSignal, createId, onClickOutside } from "./utils";

export interface PopoverContextValue {
  open: ReadonlySignal<boolean>;
  setOpen: (open: boolean) => void;
  triggerRef: { current: HTMLElement | null };
  contentRef: { current: HTMLElement | null };
  contentId: string;
}

export const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopoverContext(): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) {
    throw new Error("Popover compound components must be rendered within a <Popover />");
  }
  return ctx;
}

export interface PopoverProps {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: Child | (() => Child);
}

export function Popover(props: PopoverProps): Child {
  const [open, setOpen] = createControllableSignal<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: props.onOpenChange
  });

  const triggerRef: { current: HTMLElement | null } = { current: null };
  const contentRef: { current: HTMLElement | null } = { current: null };
  const contentId = createId("popover-content");

  const ctx: PopoverContextValue = {
    open,
    setOpen,
    triggerRef,
    contentRef,
    contentId
  };

  return PopoverContext.Provider({
    value: ctx,
    children: props.children
  });
}

export interface PopoverTriggerProps {
  as?: string;
  class?: any;
  style?: any;
  onClick?: (e: MouseEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function PopoverTrigger(props: PopoverTriggerProps): Child {
  const ctx = usePopoverContext();

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented) {
      ctx.setOpen(!ctx.open());
    }
  };

  const { as: Tag = "button", children, onClick, class: className, style, ...rest } = props;

  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        ctx.triggerRef.current = el;
      }}
      type={Tag === "button" ? "button" : undefined}
      aria-haspopup="dialog"
      aria-expanded={() => ctx.open()}
      aria-controls={ctx.contentId}
      data-state={() => (ctx.open() ? "open" : "closed")}
      class={className}
      style={style}
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
  class?: any;
  style?: any;
  onKeyDown?: (e: KeyboardEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function PopoverContent(props: PopoverContentProps): Child {
  const ctx = usePopoverContext();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (e.defaultPrevented) return;

    if (e.key === "Escape") {
      ctx.setOpen(false);
      ctx.triggerRef.current?.focus();
      e.stopPropagation();
    }
  };

  const { as: Tag = "div", children, onKeyDown, class: className, style, ...rest } = props;

  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        ctx.contentRef.current = el;
        if (el) {
          const cleanup = onClickOutside([ctx.triggerRef.current, el], () => {
            if (ctx.open()) {
              ctx.setOpen(false);
            }
          });
          onCleanup(cleanup);
        }
      }}
      id={ctx.contentId}
      role="dialog"
      data-state={() => (ctx.open() ? "open" : "closed")}
      class={className}
      style={style}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      {...rest}
    >
      {children}
    </Tag>
  );
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
  const ctx = usePopoverContext();

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented) {
      ctx.setOpen(false);
    }
  };

  const { as: Tag = "button", children, onClick, class: className, style, ...rest } = props;

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      class={className}
      style={style}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Tag>
  );
}
