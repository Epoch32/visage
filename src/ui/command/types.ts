import type { Child } from "@dom/render";
import type { ReadonlySignal } from "@signals";

export interface CommandItemData {
  value?: string;
  label: Child | (() => Child);
  icon?: Child | (() => Child);
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
  keywords?: string[];
  class?: any;
}

export interface CommandGroupData {
  heading?: string;
  items: CommandItemData[];
}

export interface CommandContextValue {
  search: ReadonlySignal<string>;
  setSearch: (query: string) => void;
  activeValue: ReadonlySignal<string>;
  setActiveValue: (val: string) => void;
  filterMatches: (text: string, keywords?: string[]) => boolean;
  commandId: string;
  filteredCount: ReadonlySignal<number>;
  registerItem?: (id: string, isVisible: () => boolean) => () => void;
}

export interface CommandProps {
  value?: () => string | undefined;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  search?: () => string | undefined;
  onSearchChange?: (query: string) => void;
  placeholder?: string;
  groups?: CommandGroupData[];
  items?: CommandItemData[];
  emptyText?: string;
  class?: any;
  style?: any;
  inputClass?: any;
  listClass?: any;
  itemClass?: any;
  as?: string;
  children?: Child | (() => Child);
  [key: string]: any;
}

export interface CommandInputProps {
  placeholder?: string;
  class?: any;
  style?: any;
  [key: string]: any;
}

export interface CommandListProps {
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export interface CommandEmptyProps {
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export interface CommandGroupProps {
  heading?: string;
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}

export interface CommandItemProps {
  value?: string;
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
  keywords?: string[];
  as?: string;
  class?: any;
  style?: any;
  children: Child | (() => Child);
  [key: string]: any;
}
