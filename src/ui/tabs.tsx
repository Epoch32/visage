import { Show } from "@dom/control-flow";
import type { Child } from "@dom/render";
import { isSignal, type ReadonlySignal, signal } from "@signals";
import { createContext, useContext } from "@signals/context";
import { createControllableSignal, createId } from "./utils";

export interface TabsContextValue {
  value: ReadonlySignal<string>;
  setValue: (value: string) => void;
  orientation: "horizontal" | "vertical";
  activationMode: "automatic" | "manual";
  baseId: string;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(): TabsContextValue | null {
  return useContext(TabsContext);
}

export interface TabItem {
  value: string;
  label: Child | (() => Child);
  icon?: Child | (() => Child);
  content?: Child | (() => Child);
  disabled?: boolean | (() => boolean);
}

export interface TabsProps {
  value?: () => string | undefined;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
  items?: TabItem[];
  listClass?: any;
  triggerClass?: any;
  contentClass?: any;
  class?: any;
  style?: any;
  as?: string;
  children?: Child | (() => Child);
  [key: string]: any;
}

export function TabsRoot(props: TabsProps): Child {
  const [value, setValue] = createControllableSignal<string>({
    value: props.value,
    defaultValue:
      props.defaultValue ?? (props.items && props.items.length > 0 ? props.items[0]?.value : ""),
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
    items,
    listClass,
    triggerClass,
    contentClass,
    children,
    class: className,
    style,
    ...rest
  } = props;

  return TabsContext.Provider({
    value: ctx,
    children: () => (
      <Tag data-orientation={orientation} class={className} style={style} {...rest}>
        {items ? (
          <>
            <TabsList class={listClass}>
              {items.map((item) => (
                <TabsTrigger value={item.value} disabled={item.disabled} class={triggerClass}>
                  {item.icon ? (
                    <span class="tab-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                      {typeof item.icon === "function" ? item.icon() : item.icon}
                    </span>
                  ) : null}
                  {typeof item.label === "function" ? item.label() : item.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {items.map((item) => (
              <TabsContent value={item.value} class={contentClass}>
                {typeof item.content === "function" ? item.content() : item.content}
              </TabsContent>
            ))}
          </>
        ) : null}
        {children}
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
  const ctx = useContext(TabsContext);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onKeyDown) props.onKeyDown(e);
    if (e.defaultPrevented) return;

    const target = e.target as HTMLElement | null;
    if (target?.getAttribute("role") !== "tab") return;

    const list = target.closest('[role="tablist"]');
    if (!list) return;

    const tabs = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'));
    const index = tabs.indexOf(target);
    if (index === -1) return;

    let nextIndex = index;
    const isHorizontal = (ctx?.orientation ?? "horizontal") === "horizontal";

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
      if (ctx?.activationMode === "automatic") {
        const val = nextTab.getAttribute("data-value");
        if (val) ctx.setValue(val);
      }
    }
  };

  const { as: Tag = "div", children, onKeyDown, class: className, style, ...rest } = props;

  return (
    <Tag
      role="tablist"
      aria-orientation={ctx?.orientation ?? "horizontal"}
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
  const ctx = useContext(TabsContext);
  const isSelected = () => (ctx ? ctx.value() === props.value : false);

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented && ctx) {
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

  return (
    <Tag
      id={ctx ? `${ctx.baseId}-trigger-${value}` : undefined}
      type={Tag === "button" ? "button" : undefined}
      role="tab"
      aria-selected={() => String(isSelected())}
      aria-controls={ctx ? `${ctx.baseId}-panel-${value}` : undefined}
      data-state={() => (isSelected() ? "active" : "inactive")}
      data-active={() => (isSelected() ? "true" : "false")}
      data-value={value}
      tabIndex={() => (isSelected() ? 0 : -1)}
      disabled={disabled}
      class={() => [className, isSelected() ? "active" : ""].filter(Boolean).join(" ")}
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
  const ctx = useContext(TabsContext);
  const isSelected = () => (ctx ? ctx.value() === props.value : false);

  const { value, forceMount, as: Tag = "div", children, class: className, style, ...rest } = props;

  if (forceMount) {
    return (
      <Tag
        id={ctx ? `${ctx.baseId}-panel-${value}` : undefined}
        role="tabpanel"
        aria-labelledby={ctx ? `${ctx.baseId}-trigger-${value}` : undefined}
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
        id={ctx ? `${ctx.baseId}-panel-${value}` : undefined}
        role="tabpanel"
        aria-labelledby={ctx ? `${ctx.baseId}-trigger-${value}` : undefined}
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

export interface CreateTabsOptions {
  value?: () => string | undefined;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
}

export function createTabs(options: CreateTabsOptions = {}) {
  const activeSignal =
    typeof options.value === "function"
      ? (options.value as ReadonlySignal<string>)
      : signal<string>(options.defaultValue ?? "");

  const value = activeSignal;
  const setValue = (next: string) => {
    if (isSignal(activeSignal)) {
      (activeSignal as any).set(next);
    }
    if (options.onValueChange) {
      options.onValueChange(next);
    }
  };

  const baseId = createId("tabs");
  const orientation = options.orientation ?? "horizontal";
  const activationMode = options.activationMode ?? "automatic";

  const ctxValue: TabsContextValue = {
    value,
    setValue,
    orientation,
    activationMode,
    baseId
  };

  const Root = (props: {
    as?: string;
    class?: any;
    style?: any;
    children: Child;
    [key: string]: any;
  }) => {
    const { children, ...rest } = props;
    return (
      <TabsContext.Provider value={ctxValue}>
        <TabsRoot
          value={() => value()}
          orientation={orientation}
          activationMode={activationMode}
          {...rest}
        >
          {children}
        </TabsRoot>
      </TabsContext.Provider>
    );
  };

  const List = (props: TabsListProps) => {
    return (
      <TabsContext.Provider value={ctxValue}>
        <TabsList {...props} />
      </TabsContext.Provider>
    );
  };

  const Trigger = (props: TabsTriggerProps) => {
    return (
      <TabsContext.Provider value={ctxValue}>
        <TabsTrigger {...props} />
      </TabsContext.Provider>
    );
  };

  const Content = (props: TabsContentProps) => {
    return (
      <TabsContext.Provider value={ctxValue}>
        <TabsContent {...props} />
      </TabsContext.Provider>
    );
  };

  return {
    value,
    setValue,
    Root,
    List,
    Trigger,
    Content
  };
}

export const Tabs = Object.assign(TabsRoot, {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
  create: createTabs
});
