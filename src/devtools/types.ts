export type DevToolsTab = "signals" | "graph" | "query" | "rpc" | "dom" | "concepts";

export interface SignalRecord {
  id: string;
  name: string;
  type: "signal" | "computed";
  getValue: () => any;
  version: () => number;
  dependencies?: string[];
  subscribersCount?: () => number;
  lastUpdatedAt: number;
}

export interface QueryRecord {
  hash: string;
  key: any;
  status: () => string;
  fetchStatus: () => string;
  data: () => any;
  error: () => any;
  dataUpdatedAt: () => number;
  refetch?: () => Promise<any>;
  invalidate?: () => void;
}

export interface RpcRecord {
  id: string;
  path: string;
  type: "query" | "mutation" | "subscription";
  input: any;
  response?: any;
  error?: any;
  status: "pending" | "success" | "error" | "streaming";
  startTime: number;
  duration?: number;
  events?: Array<{ timestamp: number; data: any }>;
}

export interface DevToolsOptions {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  initialOpen?: boolean;
  initialTab?: DevToolsTab;
  highlightDOM?: boolean;
}
