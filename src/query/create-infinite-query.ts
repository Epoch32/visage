import { COMPUTED_BRAND, computed, SIGNAL_BRAND, signal, type WritableSignal } from "@signals";
import { createQuery } from "./create-query";
import { type QueryClient, useQueryClient } from "./query-client";
import type { InfiniteData, InfiniteQueryOptions, InfiniteQueryResult, QueryKey } from "./types";

export function createInfiniteQuery<
  TData = unknown,
  TError = any,
  TPageParam = unknown,
  TSelected = InfiniteData<TData, TPageParam>,
  TQueryKey extends QueryKey = QueryKey
>(
  options:
    | InfiniteQueryOptions<TData, TError, TPageParam, TSelected, TQueryKey>
    | (() => InfiniteQueryOptions<TData, TError, TPageParam, TSelected, TQueryKey>),
  client?: QueryClient
): InfiniteQueryResult<TData, TError, TPageParam> {
  const queryClient = useQueryClient(client);
  const resolveOptions = () => (typeof options === "function" ? options() : options);

  const isFetchingNextPage: WritableSignal<boolean> = signal(false);
  const isFetchingPreviousPage: WritableSignal<boolean> = signal(false);

  const baseQuery = createQuery<
    InfiniteData<TData, TPageParam>,
    TError,
    InfiniteData<TData, TPageParam>,
    TQueryKey
  >(() => {
    const rawOpts = resolveOptions();
    return {
      ...rawOpts,
      queryFn: async (ctx) => {
        const pageParam = ctx.pageParam ?? rawOpts.initialPageParam;
        const page = await (rawOpts.queryFn as any)({
          ...ctx,
          pageParam
        });
        return {
          pages: [page],
          pageParams: [pageParam]
        };
      },
      select: undefined
    };
  }, queryClient);

  const hasNextPage = computed(() => {
    const current = baseQuery.data();
    if (!current || current.pages.length === 0) return false;
    const rawOpts = resolveOptions();
    const lastPage = current.pages[current.pages.length - 1];
    const lastParam = current.pageParams[current.pageParams.length - 1];
    const nextParam = rawOpts.getNextPageParam(
      lastPage!,
      current.pages,
      lastParam!,
      current.pageParams
    );
    return nextParam !== undefined && nextParam !== null;
  });

  const hasPreviousPage = computed(() => {
    const current = baseQuery.data();
    if (!current || current.pages.length === 0) return false;
    const rawOpts = resolveOptions();
    if (!rawOpts.getPreviousPageParam) return false;
    const firstPage = current.pages[0];
    const firstParam = current.pageParams[0];
    const prevParam = rawOpts.getPreviousPageParam(
      firstPage!,
      current.pages,
      firstParam!,
      current.pageParams
    );
    return prevParam !== undefined && prevParam !== null;
  });

  const fetchNextPage = async (): Promise<InfiniteData<TData, TPageParam> | undefined> => {
    const current = baseQuery.data();
    if (!current || current.pages.length === 0) return undefined;
    const rawOpts = resolveOptions();
    const lastPage = current.pages[current.pages.length - 1];
    const lastParam = current.pageParams[current.pageParams.length - 1];
    const nextParam = rawOpts.getNextPageParam(
      lastPage!,
      current.pages,
      lastParam!,
      current.pageParams
    );

    if (nextParam === undefined || nextParam === null) {
      return current;
    }

    isFetchingNextPage.set(true);
    try {
      const newPage = await (rawOpts.queryFn as any)({
        queryKey: rawOpts.queryKey,
        signal: new AbortController().signal,
        pageParam: nextParam,
        meta: rawOpts.meta
      });

      const nextData: InfiniteData<TData, TPageParam> = {
        pages: [...current.pages, newPage],
        pageParams: [...current.pageParams, nextParam]
      };

      queryClient.setQueryData(rawOpts.queryKey, nextData);
      return nextData;
    } finally {
      isFetchingNextPage.set(false);
    }
  };

  const fetchPreviousPage = async (): Promise<InfiniteData<TData, TPageParam> | undefined> => {
    const current = baseQuery.data();
    if (!current || current.pages.length === 0) return undefined;
    const rawOpts = resolveOptions();
    if (!rawOpts.getPreviousPageParam) return current;

    const firstPage = current.pages[0];
    const firstParam = current.pageParams[0];
    const prevParam = rawOpts.getPreviousPageParam(
      firstPage!,
      current.pages,
      firstParam!,
      current.pageParams
    );

    if (prevParam === undefined || prevParam === null) {
      return current;
    }

    isFetchingPreviousPage.set(true);
    try {
      const newPage = await (rawOpts.queryFn as any)({
        queryKey: rawOpts.queryKey,
        signal: new AbortController().signal,
        pageParam: prevParam,
        meta: rawOpts.meta
      });

      const nextData: InfiniteData<TData, TPageParam> = {
        pages: [newPage, ...current.pages],
        pageParams: [prevParam, ...current.pageParams]
      };

      queryClient.setQueryData(rawOpts.queryKey, nextData);
      return nextData;
    } finally {
      isFetchingPreviousPage.set(false);
    }
  };

  const accessor = ((): InfiniteData<TData, TPageParam> | undefined => {
    return baseQuery();
  }) as unknown as InfiniteQueryResult<TData, TError, TPageParam>;

  Object.defineProperties(accessor, {
    [SIGNAL_BRAND]: { value: true },
    [COMPUTED_BRAND]: { value: true },
    value: { get: () => baseQuery.data() },
    data: { get: () => baseQuery.data },
    error: { get: () => baseQuery.error },
    status: { get: () => baseQuery.status },
    fetchStatus: { get: () => baseQuery.fetchStatus },
    isLoading: { get: () => baseQuery.isLoading },
    isFetching: { get: () => baseQuery.isFetching },
    isSuccess: { get: () => baseQuery.isSuccess },
    isError: { get: () => baseQuery.isError },
    isStale: { get: () => baseQuery.isStale },
    dataUpdatedAt: { get: () => baseQuery.dataUpdatedAt },
    errorUpdatedAt: { get: () => baseQuery.errorUpdatedAt },
    refetch: { value: baseQuery.refetch },
    fetchNextPage: { value: fetchNextPage },
    fetchPreviousPage: { value: fetchPreviousPage },
    hasNextPage: { get: () => hasNextPage },
    hasPreviousPage: { get: () => hasPreviousPage },
    isFetchingNextPage: { get: () => isFetchingNextPage },
    isFetchingPreviousPage: { get: () => isFetchingPreviousPage }
  });

  return accessor;
}
