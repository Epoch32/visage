/**
 * Visage API & File-Based RPC Routing System Types
 */
import type { SchemaLike, StandardSchemaV1 } from "@form/schema";
import type { CacheControlDirectives } from "@http";
import type { RPCErrorCode } from "@rpc/types";

export type { RPCErrorCode };

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";

export interface MiddlewarePragma {
  /**
   * Whether this middleware cascades to child subdirectories.
   * Default: true
   */
  cascade?: boolean;

  /**
   * Route name / path globs to include.
   * Default: ["*"]
   */
  match?: string[];

  /**
   * Route name / path globs to exclude.
   * Default: []
   */
  exclude?: string[];

  /**
   * Execution priority within the same directory (higher runs earlier).
   * Default: 0
   */
  priority?: number;
}

export type NextFn<TCtxIn = any, TCtxOut = any> = (
  enriched?: Partial<TCtxOut>
) => Promise<Response | (TCtxIn & TCtxOut)>;

export interface MiddlewareContext<TCtx = any> {
  req: Request;
  ctx: TCtx;
  url: URL;
  params: Record<string, string>;
  next: NextFn<TCtx, any>;
}

export type MiddlewareFn<TCtxIn = any, _TCtxOut = any> = (
  args: MiddlewareContext<TCtxIn>
) => Promise<Response | void | any>;

export interface MiddlewareDefinition {
  fn: MiddlewareFn;
  pragma: MiddlewarePragma;
  filePath?: string;
  directory?: string;
}

export type ProcedureType = "query" | "mutation" | "subscription";

export interface ProcedureOptions<TInput = any, TOutput = any, TCtx = any> {
  input?: SchemaLike<TInput> | StandardSchemaV1<TInput>;
  output?: SchemaLike<TOutput> | StandardSchemaV1<TOutput>;
  cache?: CacheControlDirectives | string;
  resolve: (args: {
    input: TInput;
    ctx: TCtx;
    req: Request;
    params: Record<string, string>;
  }) => Promise<TOutput> | TOutput | AsyncGenerator<any, void, unknown>;
}

export interface ApiProcedure<TInput = any, TOutput = any, TCtx = any> {
  type: ProcedureType;
  options: ProcedureOptions<TInput, TOutput, TCtx>;
  middlewares?: MiddlewareFn[];
}

export interface RouteMatch {
  pattern: RegExp;
  paramNames: string[];
  routePath: string;
  filePath: string;
  directory: string;
  procedures: Record<string, ApiProcedure>;
  middlewares: MiddlewareDefinition[];
  handler?: (req: Request, ctx: any) => Promise<Response> | Response;
}

export interface FileRouteModule {
  default?: ApiProcedure | ((req: Request, ctx?: any) => Promise<Response> | Response);
  middleware?: MiddlewareFn;
  get?: ApiProcedure;
  post?: ApiProcedure;
  put?: ApiProcedure;
  del?: ApiProcedure;
  patch?: ApiProcedure;
  [key: string]: any;
}

export interface ApiRouterConfig {
  prefix?: string;
  cache?: CacheControlDirectives | string;
  etag?: boolean;
  cors?: {
    origin?: string | string[] | ((origin: string) => boolean);
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  };
  onError?: (err: Error, req: Request) => Response | Promise<Response>;
}

export type ApiClientHeadersRule =
  | Record<string, string>
  | (() => Promise<Record<string, string>> | Record<string, string>);

export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: FetchFn;
  headers?:
    | Record<string, string>
    | Record<string, ApiClientHeadersRule>
    | (() => Promise<Record<string, string>> | Record<string, string>);
}

export interface ApiCallOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface ApiSubscriptionCallbacks<TData = any> {
  onData: (data: TData) => void;
  onError?: (error: any) => void;
  onComplete?: () => void;
}

export interface ApiSubscriptionHandle {
  unsubscribe: () => void;
}

export type InferApiInput<P> =
  P extends ApiProcedure<infer TInput, any, any>
    ? TInput
    : P extends (...args: any[]) => any
      ? any
      : void;

export type InferApiOutput<P> =
  P extends ApiProcedure<any, infer TOutput, any>
    ? TOutput
    : P extends (...args: any[]) => Promise<infer TOutput>
      ? TOutput
      : unknown;

