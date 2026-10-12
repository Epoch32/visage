import { createContext, useContext } from "../../signals/context";
import type { BottomBarContextValue } from "./types";

export const BottomBarContext = createContext<BottomBarContextValue | null>(null);

export function useBottomBarContext(): BottomBarContextValue | null {
  return useContext(BottomBarContext);
}
