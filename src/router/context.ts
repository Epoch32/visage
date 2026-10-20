import { createContext, useContext } from "@signals";
import type { RouterContextValue } from "./types";

export const RouterContext = createContext<RouterContextValue | null>(null);

export function useRouterContext(): RouterContextValue | null {
  return useContext(RouterContext);
}
