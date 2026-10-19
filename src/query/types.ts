import type { ReadonlySignal } from "@signals";

export type QueryKey = readonly unknown[];

export interface QueryFunctionContext<TQueryKey extends QueryKey = QueryKey, TPageParam = any> {
  queryKey: TQueryKey;
  signal: AbortSignal;
  pageParam?: TPageParam;
  meta?: Record<string, unknown>;
}

export type QueryFunction<
  TData = unknown,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = any
> = (context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TData> | TData;

export type QueryStatus = "pending" | "success" | "error";
export type FetchStatus = "fetching" | "paused" | "idle";
export type MutationStatus = "idle" | "pending" | "success" | "error";

export type RetryValue = boolean | number | ((failureCount: number, error: any) => boolean);
export type RetryDelayValue = number | ((attemptIndex: number, error: any) => number);

export interface QueryFilters {
  queryKey?: QueryKey;
  exact?: boolean;
  type?: "all" | "active" | "inactive";
  stale?: boolean;
  fetchStatus?: FetchStatus;
  predicate?: (query: any) => boolean;
}

export interface QueryState<TData = unknown, TError = any> {
  data: TData | undefined;
  error: TError | null;
  status: QueryStatus;
  fetchStatus: FetchStatus;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  failureCount: number;
  isInvalidated: boolean;
}

export interface QueryOptions<
  TData = unknown,
  _TError = any,
  TQueryKey extends QueryKey = QueryKey
> {
  queryKey: TQueryKey;
  queryFn?: QueryFunction<TData, TQueryKey>;
  enabled?: boolean | (() => boolean);
  staleTime?: number;
  gcTime?: number;
  retry?: RetryValue;
  retryDelay?: RetryDelayValue;
  refetchInterval?: number | false | (() => number | false);
  refetchIntervalInBackground?: boolean;
  refetchOnWindowFocus?: boolean | "always";
  refetchOnReconnect?: boolean | "always";
  initialData?: TData | (() => TData);
  initialDataUpdatedAt?: number | (() => number);
  placeholderData?: TData | ((previousData: TData | undefined) => TData);
  meta?: Record<string, unknown>;
}

export interface CreateQueryOptions<
  TData = unknown,
  TError = any,
  TSelected = TData,
  TQueryKey extends QueryKey = QueryKey
> extends QueryOptions<TData, TError, TQueryKey> {
  select?: (data: TData) => TSelected;
  suspense?: boolean;
}

export interface RefetchOptions {
  throwOnError?: boolean;
  cancelRefetch?: boolean;
}

export interface QueryResult<TData = unknown, TError = any> {
  data: ReadonlySignal<TData | undefined>;
  error: ReadonlySignal<TError | null>;
  status: ReadonlySignal<QueryStatus>;
  fetchStatus: ReadonlySignal<FetchStatus>;
  isLoading: ReadonlySignal<boolean>;
  isFetching: ReadonlySignal<boolean>;
  isSuccess: ReadonlySignal<boolean>;
  isError: ReadonlySignal<boolean>;
  isStale: ReadonlySignal<boolean>;
  dataUpdatedAt: ReadonlySignal<number>;
  errorUpdatedAt: ReadonlySignal<number>;
  refetch: (options?: RefetchOptions) => Promise<TData | undefined>;
  (): TData | undefined;
}

export type MutationFunction<TData = unknown, TVariables = void> = (
  variables: TVariables
) => Promise<TData>;

export interface MutationOptions<
  TData = unknown,
  TError = any,
  TVariables = void,
  TContext = unknown
> {
  mutationKey?: QueryKey;
  mutationFn: MutationFunction<TData, TVariables>;
  onMutate?: (variables: TVariables) => Promise<TContext | void> | TContext | void;
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext | undefined
  ) => Promise<void> | void;
  onError?: (
    error: TError,
    variables: TVariables,
    context: TContext | undefined
  ) => Promise<void> | void;
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined
  ) => Promise<void> | void;
  retry?: RetryValue;
  retryDelay?: RetryDelayValue;
  meta?: Record<string, unknown>;
}

export interface MutateOptions<
  TData = unknown,
  TError = any,
  TVariables = void,
  TContext = unknown
> {
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined
  ) => void;
}

export interface MutationResult<
  TData = unknown,
  TError = any,
  TVariables = void,
  TContext = unknown
> {
  mutate: (
    variables: TVariables,
    options?: MutateOptions<TData, TError, TVariables, TContext>
  ) => void;
  mutateAsync: (
    variables: TVariables,
    options?: MutateOptions<TData, TError, TVariables, TContext>
  ) => Promise<TData>;
  data: ReadonlySignal<TData | undefined>;
  error: ReadonlySignal<TError | null>;
  status: ReadonlySignal<MutationStatus>;
  isIdle: ReadonlySignal<boolean>;
  isPending: ReadonlySignal<boolean>;
  isLoading: ReadonlySignal<boolean>;
  isSuccess: ReadonlySignal<boolean>;
  isError: ReadonlySignal<boolean>;
  reset: () => void;
  variables: ReadonlySignal<TVariables | undefined>;
  submittedAt: ReadonlySignal<number>;
  (): TData | undefined;
}

export interface InfiniteData<TData = unknown, TPageParam = unknown> {
  pages: TData[];
  pageParams: TPageParam[];
}

export interface InfiniteQueryOptions<
  TData = unknown,
  TError = any,
  TPageParam = unknown,
  TSelected = InfiniteData<TData, TPageParam>,
  TQueryKey extends QueryKey = QueryKey
> extends Omit<QueryOptions<InfiniteData<TData, TPageParam>, TError, TQueryKey>, "queryFn"> {
  queryFn?: (context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TData> | TData;
  initialPageParam: TPageParam;
  getNextPageParam: (
    lastPage: TData,
    allPages: TData[],
    lastPageParam: TPageParam,
    allPageParams: TPageParam[]
  ) => TPageParam | undefined | null;
  getPreviousPageParam?: (
    firstPage: TData,
    allPages: TData[],
    firstPageParam: TPageParam,
    allPageParams: TPageParam[]
  ) => TPageParam | undefined | null;
  maxPages?: number;
  select?: (data: InfiniteData<TData, TPageParam>) => TSelected;
  suspense?: boolean;
}

export interface InfiniteQueryResult<TData = unknown, TError = any, TPageParam = unknown>
  extends Omit<QueryResult<InfiniteData<TData, TPageParam>, TError>, "refetch"> {
  fetchNextPage: () => Promise<InfiniteData<TData, TPageParam> | undefined>;
  fetchPreviousPage: () => Promise<InfiniteData<TData, TPageParam> | undefined>;
  hasNextPage: ReadonlySignal<boolean>;
  hasPreviousPage: ReadonlySignal<boolean>;
  isFetchingNextPage: ReadonlySignal<boolean>;
  isFetchingPreviousPage: ReadonlySignal<boolean>;
  refetch: (options?: RefetchOptions) => Promise<InfiniteData<TData, TPageParam> | undefined>;
}

export interface DefaultOptions {
  queries?: Partial<QueryOptions<any, any, any>>;
  mutations?: Partial<MutationOptions<any, any, any, any>>;
}
