import { Portal } from "../dom/control-flow";
import type { Child } from "../dom/render";
import type { ReadonlySignal } from "../signals";
import { createContext, useContext } from "../signals/context";
import { useDismiss } from "./overlay";
import { createControllableSignal, createId } from "./utils";

export interface DropdownMenuContextValue {
  open: ReadonlySignal<boolean>;
  setOpen: (open: boolean) => void;
  triggerRef: { current: HTMLElement | null };
  contentRef: { current: HTMLElement | null };
  menuId: string;
}

export const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

export function useDropdownMenuContext(): DropdownMenuContextValue | null {
  return useContext(DropdownMenuContext);
}

export interface DropdownMenuItemData {
  label?: Child | (() => Child);
  icon?: Child | (() => Child);
  disabled?: boolean | (() => boolean);
  danger?: boolean;
  separator?: boolean;
  onSelect?: (e: Event) => void;
  class?: any;
}

export interface DropdownMenuProps {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: Child | (() => Child);
  items?: DropdownMenuItemData[];
  triggerClass?: any;
  contentClass?: any;
  itemClass?: any;
  separatorClass?: any;
  portalled?: boolean;
  children?: Child | (() => Child);
}

export function DropdownMenuRoot(props: DropdownMenuProps): Child {
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

  if (props.trigger !== undefined || props.items !== undefined) {
    return DropdownMenuContext.Provider({
      value: ctx,
      children: () => (
        <div class="visage-dropdown-root" style={{ position: "relative", display: "inline-block" }}>
          {props.trigger ? (
            <DropdownMenuTrigger as="span" class={props.triggerClass}>
              {typeof props.trigger === "function" ? props.trigger() : props.trigger}
            </DropdownMenuTrigger>
          ) : null}
          <DropdownMenuContent portalled={props.portalled ?? false} class={props.contentClass}>
            {props.items
              ? props.items.map((item) => {
                  if (item.separator) {
                    return <DropdownMenuSeparator class={item.class ?? props.separatorClass} />;
                  }
                  return (
                    <DropdownMenuItem
                      disabled={item.disabled}
                      onSelect={item.onSelect}
                      class={[props.itemClass, item.class, item.danger ? "danger" : ""]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {item.icon ? (
                        <span
                          class="dropdown-item-icon"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            marginRight: "8px"
                          }}
                        >
                          {typeof item.icon === "function" ? item.icon() : item.icon}
                        </span>
                      ) : null}
                      {typeof item.label === "function" ? item.label() : item.label}
                    </DropdownMenuItem>
                  );
                })
              : null}
            {typeof props.children === "function" ? props.children() : props.children}
          </DropdownMenuContent>
        </div>
      )
    });
  }

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
  const ctx = useContext(DropdownMenuContext);

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented && ctx) {
      ctx.setOpen(!ctx.open());
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (e.defaultPrevented) return;

    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      if (ctx) {
        ctx.setOpen(true);
        e.preventDefault();
        setTimeout(() => {
          const firstItem = ctx.contentRef.current?.querySelector<HTMLElement>(
            '[role="menuitem"]:not([disabled])'
          );
          firstItem?.focus();
        }, 0);
      }
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
        if (ctx) ctx.triggerRef.current = el;
      }}
      type={Tag === "button" ? "button" : undefined}
      aria-haspopup="menu"
      aria-expanded={() => ctx?.open() ?? false}
      aria-controls={ctx?.menuId}
      data-state={() => (ctx?.open() ? "open" : "closed")}
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
  portalled?: boolean;
  mount?: HTMLElement | null;
  class?: any;
  style?: any;
  onKeyDown?: (e: KeyboardEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function DropdownMenuContent(props: DropdownMenuContentProps): Child {
  const ctx = useContext(DropdownMenuContext);

  const dismiss = useDismiss(() => ctx?.contentRef.current, {
    enabled: () => ctx?.open() ?? false,
    onDismiss: () => {
      if (ctx) {
        ctx.setOpen(false);
        ctx.triggerRef.current?.focus();
      }
    },
    escapeKey: true,
    outsidePointer: true,
    outsideIgnore: () => [ctx?.triggerRef.current]
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (e.defaultPrevented) return;

    const el = ctx?.contentRef.current;
    if (!el) return;

    const items = Array.from(el.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
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
      dismiss.handleKeyDown(e);
      e.preventDefault();
    } else if (e.key === "Tab") {
      if (ctx) ctx.setOpen(false);
    }
  };

  const {
    as: Tag = "div",
    children,
    onKeyDown,
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
        }
      }}
      id={ctx?.menuId}
      role="menu"
      aria-orientation="vertical"
      data-state={() => (ctx?.open() ? "open" : "closed")}
      class={className}
      style={() => ({
        display: ctx?.open() ? undefined : "none",
        ...style
      })}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      {...rest}
    >
      {children}
    </Tag>
  );

  return portalled ? <Portal mount={mount}>{content}</Portal> : content;
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
  const ctx = useContext(DropdownMenuContext);
  const closeOnSelect = props.closeOnSelect ?? true;

  const handleSelect = (e: Event) => {
    if (props.disabled) return;
    if (props.onSelect) props.onSelect(e);
    if (!e.defaultPrevented && closeOnSelect && ctx) {
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
  return (
    <Tag role="separator" aria-orientation="horizontal" class={className} style={style} {...rest} />
  );
}

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Root: DropdownMenuRoot,
  Trigger: DropdownMenuTrigger,
  Portal: DropdownMenuPortal,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  Separator: DropdownMenuSeparator
});
