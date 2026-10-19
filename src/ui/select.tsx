import { Portal } from "@dom/control-flow";
import type { Child } from "@dom/render";
import type { ReadonlySignal } from "@signals";
import { createContext, useContext } from "@signals/context";
import { useDismiss } from "./overlay";
import { createControllableSignal, createId } from "./utils";

export interface SelectOptionData {
  value: string;
  label: Child | (() => Child);
  disabled?: boolean;
}

export interface SelectContextValue {
  value: ReadonlySignal<string>;
  setValue: (val: string) => void;
  open: ReadonlySignal<boolean>;
  setOpen: (open: boolean) => void;
  triggerRef: { current: HTMLElement | null };
  contentRef: { current: HTMLElement | null };
  selectId: string;
}

export const SelectContext = createContext<SelectContextValue | null>(null);

export function useSelectContext(): SelectContextValue | null {
  return useContext(SelectContext);
}

export interface SelectProps {
  value?: () => string | undefined;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  options?: SelectOptionData[];
  disabled?: boolean | (() => boolean);
  triggerClass?: any;
  contentClass?: any;
  itemClass?: any;
  portalled?: boolean;
  as?: string;
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  [key: string]: any;
}

export function SelectRoot(props: SelectProps): Child {
  const [value, setValue] = createControllableSignal<string>({
    value: props.value,
    defaultValue: props.defaultValue ?? "",
    onChange: props.onValueChange
  });

  const [open, setOpen] = createControllableSignal<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: props.onOpenChange
  });

  const triggerRef: { current: HTMLElement | null } = { current: null };
  const contentRef: { current: HTMLElement | null } = { current: null };
  const selectId = createId("select");

  const ctx: SelectContextValue = {
    value,
    setValue,
    open,
    setOpen,
    triggerRef,
    contentRef,
    selectId
  };

  const {
    value: _v,
    defaultValue: _dv,
    onValueChange: _ovc,
    open: _op,
    defaultOpen: _dop,
    onOpenChange: _oop,
    placeholder = "Select an option...",
    options,
    disabled,
    triggerClass,
    contentClass,
    itemClass,
    portalled = false,
    as: Tag = "div",
    children,
    class: className,
    style,
    ...rest
  } = props;

  // Ergonomic Shorthand: options array provided
  if (options) {
    return SelectContext.Provider({
      value: ctx,
      children: () => (
        <Tag class={className} style={{ position: "relative", ...style }} {...rest}>
          <SelectTrigger class={triggerClass} disabled={disabled}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent portalled={portalled} class={contentClass}>
            {options.map((opt) => (
              <SelectItem value={opt.value} disabled={opt.disabled} class={itemClass}>
                {typeof opt.label === "function" ? opt.label() : opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Tag>
      )
    });
  }

  return SelectContext.Provider({
    value: ctx,
    children: () => (
      <Tag class={className} style={{ position: "relative", ...style }} {...rest}>
        {typeof children === "function" ? children() : children}
      </Tag>
    )
  });
}

export interface SelectTriggerProps {
  as?: string;
  disabled?: boolean | (() => boolean);
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  onClick?: (e: MouseEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  [key: string]: any;
}

export function SelectTrigger(props: SelectTriggerProps): Child {
  const ctx = useContext(SelectContext);

  const isDisabled = () =>
    typeof props.disabled === "function"
      ? (props.disabled as () => boolean)()
      : Boolean(props.disabled);

  const handlePointerDown = (e: PointerEvent) => {
    if (props.onPointerDown) props.onPointerDown(e);
    if (!e.defaultPrevented && !isDisabled() && ctx) {
      e.stopPropagation?.();
    }
  };

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented && !isDisabled() && ctx) {
      e.stopPropagation?.();
      ctx.setOpen(!ctx.open());
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (!e.defaultPrevented && !isDisabled() && ctx) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        ctx.setOpen(true);
      }
    }
  };

  const {
    as: Tag = "button",
    disabled: _dis,
    children,
    class: className,
    style,
    onClick,
    onKeyDown,
    ...rest
  } = props;

  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        if (ctx) ctx.triggerRef.current = el;
      }}
      type={Tag === "button" ? "button" : undefined}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={() => ctx?.open() ?? false}
      aria-disabled={isDisabled}
      data-state={() => (ctx?.open() ? "open" : "closed")}
      disabled={isDisabled}
      class={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: () => (isDisabled() ? "not-allowed" : "pointer"),
        ...style
      }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface SelectValueProps {
  placeholder?: string;
  class?: any;
  style?: any;
  [key: string]: any;
}

export function SelectValue(props: SelectValueProps): Child {
  const ctx = useContext(SelectContext);
  const { placeholder = "Select...", class: className, style, ...rest } = props;

  return (
    <span class={className} style={style} {...rest}>
      {() => (ctx?.value() ? ctx.value() : placeholder)}
    </span>
  );
}

export interface SelectContentProps {
  as?: string;
  portalled?: boolean;
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  [key: string]: any;
}

export function SelectContent(props: SelectContentProps): Child {
  const ctx = useContext(SelectContext);

  const dismiss = useDismiss(() => ctx?.contentRef.current, {
    enabled: () => ctx?.open() ?? false,
    onDismiss: () => ctx?.setOpen(false),
    escapeKey: true,
    outsidePointer: true,
    outsideIgnore: () => (ctx?.triggerRef.current ? [ctx.triggerRef.current] : [])
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    dismiss.handleKeyDown(e);
    if (!ctx) return;
    const content = ctx.contentRef.current;
    if (!content) return;

    const items = Array.from(
      content.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])')
    );
    if (items.length === 0) return;

    const currentIndex = items.findIndex((el) => el.getAttribute("data-value") === ctx.value());

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex]?.focus();
    }
  };

  const { as: Tag = "div", portalled = false, children, class: className, style, ...rest } = props;

  const content = (
    <Tag
      ref={(el: HTMLElement | null) => {
        if (ctx) ctx.contentRef.current = el;
      }}
      role="listbox"
      tabIndex={-1}
      data-state={() => (ctx?.open() ? "open" : "closed")}
      class={className}
      style={{
        display: () => (ctx?.open() ? "flex" : "none"),
        flexDirection: "column",
        outline: "none",
        ...style
      }}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </Tag>
  );

  if (portalled) {
    return <Portal>{content}</Portal>;
  }

  return content;
}

export interface SelectItemProps {
  value: string;
  disabled?: boolean;
  as?: string;
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  onClick?: (e: MouseEvent) => void;
  [key: string]: any;
}

export function SelectItem(props: SelectItemProps): Child {
  const ctx = useContext(SelectContext);

  const isSelected = () => (ctx ? ctx.value() === props.value : false);

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!props.disabled && ctx) {
      ctx.setValue(props.value);
      ctx.setOpen(false);
      ctx.triggerRef.current?.focus();
    }
  };

  const {
    value,
    disabled = false,
    as: Tag = "div",
    children,
    class: className,
    style,
    onClick,
    ...rest
  } = props;

  return (
    <Tag
      role="option"
      tabIndex={disabled ? -1 : 0}
      data-value={value}
      aria-selected={isSelected}
      aria-disabled={disabled}
      class={className}
      style={() => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        ...style
      })}
      onClick={handleClick}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export const Select = Object.assign(SelectRoot, {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Content: SelectContent,
  Item: SelectItem
});
