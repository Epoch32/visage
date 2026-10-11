import { Portal } from "../dom/control-flow";
import type { Child } from "../dom/render";
import { onCleanup, type ReadonlySignal } from "../signals";
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

  const ctx: PopoverContextValue = {
    open,
    setOpen,
    triggerRef,
    contentRef,
    contentId
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

  const { as: Tag = "button", children, onClick, class: className, style, ...rest } = props;

  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        if (ctx) ctx.triggerRef.current = el;
      }}
      type={Tag === "button" ? "button" : undefined}
      aria-haspopup="dialog"
      aria-expanded={() => ctx?.open() ?? false}
      aria-controls={ctx?.contentId}
      data-state={() => (ctx?.open() ? "open" : "closed")}
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
  portalled?: boolean;
  mount?: HTMLElement | null;
  class?: any;
  style?: any;
  onKeyDown?: (e: KeyboardEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function PopoverContent(props: PopoverContentProps): Child {
  const ctx = useContext(PopoverContext);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (e.defaultPrevented) return;

    if (e.key === "Escape" && ctx) {
      ctx.setOpen(false);
      ctx.triggerRef.current?.focus();
      e.stopPropagation();
    }
  };

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (e.defaultPrevented) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-popover-close]")) {
      ctx?.setOpen(false);
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
    ...rest
  } = props;

  const content = (
    <Tag
      ref={(el: HTMLElement | null) => {
        if (ctx) {
          ctx.contentRef.current = el;
          if (el) {
            const cleanup = onClickOutside([ctx.triggerRef.current, el], () => {
              if (ctx.open()) {
                ctx.setOpen(false);
              }
            });
            onCleanup(cleanup);
          }
        }
      }}
      id={ctx?.contentId}
      role="dialog"
      data-state={() => (ctx?.open() ? "open" : "closed")}
      class={className}
      style={() => ({
        display: ctx?.open() ? undefined : "none",
        ...style
      })}
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
