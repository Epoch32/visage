import { signal, type WritableSignal } from "../signals";
import type { QueryClient } from "./query-client";
import type {
  FetchStatus,
  QueryFilters,
  QueryKey,
  QueryOptions,
  QueryState,
  QueryStatus,
  RetryDelayValue,
  RetryValue
} from "./types";
import { hashKey, matchQuery, sleep } from "./utils";

export interface QueryObserver<TData = any, TError = any> {
  onQueryUpdate(): void;
  options: QueryOptions<TData, TError, any>;
}

function shouldRetry(failureCount: number, error: any, retry: RetryValue | undefined): boolean {
  if (retry === false) return false;
  if (retry === true) return true;
  if (typeof retry === "number") return failureCount <= retry;
  if (typeof retry === "function") return retry(failureCount, error);
  // Default: 3 retries
  return failureCount < 3;
}

function getRetryDelay(
  attempt: number,
  error: any,
  retryDelay: RetryDelayValue | undefined
): number {
  if (typeof retryDelay === "function") return retryDelay(attempt, error);
  if (typeof retryDelay === "number") return retryDelay;
  return Math.min(1000 * 2 ** attempt, 30000);
}

export class Query<TData = unknown, TError = any> {
  readonly queryKey: QueryKey;
  readonly queryHash: string;
  cache: QueryCache;

  readonly data: WritableSignal<TData | undefined>;
  readonly error: WritableSignal<TError | null>;
  readonly status: WritableSignal<QueryStatus>;
  readonly fetchStatus: WritableSignal<FetchStatus>;
  readonly dataUpdatedAt: WritableSignal<number>;
  readonly errorUpdatedAt: WritableSignal<number>;
  readonly failureCount: WritableSignal<number>;
  readonly isInvalidated: WritableSignal<boolean>;

  observers = new Set<QueryObserver<TData, TError>>();
  private _gcTimeout: any = null;
  private _abortController: AbortController | null = null;
  promise: Promise<TData> | null = null;
  defaultGcTime = 5 * 60 * 1000; // 5 minutes

  constructor(options: {
    queryKey: QueryKey;
    queryHash: string;
    cache: QueryCache;
    initialData?: TData | (() => TData);
    initialDataUpdatedAt?: number | (() => number);
  }) {
    this.queryKey = options.queryKey;
    this.queryHash = options.queryHash;
    this.cache = options.cache;

    const initialData =
      typeof options.initialData === "function"
        ? (options.initialData as () => TData)()
        : options.initialData;

    const initialUpdatedAt =
      initialData !== undefined
        ? typeof options.initialDataUpdatedAt === "function"
          ? options.initialDataUpdatedAt()
          : (options.initialDataUpdatedAt ?? Date.now())
        : 0;

    this.data = signal<TData | undefined>(initialData);
    this.error = signal<TError | null>(null);
    this.status = signal<QueryStatus>(initialData !== undefined ? "success" : "pending");
    this.fetchStatus = signal<FetchStatus>("idle");
    this.dataUpdatedAt = signal<number>(initialUpdatedAt);
    this.errorUpdatedAt = signal<number>(0);
    this.failureCount = signal<number>(0);
    this.isInvalidated = signal<boolean>(false);
  }

  get state(): QueryState<TData, TError> {
    return {
      data: this.data(),
      error: this.error(),
      status: this.status(),
      fetchStatus: this.fetchStatus(),
      dataUpdatedAt: this.dataUpdatedAt(),
      errorUpdatedAt: this.errorUpdatedAt(),
      failureCount: this.failureCount(),
      isInvalidated: this.isInvalidated()
    };
  }

  isStale(staleTime = 0): boolean {
    if (this.isInvalidated()) return true;
    if (this.dataUpdatedAt() === 0) return true;
    if (staleTime === Number.POSITIVE_INFINITY) return false;
    return Date.now() - this.dataUpdatedAt() >= staleTime;
  }

  addObserver(observer: QueryObserver<TData, TError>) {
    this.observers.add(observer);
    this.clearGcTimeout();
  }

  removeObserver(observer: QueryObserver<TData, TError>) {
    this.observers.delete(observer);
    if (this.observers.size === 0) {
      this.scheduleGc(observer.options.gcTime);
    }
  }

  scheduleGc(gcTime?: number) {
    this.clearGcTimeout();
    const duration = gcTime !== undefined ? gcTime : this.defaultGcTime;
    if (duration === Number.POSITIVE_INFINITY) return;
    if (duration <= 0) {
      this.cache.remove(this);
      return;
    }
    this._gcTimeout = setTimeout(() => {
      if (this.observers.size === 0) {
        this.cache.remove(this);
      }
    }, duration);
  }

  clearGcTimeout() {
    if (this._gcTimeout !== null) {
      clearTimeout(this._gcTimeout);
      this._gcTimeout = null;
    }
  }

  setData(
    updater: TData | ((prev: TData | undefined) => TData),
    options?: { updatedAt?: number }
  ): TData {
    const prev = this.data();
    const nextData = typeof updater === "function" ? (updater as any)(prev) : updater;

    this.data.set(nextData);
    this.error.set(null);
    this.status.set("success");
    this.isInvalidated.set(false);
    this.dataUpdatedAt.set(options?.updatedAt ?? Date.now());

    this.notifyObservers();
    this.cache.notify({ type: "updated", query: this });
    return nextData;
  }

