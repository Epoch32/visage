import type { QueryClient } from "@query/query-client";
import { devtoolsHub } from "./hub";

export { VisageDevTools } from "./component";
export { highlightElement } from "./highlighter";
export { DevToolsHub, devtoolsHub } from "./hub";
export type {
  DevToolsOptions,
  DevToolsTab,
  QueryRecord,
  RpcRecord,
  SignalRecord
} from "./types";

/**
 * Connect QueryClient or RPC client to Visage DevTools
 */
export function connectDevTools(client: QueryClient) {
  devtoolsHub.attachQueryClient(client);
}
