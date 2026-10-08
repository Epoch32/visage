import { COMPUTED_BRAND, SIGNAL_BRAND } from "../signals";
import type { Mutation } from "./mutation-cache";
import { type QueryClient, useQueryClient } from "./query-client";
import type { MutateOptions, MutationOptions, MutationResult } from "./types";

export function createMutation<
  TData = unknown,
  TError = any,
  TVariables = void,
  TContext = unknown
>(
  options:
    | MutationOptions<TData, TError, TVariables, TContext>
    | (() => MutationOptions<TData, TError, TVariables, TContext>),
  client?: QueryClient
): MutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient(client);
  const resolveOptions = () => (typeof options === "function" ? options() : options);

  const defaults = queryClient.getDefaultOptions().mutations ?? {};
  const mergedOpts = { ...defaults, ...resolveOptions() };

  const mutation: Mutation<TData, TError, TVariables, TContext> =
    queryClient.mutationCache.build(mergedOpts);

  const mutate = (
    variables: TVariables,
    mutateOptions?: MutateOptions<TData, TError, TVariables, TContext>
  ): void => {
    mutation.execute(variables, mutateOptions).catch(() => {});
  };

  const mutateAsync = (
    variables: TVariables,
    mutateOptions?: MutateOptions<TData, TError, TVariables, TContext>
  ): Promise<TData> => {
    return mutation.execute(variables, mutateOptions);
  };

  const accessor = ((): TData | undefined => {
    return mutation.data();
  }) as MutationResult<TData, TError, TVariables, TContext>;

  Object.defineProperties(accessor, {
    [SIGNAL_BRAND]: { value: true },
    [COMPUTED_BRAND]: { value: true },
    value: { get: () => mutation.data() },
    mutate: { value: mutate },
    mutateAsync: { value: mutateAsync },
    data: { get: () => mutation.data },
    error: { get: () => mutation.error },
    status: { get: () => mutation.status },
    isIdle: { get: () => mutation.isIdle },
    isPending: { get: () => mutation.isPending },
    isLoading: { get: () => mutation.isLoading },
    isSuccess: { get: () => mutation.isSuccess },
    isError: { get: () => mutation.isError },
    reset: { value: () => mutation.reset() },
    variables: { get: () => mutation.variables },
    submittedAt: { get: () => mutation.submittedAt }
  });

  return accessor;
}
