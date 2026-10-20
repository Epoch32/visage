import type { QueryClient } from "@query/query-client";
import { signal } from "@signals";
import type { DevToolsTab, QueryRecord, RpcRecord, SignalRecord } from "./types";

export class DevToolsHub {
  readonly isOpen = signal(false, { internal: true });
  readonly activeTab = signal<DevToolsTab>("signals", { internal: true });
  readonly highlightDOM = signal(false, { internal: true });
  readonly searchQuery = signal("", { internal: true });

  // Store active records
  private _signalsMap = new Map<string, SignalRecord>();
  readonly signalsList = signal<SignalRecord[]>([], { internal: true });

  private _queriesMap = new Map<string, QueryRecord>();
  readonly queriesList = signal<QueryRecord[]>([], { internal: true });

  readonly rpcLogs = signal<RpcRecord[]>([], { internal: true });
  private _queryClients = new Map<QueryClient, () => void>();

  private _signalCounter = 0;

  constructor() {
    if (typeof window !== "undefined") {
      (window as any).__VISAGE_DEVTOOLS__ = this;
    }
  }

  toggle() {
    this.isOpen.update((v) => !v);
  }

  setTab(tab: DevToolsTab) {
    this.activeTab.set(tab);
  }

  // --- Signal Tracking ---
  registerSignal(options: {
    id?: string;
    name?: string;
    type?: "signal" | "computed";
    getValue: () => any;
    version: () => number;
    dependencies?: () => string[];
    dependents?: () => string[];
    subscribersCount?: () => number;
  }): string {
    const id = options.id ?? `sig_${++this._signalCounter}`;
    const name = options.name ?? id;
    const type = options.type ?? "signal";

    const record: SignalRecord = {
      id,
      name,
      type,
      getValue: options.getValue,
      version: options.version,
      dependencies: options.dependencies,
      dependents: options.dependents,
      subscribersCount: options.subscribersCount,
      lastUpdatedAt: Date.now()
    };

    this._signalsMap.set(id, record);
    this.refreshSignals();
    return id;
  }

  unregisterSignal(id: string) {
    if (this._signalsMap.delete(id)) {
      this.refreshSignals();
    }
  }

  clearSignals() {
    this._signalsMap.clear();
    this._signalCounter = 0;
    this.refreshSignals();
  }

  clearQueries() {
    this._queriesMap.clear();
    this.queriesList.set([]);
  }

  clearAll() {
    this.clearSignals();
    this.clearQueries();
    this.clearLogs();
  }

  private refreshSignals() {
    this.signalsList.set(Array.from(this._signalsMap.values()));
  }

  // --- Query Cache Tracking ---
  attachQueryClient(client: QueryClient): () => void {
    const existing = this._queryClients.get(client);
    if (existing) return existing;

    const syncQueries = () => {
      const cache = client.getQueryCache();
      const allQueries = cache.getAll();
      const records: QueryRecord[] = allQueries.map((q) => ({
        hash: q.queryHash,
        key: q.queryKey,
        status: () => q.status(),
        fetchStatus: () => q.fetchStatus(),
        data: () => q.data(),
        error: () => q.error(),
        dataUpdatedAt: () => q.dataUpdatedAt(),
        refetch: () => q.fetch(),
        invalidate: () => q.invalidate()
      }));

      this._queriesMap.clear();
      for (const r of records) {
        this._queriesMap.set(r.hash, r);
      }
      this.queriesList.set(records);
    };

    const unsubscribe = client.getQueryCache().subscribe(() => {
      syncQueries();
    });

    const cleanup = () => {
      unsubscribe();
      this._queryClients.delete(client);
    };

    this._queryClients.set(client, cleanup);
    syncQueries();
    return cleanup;
  }

  detachQueryClient(client: QueryClient): void {
    const cleanup = this._queryClients.get(client);
    if (cleanup) {
      cleanup();
    }
  }

  // --- RPC & SSE Logging ---
  logRpcCall(record: Omit<RpcRecord, "status" | "startTime"> & { status?: RpcRecord["status"] }) {
    const fullRecord: RpcRecord = {
      ...record,
      status: record.status ?? "pending",
      startTime: Date.now(),
      events: []
    };

    this.rpcLogs.update((prev) => [fullRecord, ...prev.slice(0, 99)]);
    return fullRecord.id;
  }

  updateRpcCall(id: string, updates: Partial<RpcRecord>) {
    this.rpcLogs.update((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const duration =
            updates.duration ?? (updates.status ? Date.now() - item.startTime : item.duration);
          return { ...item, ...updates, duration };
        }
        return item;
      })
    );
  }

  logRpcEvent(id: string, data: any) {
    this.rpcLogs.update((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const events = item.events
            ? [...item.events, { timestamp: Date.now(), data }]
            : [{ timestamp: Date.now(), data }];
          return { ...item, events, status: "streaming" as const };
        }
        return item;
      })
    );
  }

  clearLogs() {
    this.rpcLogs.set([]);
  }
}

export const devtoolsHub = new DevToolsHub();
