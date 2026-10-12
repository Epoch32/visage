import type { Child } from "../../dom/render";
import type { ReadonlySignal } from "../../signals";

export interface BottomBarContextValue {
  value: ReadonlySignal<string>;
  setValue: (value: string) => void;
  baseId: string;
  variant: "floating" | "docked";
}

export interface BottomBarItemConfig {
  value: string;
  label?: Child | (() => Child);
  icon?: Child | (() => Child);
  badge?: Child | number | string | (() => Child | number | string | undefined);
  disabled?: boolean | (() => boolean);
  onClick?: (e: MouseEvent) => void;
  class?: any;
  style?: any;
}

export interface BottomBarProps {
  value?: () => string | undefined;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: "floating" | "docked";
  hideOnScroll?: boolean;
  scrollThreshold?: number;
  items?: BottomBarItemConfig[];
  itemClass?: any;
  itemStyle?: any;
  as?: string;
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  [key: string]: any;
}

export interface BottomBarItemProps {
  value: string;
  icon?: Child | (() => Child);
  label?: Child | (() => Child);
  badge?: Child | number | string | (() => Child | number | string | undefined);
  disabled?: boolean | (() => boolean);
  onClick?: (e: MouseEvent) => void;
  as?: string;
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  [key: string]: any;
}

export interface BottomBarActionProps {
  icon?: Child | (() => Child);
  label?: string;
  disabled?: boolean | (() => boolean);
  onClick?: (e: MouseEvent) => void;
  as?: string;
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  [key: string]: any;
}

export interface BottomBarBadgeProps {
  count?: Child | number | string | (() => Child | number | string | undefined);
  as?: string;
  class?: any;
  style?: any;
  children?: Child | (() => Child);
  [key: string]: any;
}

export interface BottomBarSeparatorProps {
  as?: string;
  class?: any;
  style?: any;
  [key: string]: any;
}
