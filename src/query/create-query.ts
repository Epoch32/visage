import { SuspenseContext } from "@dom/async";
import {
  COMPUTED_BRAND,
  computed,
  effect,
  onCleanup,
  type ReadonlySignal,
  SIGNAL_BRAND,
  signal,
  untrack,
  type WritableSignal
} from "@signals";
import { useContext } from "@signals/context";
import { focusManager } from "./focus-manager";
import type { Query, QueryObserver } from "./query-cache";
import { type QueryClient, useQueryClient } from "./query-client";
import type {
  CreateQueryOptions,
  FetchStatus,
  QueryKey,
  QueryResult,
  QueryStatus,
  RefetchOptions
} from "./types";

export function createQuery<
  TData = unknown,
  TError = any,
  TSelected = TData,
  TQueryKey extends QueryKey = QueryKey
>(
  options:
    | CreateQueryOptions<TData, TError, TSelected, TQueryKey>
    | (() => CreateQueryOptions<TData, TError, TSelected, TQueryKey>),
  client?: QueryClient
): QueryResult<TSelected, TError> {
  const queryClient = useQueryClient(client);
  const resolveOptions = () => (typeof options === "function" ? options() : options);

  const currentQuery = signal<Query<TData, TError> | null>(null);
  const version: WritableSignal<number> = signal(0);
  let activeObserver: QueryObserver<TData, TError> | null = null;
  let intervalTimer: any = null;

  const clearIntervalTimer = () => {
    if (intervalTimer !== null) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
  };

  effect(() => {
    const rawOpts = resolveOptions();
    const defaults = queryClient.getDefaultOptions().queries ?? {};
    const mergedOpts: CreateQueryOptions<TData, TError, TSelected, TQueryKey> = {
      ...defaults,
      ...rawOpts
    };

    const isEnabled =
      typeof mergedOpts.enabled === "function"
        ? mergedOpts.enabled()
        : mergedOpts.enabled !== false;

    const targetQuery = queryClient.queryCache.build<TData, TError>(queryClient, mergedOpts);

    if (untrack(currentQuery) !== targetQuery || !activeObserver) {
      const prevQ = untrack(currentQuery);
      if (prevQ && activeObserver) {
        prevQ.removeObserver(activeObserver);
      }

      const observer: QueryObserver<TData, TError> = {
        options: mergedOpts,
        onQueryUpdate: () => {
          version.update((v) => v + 1);
        }
      };

      targetQuery.addObserver(observer);
      activeObserver = observer;
      currentQuery.set(targetQuery);
    } else if (activeObserver) {
      activeObserver.options = mergedOpts;
    }

    clearIntervalTimer();
    const refetchInterval =
      typeof mergedOpts.refetchInterval === "function"
        ? mergedOpts.refetchInterval()
        : mergedOpts.refetchInterval;

    if (refetchInterval && refetchInterval > 0) {
      intervalTimer = setInterval(() => {
        if (focusManager.isFocused() || mergedOpts.refetchIntervalInBackground) {
          targetQuery.fetch(mergedOpts).catch(() => {});
        }
      }, refetchInterval);
    }

    if (isEnabled) {
      untrack(() => {
        if (targetQuery.isStale(mergedOpts.staleTime) && targetQuery.fetchStatus() === "idle") {
          const fetchPromise = targetQuery.fetch(mergedOpts);
          fetchPromise.catch(() => {});
          const suspense = useContext(SuspenseContext);
          if (suspense) {
            suspense.registerPromise(fetchPromise);
          }
        }
      });
    }
  });

  onCleanup(() => {
    clearIntervalTimer();
    if (currentQuery() && activeObserver) {
      currentQuery()!.removeObserver(activeObserver);
    }
  });

  const data: ReadonlySignal<TSelected | undefined> = computed(() => {
    version(); // subscribe to reactive updates
    const q = currentQuery();
    const rawOpts = resolveOptions();
    const rawData = q?.data();

    if (rawData !== undefined) {
      if (rawOpts.select) {
        return rawOpts.select(rawData);
      }
      return rawData as unknown as TSelected;
    }

    if (rawOpts.placeholderData !== undefined) {
      return (
        typeof rawOpts.placeholderData === "function"
          ? (rawOpts.placeholderData as (prev: any) => any)(undefined)
          : rawOpts.placeholderData
      ) as TSelected;
    }

    return undefined;
  });

  const error: ReadonlySignal<TError | null> = computed(() => {
    version();
    return currentQuery()?.error() ?? null;
  });

  const status: ReadonlySignal<QueryStatus> = computed(() => {
    version();
    return currentQuery()?.status() ?? "pending";
  });

  const fetchStatus: ReadonlySignal<FetchStatus> = computed(() => {
    version();
    return currentQuery()?.fetchStatus() ?? "idle";
  });

  const isLoading: ReadonlySignal<boolean> = computed(() => {
    return status() === "pending" && fetchStatus() === "fetching";
  });

  const isFetching: ReadonlySignal<boolean> = computed(() => {
    return fetchStatus() === "fetching";
  });

  const isSuccess: ReadonlySignal<boolean> = computed(() => {
    return status() === "success";
  });

  const isError: ReadonlySignal<boolean> = computed(() => {
    return status() === "error";
  });

  const isStale: ReadonlySignal<boolean> = computed(() => {
    version();
    const q = currentQuery();
    const rawOpts = resolveOptions();
    return q?.isStale(rawOpts.staleTime) ?? true;
  });

  const dataUpdatedAt: ReadonlySignal<number> = computed(() => {
    version();
    return currentQuery()?.dataUpdatedAt() ?? 0;
  });

  const errorUpdatedAt: ReadonlySignal<number> = computed(() => {
    version();
    return currentQuery()?.errorUpdatedAt() ?? 0;
  });

  const refetch = async (refetchOpts?: RefetchOptions): Promise<TSelected | undefined> => {
    const q = untrack(() => currentQuery());
    if (!q) return undefined;
    const rawOpts = resolveOptions();
    const defaults = queryClient.getDefaultOptions().queries ?? {};
    const mergedOpts = { ...defaults, ...rawOpts };

    const rawResult = await q.fetch(mergedOpts, { cancelRefetch: refetchOpts?.cancelRefetch });
    if (rawOpts.select) {
      return rawOpts.select(rawResult);
    }
    return rawResult as unknown as TSelected;
  };

  const accessor = ((): TSelected | undefined => {
    const q = currentQuery();
    const rawOpts = resolveOptions();

    if ((rawOpts.suspense || status() === "pending") && q?.promise) {
      const suspense = useContext(SuspenseContext);
      if (suspense) {
        suspense.registerPromise(q.promise);
      }
    }

    return data();
  }) as QueryResult<TSelected, TError>;

  Object.defineProperties(accessor, {
    [SIGNAL_BRAND]: { value: true },
    [COMPUTED_BRAND]: { value: true },
    value: { get: () => data() },
    data: { get: () => data },
    error: { get: () => error },
    status: { get: () => status },
    fetchStatus: { get: () => fetchStatus },
    isLoading: { get: () => isLoading },
    isFetching: { get: () => isFetching },
    isSuccess: { get: () => isSuccess },
    isError: { get: () => isError },
    isStale: { get: () => isStale },
    dataUpdatedAt: { get: () => dataUpdatedAt },
    errorUpdatedAt: { get: () => errorUpdatedAt },
    refetch: { value: refetch }
  });

  return accessor;
}

export { createInfiniteQuery } from "./create-infinite-query";