export type ApiMethodCaller<P> =
  InferApiInput<P> extends void | undefined
    ? (input?: void, options?: ApiCallOptions) => Promise<InferApiOutput<P>>
    : (input: InferApiInput<P>, options?: ApiCallOptions) => Promise<InferApiOutput<P>>;

export type ApiSubscriptionCaller<P> =
  InferApiInput<P> extends void | undefined
    ? (
        input: void | undefined,
        callbacks: ApiSubscriptionCallbacks<InferApiOutput<P>>
      ) => ApiSubscriptionHandle
    : (
        input: InferApiInput<P>,
        callbacks: ApiSubscriptionCallbacks<InferApiOutput<P>>
      ) => ApiSubscriptionHandle;

export type ApiEndpointMethods<T> = {
  get: T extends { GET: infer P }
    ? ApiMethodCaller<P>
    : T extends { get: infer P }
      ? ApiMethodCaller<P>
      : T extends { default: infer P }
        ? ApiMethodCaller<P>
        : (input?: any, options?: ApiCallOptions) => Promise<any>;
  post: T extends { POST: infer P }
    ? ApiMethodCaller<P>
    : T extends { post: infer P }
      ? ApiMethodCaller<P>
      : (input?: any, options?: ApiCallOptions) => Promise<any>;
  put: T extends { PUT: infer P }
    ? ApiMethodCaller<P>
    : T extends { put: infer P }
      ? ApiMethodCaller<P>
      : (input?: any, options?: ApiCallOptions) => Promise<any>;
  patch: T extends { PATCH: infer P }
    ? ApiMethodCaller<P>
    : T extends { patch: infer P }
      ? ApiMethodCaller<P>
      : (input?: any, options?: ApiCallOptions) => Promise<any>;
  del: T extends { DELETE: infer P }
    ? ApiMethodCaller<P>
    : T extends { del: infer P }
      ? ApiMethodCaller<P>
      : (input?: any, options?: ApiCallOptions) => Promise<any>;
  delete: T extends { DELETE: infer P }
    ? ApiMethodCaller<P>
    : T extends { del: infer P }
      ? ApiMethodCaller<P>
      : (input?: any, options?: ApiCallOptions) => Promise<any>;
  subscribe: T extends { GET: infer P }
    ? ApiSubscriptionCaller<P>
    : T extends { subscription: infer P }
      ? ApiSubscriptionCaller<P>
      : (input: any, callbacks: ApiSubscriptionCallbacks) => ApiSubscriptionHandle;

  queryKey: (input?: any) => unknown[];
  queryOptions: (input?: any, extra?: any) => any;
  createQuery: (input?: any, extra?: any) => any;
  useQuery: (input?: any, extra?: any) => any;

  mutationKey: () => unknown[];
  mutationOptions: (extra?: any) => any;
  createMutation: (extra?: any) => any;
  useMutation: (extra?: any) => any;
};

export type DynamicApiClient = {
  get: (input?: any, options?: ApiCallOptions) => Promise<any>;
  post: (input?: any, options?: ApiCallOptions) => Promise<any>;
  put: (input?: any, options?: ApiCallOptions) => Promise<any>;
  patch: (input?: any, options?: ApiCallOptions) => Promise<any>;
  del: (input?: any, options?: ApiCallOptions) => Promise<any>;
  delete: (input?: any, options?: ApiCallOptions) => Promise<any>;
  subscribe: (input: any, callbacks: ApiSubscriptionCallbacks) => ApiSubscriptionHandle;
  queryKey: (input?: any) => unknown[];
  queryOptions: (input?: any, extra?: any) => any;
  createQuery: (input?: any, extra?: any) => any;
  useQuery: (input?: any, extra?: any) => any;
  mutationKey: () => unknown[];
  mutationOptions: (extra?: any) => any;
  createMutation: (extra?: any) => any;
  useMutation: (extra?: any) => any;
  (param: string | number): DynamicApiClient;
} & Record<string, any>;

export type ApiClient<TRoutes = any> = 0 extends 1 & TRoutes
  ? DynamicApiClient
  : [TRoutes] extends [Record<string, any>]
    ? {
        [K in keyof TRoutes]-?: ((param: string | number) => ApiClient<TRoutes[K]>) &
          ApiEndpointMethods<TRoutes[K]> &
          ApiClient<TRoutes[K]>;
      } & ((param: string | number) => any) &
        ApiEndpointMethods<any>
    : DynamicApiClient;
