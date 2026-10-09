/** @jsxImportSource visage */
import { Portal } from "../dom/control-flow";
import { type Child } from "../dom/render";
import { onCleanup, type ReadonlySignal } from "../signals";
import { createContext, useContext } from "../signals/context";
import { createControllableSignal, createId, onClickOutside } from "./utils";

export interface DropdownMenuContextValue {
  open: ReadonlySignal<boolean>;
  setOpen: (open: boolean) => void;
  triggerRef: { current: HTMLElement | null };
  contentRef: { current: HTMLElement | null };
  menuId: string;
}

export const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

export function useDropdownMenuContext(): DropdownMenuContextValue {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error("DropdownMenu compound components must be rendered within a <DropdownMenu />");
  }
  return ctx;
}

export interface DropdownMenuProps {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: Child | (() => Child);
}

export function DropdownMenu(props: DropdownMenuProps): Child {
  const [open, setOpen] = createControllableSignal<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: props.onOpenChange
  });

  const triggerRef: { current: HTMLElement | null } = { current: null };
  const contentRef: { current: HTMLElement | null } = { current: null };
  const menuId = createId("dropdown-menu");

  const ctx: DropdownMenuContextValue = {
    open,
    setOpen,
    triggerRef,
    contentRef,
    menuId
  };

  return DropdownMenuContext.Provider({
    value: ctx,
    children: props.children
  });
}

export interface DropdownMenuTriggerProps {
  as?: string;
  class?: any;
  style?: any;
  onClick?: (e: MouseEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function DropdownMenuTrigger(props: DropdownMenuTriggerProps): Child {
  const ctx = useDropdownMenuContext();

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented) {
      ctx.setOpen(!ctx.open());
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (e.defaultPrevented) return;

    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      ctx.setOpen(true);
      e.preventDefault();
      setTimeout(() => {
        const firstItem = ctx.contentRef.current?.querySelector<HTMLElement>(
          '[role="menuitem"]:not([disabled])'
        );
        firstItem?.focus();
      }, 0);
    }
  };

  const {
    as: Tag = "button",
    children,
    onClick,
    onKeyDown,
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
      aria-haspopup="menu"
      aria-expanded={() => ctx.open()}
      aria-controls={ctx.menuId}
      data-state={() => (ctx.open() ? "open" : "closed")}
      class={className}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface DropdownMenuPortalProps {
  mount?: HTMLElement | null;
  children: Child | (() => Child);
}

export function DropdownMenuPortal(props: DropdownMenuPortalProps): Child {
  return <Portal mount={props.mount}>{props.children}</Portal>;
}

export interface DropdownMenuContentProps {
  as?: string;
  class?: any;
  style?: any;
  onKeyDown?: (e: KeyboardEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function DropdownMenuContent(props: DropdownMenuContentProps): Child {
  const ctx = useDropdownMenuContext();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (e.defaultPrevented) return;

    const el = ctx.contentRef.current;
    if (!el) return;

    const items = Array.from(
      el.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')
    );
    const active = document.activeElement as HTMLElement | null;
    const index = active ? items.indexOf(active) : -1;

    if (e.key === "ArrowDown") {
      const nextIndex = index === items.length - 1 || index === -1 ? 0 : index + 1;
      items[nextIndex]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      const nextIndex = index <= 0 ? items.length - 1 : index - 1;
      items[nextIndex]?.focus();
      e.preventDefault();
    } else if (e.key === "Home") {
      items[0]?.focus();
      e.preventDefault();
    } else if (e.key === "End") {
      items[items.length - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "Escape") {
      ctx.setOpen(false);
      ctx.triggerRef.current?.focus();
      e.preventDefault();
    } else if (e.key === "Tab") {
      ctx.setOpen(false);
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
      id={ctx.menuId}
      role="menu"
      aria-orientation="vertical"
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

export interface DropdownMenuItemProps {
  disabled?: boolean | (() => boolean);
  closeOnSelect?: boolean;
  as?: string;
  class?: any;
  style?: any;
  onSelect?: (e: Event) => void;
  onClick?: (e: MouseEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function DropdownMenuItem(props: DropdownMenuItemProps): Child {
  const ctx = useDropdownMenuContext();
  const closeOnSelect = props.closeOnSelect ?? true;

  const handleSelect = (e: Event) => {
    if (props.disabled) return;
    if (props.onSelect) props.onSelect(e);
    if (!e.defaultPrevented && closeOnSelect) {
      ctx.setOpen(false);
      ctx.triggerRef.current?.focus();
    }
  };

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    handleSelect(e);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(e);
    }
  };

  const {
    disabled,
    closeOnSelect: _cos,
    as: Tag = "div",
    children,
    onClick,
    onKeyDown,
    onSelect: _os,
    class: className,
    style,
    ...rest
  } = props;

  return (
    <Tag
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled}
      class={className}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface DropdownMenuSeparatorProps {
  as?: string;
  class?: any;
  style?: any;
  [key: string]: any;
}

export function DropdownMenuSeparator(props: DropdownMenuSeparatorProps): Child {
  const { as: Tag = "div", class: className, style, ...rest } = props;
  return <Tag role="separator" aria-orientation="horizontal" class={className} style={style} {...rest} />;
}
