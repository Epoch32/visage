import { computed, type ReadonlySignal, signal, type WritableSignal } from "../signals";
import type { MutateOptions, MutationOptions, MutationStatus } from "./types";

export class Mutation<TData = unknown, TError = any, TVariables = void, TContext = unknown> {
  readonly options: MutationOptions<TData, TError, TVariables, TContext>;

  readonly data: WritableSignal<TData | undefined>;
  readonly error: WritableSignal<TError | null>;
  readonly status: WritableSignal<MutationStatus>;
  readonly submittedAt: WritableSignal<number>;
  readonly variables: WritableSignal<TVariables | undefined>;

  readonly isIdle: ReadonlySignal<boolean>;
  readonly isPending: ReadonlySignal<boolean>;
  readonly isLoading: ReadonlySignal<boolean>;
  readonly isSuccess: ReadonlySignal<boolean>;
  readonly isError: ReadonlySignal<boolean>;

  constructor(options: MutationOptions<TData, TError, TVariables, TContext>) {
    this.options = options;
    this.data = signal<TData | undefined>(undefined);
    this.error = signal<TError | null>(null);
    this.status = signal<MutationStatus>("idle");
    this.submittedAt = signal<number>(0);
    this.variables = signal<TVariables | undefined>(undefined);

    this.isIdle = computed(() => this.status() === "idle");
    this.isPending = computed(() => this.status() === "pending");
    this.isLoading = this.isPending;
    this.isSuccess = computed(() => this.status() === "success");
    this.isError = computed(() => this.status() === "error");
  }

  async execute(
    variables: TVariables,
    mutateOptions?: MutateOptions<TData, TError, TVariables, TContext>
  ): Promise<TData> {
    this.status.set("pending");
    this.error.set(null);
    this.variables.set(variables);
    this.submittedAt.set(Date.now());

    let context: TContext | undefined;

    try {
      if (this.options.onMutate) {
        const res = await this.options.onMutate(variables);
        if (res !== undefined) {
          context = res as TContext;
        }
      }

      const result = await this.options.mutationFn(variables);

      this.data.set(result);
      this.status.set("success");

      try {
        await this.options.onSuccess?.(result, variables, context);
      } catch (err) {
        console.error("Error in mutation onSuccess:", err);
      }
      try {
        mutateOptions?.onSuccess?.(result, variables, context);
      } catch (err) {
        console.error("Error in mutateOptions onSuccess:", err);
      }

      try {
        await this.options.onSettled?.(result, null, variables, context);
      } catch (err) {
        console.error("Error in mutation onSettled:", err);
      }
      try {
        mutateOptions?.onSettled?.(result, null, variables, context);
      } catch (err) {
        console.error("Error in mutateOptions onSettled:", err);
      }

      return result;
    } catch (err: any) {
      this.error.set(err);
      this.status.set("error");

      try {
        await this.options.onError?.(err, variables, context);
      } catch (e) {
        console.error("Error in mutation onError:", e);
      }
      try {
        mutateOptions?.onError?.(err, variables, context);
      } catch (e) {
        console.error("Error in mutateOptions onError:", e);
      }

      try {
        await this.options.onSettled?.(undefined, err, variables, context);
      } catch (e) {
        console.error("Error in mutation onSettled:", e);
      }
      try {
        mutateOptions?.onSettled?.(undefined, err, variables, context);
      } catch (e) {
        console.error("Error in mutateOptions onSettled:", e);
      }

      throw err;
    }
  }

  reset() {
    this.data.set(undefined);
    this.error.set(null);
    this.status.set("idle");
    this.submittedAt.set(0);
    this.variables.set(undefined);
  }
}

export class MutationCache {
  mutations = new Set<Mutation<any, any, any, any>>();

  build<TData, TError, TVariables, TContext>(
    options: MutationOptions<TData, TError, TVariables, TContext>
  ): Mutation<TData, TError, TVariables, TContext> {
    const mutation = new Mutation(options);
    this.mutations.add(mutation);
    return mutation;
  }

  remove(mutation: Mutation<any, any, any, any>) {
    this.mutations.delete(mutation);
  }

  clear() {
    this.mutations.clear();
  }
}
