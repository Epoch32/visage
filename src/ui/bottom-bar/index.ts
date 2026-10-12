import { BottomBarAction } from "./action";
import { BottomBarBadge } from "./badge";
import { BottomBarItem } from "./item";
import { BottomBarRoot } from "./root";
import { BottomBarSeparator } from "./separator";

export { BottomBarAction } from "./action";
export { BottomBarBadge } from "./badge";
export { BottomBarContext, useBottomBarContext } from "./context";
export { BottomBarItem } from "./item";
export { BottomBarRoot } from "./root";
export { BottomBarSeparator } from "./separator";
export type {
  BottomBarActionProps,
  BottomBarBadgeProps,
  BottomBarContextValue,
  BottomBarItemConfig,
  BottomBarItemProps,
  BottomBarProps,
  BottomBarSeparatorProps
} from "./types";

export const BottomBar = Object.assign(BottomBarRoot, {
  Root: BottomBarRoot,
  Item: BottomBarItem,
  Action: BottomBarAction,
  Badge: BottomBarBadge,
  Separator: BottomBarSeparator
});
