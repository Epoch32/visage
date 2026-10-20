import type { Child } from "@dom/render";
import { createSignal, effect, onCleanup } from "@signals";
import { createContext, useContext } from "@signals/context";
import type {
  CommandContextValue,
  CommandEmptyProps,
  CommandGroupData,
  CommandGroupProps,
  CommandInputProps,
  CommandItemData,
  CommandItemProps,
  CommandListProps,
  CommandProps
} from "./command/types";
import { createControllableSignal, createId } from "./utils";

export type {
  CommandContextValue,
  CommandEmptyProps,
  CommandGroupData,
  CommandGroupProps,
  CommandInputProps,
  CommandItemData,
  CommandItemProps,
  CommandListProps,
  CommandProps
};

export const CommandContext = createContext<CommandContextValue | null>(null);

export function useCommandContext(): CommandContextValue | null {
  return useContext(CommandContext);
}

export function CommandRoot(props: CommandProps): Child {
  const [search, setSearch] = createControllableSignal<string>({
    value: props.search,
    defaultValue: "",
    onChange: props.onSearchChange
  });

  const [activeValue, setActiveValue] = createControllableSignal<string>({
    value: props.value,
    defaultValue: props.defaultValue ?? "",
    onChange: props.onValueChange
  });

  const commandId = createId("command");

  const filterMatches = (text: string, keywords?: string[]): boolean => {
    const q = search().toLowerCase().trim();
    if (!q) return true;
    if (text.toLowerCase().includes(q)) return true;
    if (keywords?.some((k) => k.toLowerCase().includes(q))) return true;
    return false;
  };

  const itemsMap = new Map<string, () => boolean>();
  const [filteredCount, setFilteredCount] = createSignal(0);

  const updateFilteredCount = () => {
    let count = 0;
    for (const isVisible of itemsMap.values()) {
      if (isVisible()) count++;
    }
    setFilteredCount(count);
  };

  const registerItem = (id: string, isVisible: () => boolean): (() => void) => {
    itemsMap.set(id, isVisible);
    updateFilteredCount();
    return () => {
      itemsMap.delete(id);
      updateFilteredCount();
    };
  };

  effect(() => {
    search();
    updateFilteredCount();
  });

  const ctx: CommandContextValue = {
    search,
    setSearch,
    activeValue,
    setActiveValue,
    filterMatches,
    commandId,
    filteredCount,
    registerItem
  };

  const {
    as: Tag = "div",
    placeholder = "Type a command or search...",
    groups,
    items,
    emptyText = "No results found.",
    class: className,
    style,
    inputClass,
    listClass,
    itemClass,
    children,
    ...rest
  } = props;

  // Ergonomic Shorthand renderer
  if (groups || items) {
    return CommandContext.Provider({
      value: ctx,
      children: () => (
        <Tag
          class={className}
          style={{ display: "flex", flexDirection: "column", overflow: "hidden", ...style }}
          {...rest}
        >
          <CommandInput placeholder={placeholder} class={inputClass} />
          <CommandList class={listClass}>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groups?.map((grp) => (
              <CommandGroup heading={grp.heading}>
                {grp.items.map((item) => (
                  <CommandItem
                    value={item.value}
                    shortcut={item.shortcut}
                    disabled={item.disabled}
                    onSelect={item.onSelect}
                    keywords={item.keywords}
                    class={item.class ?? itemClass}
                  >
                    {item.icon ? (
                      <span
                        style={{ display: "inline-flex", alignItems: "center", marginRight: "8px" }}
                      >
                        {typeof item.icon === "function" ? item.icon() : item.icon}
                      </span>
                    ) : null}
                    {typeof item.label === "function" ? item.label() : item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {items?.map((item) => (
              <CommandItem
                value={item.value}
                shortcut={item.shortcut}
                disabled={item.disabled}
                onSelect={item.onSelect}
                keywords={item.keywords}
                class={item.class ?? itemClass}
              >
                {item.icon ? (
                  <span
                    style={{ display: "inline-flex", alignItems: "center", marginRight: "8px" }}
                  >
                    {typeof item.icon === "function" ? item.icon() : item.icon}
                  </span>
                ) : null}
                {typeof item.label === "function" ? item.label() : item.label}
              </CommandItem>
            ))}
            {typeof children === "function" ? children() : children}
          </CommandList>
        </Tag>
      )
    });
  }

  return CommandContext.Provider({
    value: ctx,
    children: () => (
      <Tag class={className} style={style} {...rest}>
        {typeof children === "function" ? children() : children}
      </Tag>
    )
  });
}

export function CommandInput(props: CommandInputProps): Child {
  const ctx = useContext(CommandContext);

  const handleKeyDown = (e: KeyboardEvent) => {
    const list = (e.currentTarget as HTMLElement)
      .closest('[role="combobox"], [data-command-root], div')
      ?.querySelector('[role="listbox"]');
    if (!list) return;

    const items = Array.from(
      list.querySelectorAll<HTMLElement>(
        '[role="option"]:not([aria-disabled="true"]):not([style*="display: none"])'
      )
    );
    if (items.length === 0) return;

    const currentActive =
      items.find((el) => el.getAttribute("aria-selected") === "true") ?? items[0];
    const index = currentActive ? items.indexOf(currentActive) : 0;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (index + 1) % items.length;
      const nextItem = items[nextIndex];
      if (nextItem && ctx) {
        ctx.setActiveValue(nextItem.getAttribute("data-value") ?? "");
        nextItem.scrollIntoView({ block: "nearest" });
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (index - 1 + items.length) % items.length;
      const prevItem = items[prevIndex];
      if (prevItem && ctx) {
        ctx.setActiveValue(prevItem.getAttribute("data-value") ?? "");
        prevItem.scrollIntoView({ block: "nearest" });
      }
    } else if (e.key === "Enter" && currentActive) {
      e.preventDefault();
      currentActive.click();
    }
  };

  const listId = ctx ? `${ctx.commandId}-list` : undefined;
  const activeDescendant = () => {
    if (!ctx) return undefined;
    const val = ctx.activeValue();
    return val ? `${ctx.commandId}-item-${String(val).replace(/[^a-zA-Z0-9_-]/g, "-")}` : undefined;
  };

  const { placeholder = "Type a command...", class: className, style, ...rest } = props;

  return (
    <input
      type="text"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded="true"
      aria-controls={listId}
      aria-activedescendant={activeDescendant}
      placeholder={placeholder}
      value={() => ctx?.search() ?? ""}
      onInput={(e: any) => ctx?.setSearch(e.target.value)}
      onKeyDown={handleKeyDown}
      class={className}
      style={style}
      {...rest}
    />
  );
}

export function CommandList(props: CommandListProps): Child {
  const ctx = useContext(CommandContext);
  const { as: Tag = "div", children, class: className, style, id, ...rest } = props;
  const listId = id ?? (ctx ? `${ctx.commandId}-list` : undefined);
  return (
    <Tag
      id={listId}
      role="listbox"
      class={className}
      style={{ overflowY: "auto", ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CommandEmpty(props: CommandEmptyProps): Child {
  const ctx = useContext(CommandContext);
  const { as: Tag = "div", children, class: className, style, ...rest } = props;

  const isVisible = () => {
    if (!ctx) return false;
    return ctx.filteredCount() === 0;
  };

  return (
    <Tag
      class={className}
      style={() => ({
        display: isVisible() ? undefined : "none",
        textAlign: "center",
        padding: "16px",
        color: "#94a3b8",
        ...style
      })}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CommandGroup(props: CommandGroupProps): Child {
  const { heading, as: Tag = "div", children, class: className, style, ...rest } = props;
  return (
    <Tag role="group" class={className} style={style} {...rest}>
      {heading ? (
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#64748b",
            padding: "6px 10px"
          }}
        >
          {heading}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}

export function CommandItem(props: CommandItemProps): Child {
  const ctx = useContext(CommandContext);
  const itemValue =
    props.value ?? (typeof props.children === "string" ? props.children : createId("item"));

  const isVisible = () => {
    if (!ctx) return true;
    const text = typeof props.children === "string" ? props.children : itemValue;
    return ctx.filterMatches(text, props.keywords);
  };

  const {
    as: Tag = "div",
    shortcut,
    disabled,
    children,
    class: className,
    style,
    id,
    ...rest
  } = props;
  const itemId =
    id ??
    (ctx
      ? `${ctx.commandId}-item-${String(itemValue).replace(/[^a-zA-Z0-9_-]/g, "-")}`
      : createId("command-item"));

  if (ctx?.registerItem) {
    onCleanup(ctx.registerItem(itemId, isVisible));
  }

  const isSelected = () => (ctx ? ctx.activeValue() === itemValue : false);

  const handleClick = () => {
    if (props.disabled) return;
    if (props.onSelect) props.onSelect();
  };

  return (
    <Tag
      id={itemId}
      role="option"
      data-value={itemValue}
      aria-selected={isSelected}
      aria-disabled={disabled}
      class={className}
      style={() => ({
        display: isVisible() ? "flex" : "none",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: disabled ? "not-allowed" : "pointer",
        ...style
      })}
      onClick={handleClick}
      {...rest}
    >
      <div style={{ display: "flex", alignItems: "center" }}>{children}</div>
      {shortcut ? (
        <span
          style={{
            fontSize: "11px",
            color: "#64748b",
            background: "#1e293b",
            padding: "2px 6px",
            borderRadius: "4px"
          }}
        >
          {shortcut}
        </span>
      ) : null}
    </Tag>
  );
}

export const Command = Object.assign(CommandRoot, {
  Root: CommandRoot,
  Input: CommandInput,
  List: CommandList,
  Empty: CommandEmpty,
  Group: CommandGroup,
  Item: CommandItem
});
