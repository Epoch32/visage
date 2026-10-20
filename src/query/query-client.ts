import type { Child } from "@dom/render";
import { type Context, createContext, useContext } from "@signals/context";
import { focusManager } from "./focus-manager";
import { MutationCache } from "./mutation-cache";
import { onlineManager } from "./online-manager";
import { QueryCache } from "./query-cache";
import type { DefaultOptions, QueryFilters, QueryKey, QueryOptions, QueryState } from "./types";
import { hashKey } from "./utils";

export interface QueryClientConfig {
  defaultOptions?: DefaultOptions;
  queryCache?: QueryCache;
  mutationCache?: MutationCache;
}

export class QueryClient {
  queryCache: QueryCache;
  mutationCache: MutationCache;
  defaultOptions: DefaultOptions;

  private _unsubscribeFocus?: () => void;
  private _unsubscribeOnline?: () => void;
  private _unsubscribeDevTools?: () => void;
  private _isMounted = false;

  constructor(config: QueryClientConfig = {}) {
    this.defaultOptions = config.defaultOptions ?? {};
    this.queryCache = config.queryCache ?? new QueryCache();
    this.mutationCache = config.mutationCache ?? new MutationCache();
    this.mount();

    if (typeof window !== "undefined" && (window as any).__VISAGE_DEVTOOLS__) {
      this._unsubscribeDevTools = (window as any).__VISAGE_DEVTOOLS__.attachQueryClient(this);
    }
  }

  mount() {
    if (this._isMounted) return;
    this._isMounted = true;

    this._unsubscribeFocus = focusManager.subscribe((focused) => {
      if (focused) {
        this.onWindowFocus();
      }
    });

    this._unsubscribeOnline = onlineManager.subscribe((online) => {
      if (online) {
        this.onOnline();
      }
    });
  }

  unmount() {
    this._isMounted = false;
    this._unsubscribeFocus?.();
    this._unsubscribeOnline?.();
    this._unsubscribeDevTools?.();
  }

  private onWindowFocus() {
    const activeQueries = this.queryCache.findAll({ type: "active" });
    for (const query of activeQueries) {
      const observer = Array.from(query.observers)[0];
      const options = observer?.options ?? this.defaultOptions.queries ?? {};
      const refetchOnFocus = options.refetchOnWindowFocus ?? true;

      if (refetchOnFocus === "always" || (refetchOnFocus && query.isStale(options.staleTime))) {
        query.fetch(options).catch(() => {});
      }
    }
  }

  private onOnline() {
    const activeQueries = this.queryCache.findAll({ type: "active" });
    for (const query of activeQueries) {
      const observer = Array.from(query.observers)[0];
      const options = observer?.options ?? this.defaultOptions.queries ?? {};
      const refetchOnReconnect = options.refetchOnReconnect ?? true;

      if (
        refetchOnReconnect === "always" ||
        (refetchOnReconnect && query.isStale(options.staleTime))
      ) {
        query.fetch(options).catch(() => {});
      }
    }
  }

  getDefaultOptions(): DefaultOptions {
    return this.defaultOptions;
  }

  setDefaultOptions(options: DefaultOptions) {
    this.defaultOptions = options;
  }

  getQueryCache(): QueryCache {
    return this.queryCache;
  }

  getMutationCache(): MutationCache {
    return this.mutationCache;
  }

  getQueryData<TData = unknown>(queryKey: QueryKey): TData | undefined {
    const queryHash = hashKey(queryKey);
    const query = this.queryCache.get<TData>(queryHash);
    return query?.data();
  }

  setQueryData<TData = unknown>(
    queryKey: QueryKey,
    updater: TData | ((prev: TData | undefined) => TData),
    options?: { updatedAt?: number }
  ): TData {
    const query = this.queryCache.build<TData, any>(this, {
      queryKey,
      ...this.defaultOptions.queries
    });
    return query.setData(updater, options);
  }

  getQueryState<TData = unknown, TError = any>(
    queryKey: QueryKey
  ): QueryState<TData, TError> | undefined {
    const queryHash = hashKey(queryKey);
    const query = this.queryCache.get<TData, TError>(queryHash);
    return query?.state;
  }

  async fetchQuery<TData = unknown, TError = any>(
    options: QueryOptions<TData, TError, any>
  ): Promise<TData> {
    const mergedOptions: QueryOptions<TData, TError, any> = {
      ...this.defaultOptions.queries,
      ...options
    };

    const query = this.queryCache.build<TData, TError>(this, mergedOptions);

    if (!query.isStale(mergedOptions.staleTime) && query.data() !== undefined) {
      return query.data() as TData;
    }

    return query.fetch(mergedOptions);
  }

  async prefetchQuery<TData = unknown, TError = any>(
    options: QueryOptions<TData, TError, any>
  ): Promise<void> {
    try {
      await this.fetchQuery(options);
    } catch {
      // Prefetch errors are swallowed
    }
  }

  async invalidateQueries(filters?: QueryFilters): Promise<void> {
    const queries = this.queryCache.findAll(filters);
    const promises: Promise<any>[] = [];

    for (const query of queries) {
      query.invalidate();
      if (query.observers.size > 0) {
        const observer = Array.from(query.observers)[0];
        const options = observer?.options ?? this.defaultOptions.queries ?? {};
        promises.push(query.fetch(options).catch(() => {}));
      }
    }

    await Promise.all(promises);
  }

  async refetchQueries(filters?: QueryFilters): Promise<void> {
    const queries = this.queryCache.findAll(filters);
    const promises: Promise<any>[] = [];

    for (const query of queries) {
      if (query.observers.size > 0) {
        const observer = Array.from(query.observers)[0];
        const options = observer?.options ?? this.defaultOptions.queries ?? {};
        promises.push(query.fetch(options, { cancelRefetch: true }).catch(() => {}));
      }
    }

    await Promise.all(promises);
  }

  cancelQueries(filters?: QueryFilters): void {
    const queries = this.queryCache.findAll(filters);
    for (const query of queries) {
      query.cancel();
    }
  }

  removeQueries(filters?: QueryFilters): void {
    const queries = this.queryCache.findAll(filters);
    for (const query of queries) {
      this.queryCache.remove(query);
    }
  }

  async resetQueries(filters?: QueryFilters): Promise<void> {
    const queries = this.queryCache.findAll(filters);
    const promises: Promise<any>[] = [];

    for (const query of queries) {
      query.reset();
      if (query.observers.size > 0) {
        const observer = Array.from(query.observers)[0];
        const options = observer?.options ?? this.defaultOptions.queries ?? {};
        promises.push(query.fetch(options).catch(() => {}));
      }
    }

    await Promise.all(promises);
  }

  clear() {
    this.queryCache.clear();
    this.mutationCache.clear();
  }
}

export const QueryClientContext: Context<QueryClient | null> = createContext<QueryClient | null>(
  null
);

let defaultGlobalClient: QueryClient | null = null;

function getDefaultGlobalClient(): QueryClient {
  if (!defaultGlobalClient) {
    defaultGlobalClient = new QueryClient();
  }
  return defaultGlobalClient;
}

export function QueryClientProvider(props: { client: QueryClient; children: Child }): any {
  return QueryClientContext.Provider({
    value: props.client,
    children: props.children
  });
}

export function useQueryClient(client?: QueryClient): QueryClient {
  if (client) return client;
  const ctxClient = useContext(QueryClientContext);
  return ctxClient ?? getDefaultGlobalClient();
}
