/** @jsxImportSource visage */
import { Show } from "../dom/control-flow";
import { type Child } from "../dom/render";
import { createContext, useContext } from "../signals/context";
import { type ReadonlySignal } from "../signals";
import { createControllableSignal, createId } from "./utils";

export interface TabsContextValue {
  value: ReadonlySignal<string>;
  setValue: (value: string) => void;
  orientation: "horizontal" | "vertical";
  activationMode: "automatic" | "manual";
  baseId: string;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs compound components must be rendered within a <Tabs />");
  }
  return ctx;
}

export interface TabsProps {
  value?: () => string | undefined;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
  class?: any;
  style?: any;
  as?: string;
  children: Child | (() => Child);
  [key: string]: any;
}

export function Tabs(props: TabsProps): Child {
  const [value, setValue] = createControllableSignal<string>({
    value: props.value,
    defaultValue: props.defaultValue ?? "",
    onChange: props.onValueChange
  });

  const baseId = createId("tabs");
  const orientation = props.orientation ?? "horizontal";
  const activationMode = props.activationMode ?? "automatic";

  const ctx: TabsContextValue = {
    value,
    setValue,
    orientation,
    activationMode,
    baseId
  };

  const {
    as: Tag = "div",
    value: _v,
    defaultValue: _dv,
    onValueChange: _ovc,
    orientation: _ori,
    activationMode: _am,
    children,
    class: className,
    style,
    ...rest
  } = props;

  return TabsContext.Provider({
    value: ctx,
    children: () => (
      <Tag
        data-orientation={orientation}
        class={className}
        style={style}
        {...rest}
      >
        {typeof children === "function" ? children() : children}
      </Tag>
    )
  });
}

export interface TabsListProps {
  as?: string;
  class?: any;
  style?: any;
  onKeyDown?: (e: KeyboardEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function TabsList(props: TabsListProps): Child {
  const ctx = useTabsContext();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (e.defaultPrevented) return;

    const target = e.target as HTMLElement | null;
    if (!target || target.getAttribute("role") !== "tab") return;

    const list = target.closest('[role="tablist"]');
    if (!list) return;

    const tabs = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'));
    const index = tabs.indexOf(target);
    if (index === -1) return;

    let nextIndex = index;
    const isHorizontal = ctx.orientation === "horizontal";

    const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";
    const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";

    if (e.key === prevKey) {
      nextIndex = index === 0 ? tabs.length - 1 : index - 1;
      e.preventDefault();
    } else if (e.key === nextKey) {
      nextIndex = index === tabs.length - 1 ? 0 : index + 1;
      e.preventDefault();
    } else if (e.key === "Home") {
      nextIndex = 0;
      e.preventDefault();
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
      e.preventDefault();
    }

    if (nextIndex !== index) {
      const nextTab = tabs[nextIndex]!;
      nextTab.focus();
      if (ctx.activationMode === "automatic") {
        const val = nextTab.getAttribute("data-value");
        if (val) ctx.setValue(val);
      }
    }
  };

  const { as: Tag = "div", children, onKeyDown, class: className, style, ...rest } = props;

  return (
    <Tag
      role="tablist"
      aria-orientation={ctx.orientation}
      class={className}
      style={style}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface TabsTriggerProps {
  value: string;
  disabled?: boolean | (() => boolean);
  as?: string;
  class?: any;
  style?: any;
  onClick?: (e: MouseEvent) => void;
  children: Child | (() => Child);
  [key: string]: any;
}

export function TabsTrigger(props: TabsTriggerProps): Child {
  const ctx = useTabsContext();
  const isSelected = () => ctx.value() === props.value;

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented) {
      ctx.setValue(props.value);
    }
  };

  const {
    value,
    disabled,
    as: Tag = "button",
    children,
    onClick,
    class: className,
    style,
    ...rest
  } = props;

  const tabId = `${ctx.baseId}-trigger-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  return (
    <Tag
      id={tabId}
      type={Tag === "button" ? "button" : undefined}
      role="tab"
      aria-selected={isSelected}
      aria-controls={panelId}
      data-state={() => (isSelected() ? "active" : "inactive")}
      data-value={value}
      tabIndex={() => (isSelected() ? 0 : -1)}
      disabled={disabled}
      class={className}
      style={style}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface TabsContentProps {
  value: string;
  forceMount?: boolean;
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export function TabsContent(props: TabsContentProps): Child {
  const ctx = useTabsContext();
  const isSelected = () => ctx.value() === props.value;

  const {
    value,
    forceMount,
    as: Tag = "div",
    children,
    class: className,
    style,
    ...rest
  } = props;

  const tabId = `${ctx.baseId}-trigger-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  if (forceMount) {
    return (
      <Tag
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId}
        data-state={() => (isSelected() ? "active" : "inactive")}
        hidden={() => !isSelected()}
        tabIndex={0}
        class={className}
        style={style}
        {...rest}
      >
        {children}
      </Tag>
    );
  }

  return (
    <Show when={isSelected}>
      <Tag
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId}
        data-state="active"
        tabIndex={0}
        class={className}
        style={style}
        {...rest}
      >
        {children}
      </Tag>
    </Show>
  );
}