  invalidate() {
    this.isInvalidated.set(true);
    if (this.observers.size > 0) {
      for (const observer of this.observers) {
        observer.onQueryUpdate();
      }
    }
  }

  cancel() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    this.fetchStatus.set("idle");
    this.promise = null;
  }

  reset() {
    this.cancel();
    this.data.set(undefined);
    this.error.set(null);
    this.status.set("pending");
    this.fetchStatus.set("idle");
    this.dataUpdatedAt.set(0);
    this.errorUpdatedAt.set(0);
    this.failureCount.set(0);
    this.isInvalidated.set(false);
    this.notifyObservers();
  }

  async fetch(
    options?: Partial<QueryOptions<TData, TError, any>>,
    fetchOptions?: { cancelRefetch?: boolean }
  ): Promise<TData> {
    if (this.promise && !fetchOptions?.cancelRefetch) {
      return this.promise;
    }

    if (this._abortController && fetchOptions?.cancelRefetch) {
      this.cancel();
    }

    const controller = new AbortController();
    this._abortController = controller;
    this.fetchStatus.set("fetching");

    const queryFn = options?.queryFn;
    if (!queryFn) {
      this.fetchStatus.set("idle");
      throw new Error(`Missing queryFn for queryKey: ${JSON.stringify(this.queryKey)}`);
    }

    const execFetch = async (): Promise<TData> => {
      let attempt = 0;

      while (true) {
        if (controller.signal.aborted) {
          this.fetchStatus.set("idle");
          this.promise = null;
          throw new Error("Query was cancelled");
        }

        try {
          const result = await queryFn({
            queryKey: this.queryKey,
            signal: controller.signal,
            meta: options?.meta
          });

          if (controller.signal.aborted) {
            throw new Error("Query was cancelled");
          }

          this.setData(result);
          this.failureCount.set(0);
          this.fetchStatus.set("idle");
          this.promise = null;
          return result;
        } catch (err: any) {
          if (controller.signal.aborted) {
            this.fetchStatus.set("idle");
            this.promise = null;
            throw err;
          }

          attempt++;
          this.failureCount.set(attempt);

          const canRetry = shouldRetry(attempt, err, options?.retry);
          if (canRetry) {
            const delay = getRetryDelay(attempt, err, options?.retryDelay);
            if (delay > 0) {
              await sleep(delay);
            }
            continue;
          }

          this.error.set(err);
          this.errorUpdatedAt.set(Date.now());
          this.status.set("error");
          this.fetchStatus.set("idle");
          this.promise = null;
          this.notifyObservers();
          throw err;
        }
      }
    };

    this.promise = execFetch();
    return this.promise;
  }

  private notifyObservers() {
    for (const observer of this.observers) {
      observer.onQueryUpdate();
    }
  }

  destroy() {
    this.cancel();
    this.clearGcTimeout();
    this.observers.clear();
  }
}

export class QueryCache {
  queries = new Map<string, Query<any, any>>();
  private _subscribers = new Set<(event: { type: string; query?: Query<any, any> }) => void>();

  subscribe(listener: (event: { type: string; query?: Query<any, any> }) => void): () => void {
    this._subscribers.add(listener);
    return () => this._subscribers.delete(listener);
  }

  notify(event: { type: string; query?: Query<any, any> }) {
    for (const sub of this._subscribers) {
      sub(event);
    }
  }

  getAll(): Query<any, any>[] {
    return Array.from(this.queries.values());
  }

  build<TData, TError>(
    _client: QueryClient,
    options: QueryOptions<TData, TError, any>
  ): Query<TData, TError> {
    const queryHash = hashKey(options.queryKey);
    let query = this.queries.get(queryHash);

    if (!query) {
      query = new Query({
        queryKey: options.queryKey,
        queryHash,
        cache: this,
        initialData: options.initialData,
        initialDataUpdatedAt: options.initialDataUpdatedAt
      });
      this.add(query);
    }

    return query;
  }

  get<TData = unknown, TError = any>(queryHash: string): Query<TData, TError> | undefined {
    return this.queries.get(queryHash);
  }

  add(query: Query<any, any>) {
    this.queries.set(query.queryHash, query);
    this.notify({ type: "added", query });
  }

  remove(query: Query<any, any>) {
    const existing = this.queries.get(query.queryHash);
    if (existing) {
      existing.destroy();
      this.queries.delete(query.queryHash);
      this.notify({ type: "removed", query: existing });
    }
  }

  find<TData = unknown, TError = any>(filters: QueryFilters): Query<TData, TError> | undefined {
    return this.findAll<TData, TError>(filters)[0];
  }

  findAll<TData = unknown, TError = any>(filters?: QueryFilters): Query<TData, TError>[] {
    const results: Query<TData, TError>[] = [];
    for (const query of this.queries.values()) {
      if (matchQuery(filters, query)) {
        results.push(query);
      }
    }
    return results;
  }

  clear() {
    for (const query of this.queries.values()) {
      query.destroy();
    }
    this.queries.clear();
    this.notify({ type: "cleared" });
  }
}
