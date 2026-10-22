import type { InferSchemaType, SchemaLike, ValidationIssue } from "@form/schema";
import type { CacheControlDirectives } from "@http";
import type {
  CreateQueryOptions,
  MutationOptions,
  MutationResult,
  QueryResult
} from "@query/types";

export type RPCErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "TIMEOUT"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNPROCESSABLE_CONTENT"
  | "INTERNAL_SERVER_ERROR";

export type ProcedureType = "query" | "mutation" | "subscription";

export type MiddlewareFn<TContext = any, TNewContext = TContext> = (opts: {
  ctx: TContext;
  req: Request;
  signal: AbortSignal;
  next: (opts?: { ctx?: TNewContext }) => Promise<any>;
}) => Promise<any>;

export interface ProcedureOptionsWithInput<
  TSchema extends SchemaLike<any>,
  TOutput = any,
  TContext = any
> {
  input: TSchema;
  output?: SchemaLike<TOutput>;
  cache?: CacheControlDirectives | string;
  resolve: (opts: {
    input: InferSchemaType<TSchema>;
    ctx: TContext;
    req: Request;
    signal: AbortSignal;
  }) => Promise<TOutput> | TOutput | AsyncIterable<TOutput>;
}

export interface ProcedureOptionsWithoutInput<TOutput = any, TContext = any> {
  input?: undefined;
  output?: SchemaLike<TOutput>;
  cache?: CacheControlDirectives | string;
  resolve: (opts: {
    input: void;
    ctx: TContext;
    req: Request;
    signal: AbortSignal;
  }) => Promise<TOutput> | TOutput | AsyncIterable<TOutput>;
}

export type ProcedureOptions<TInput = any, TOutput = any, TContext = any> = {
  input?: SchemaLike<TInput>;
  output?: SchemaLike<TOutput>;
  cache?: CacheControlDirectives | string;
  resolve: (opts: {
    input: TInput;
    ctx: TContext;
    req: Request;
    signal: AbortSignal;
  }) => Promise<TOutput> | TOutput | AsyncIterable<TOutput>;
};

export interface Procedure<
  TType extends ProcedureType = ProcedureType,
  TInput = any,
  TOutput = any,
  TContext = any
> {
  type: TType;
  cache?: CacheControlDirectives | string;
  inputSchema?: SchemaLike<TInput>;
  outputSchema?: SchemaLike<TOutput>;
  middlewares: MiddlewareFn<any, any>[];
  resolve: (opts: {
    input: TInput;
    ctx: TContext;
    req: Request;
    signal: AbortSignal;
  }) => Promise<TOutput> | TOutput | AsyncIterable<TOutput>;
}

export type ProcedureRecord = Record<string, Procedure<any, any, any, any> | Router<any, any>>;

export interface Router<TRecord extends ProcedureRecord = ProcedureRecord, TContext = any> {
  _def: {
    record: TRecord;
    middlewares: MiddlewareFn<any, any>[];
  };
  query<TName extends string, TSchema extends SchemaLike<any>, TOutput = any>(
    name: TName,
    options: ProcedureOptionsWithInput<TSchema, TOutput, TContext>
  ): Router<
    TRecord & { [K in TName]: Procedure<"query", InferSchemaType<TSchema>, TOutput, TContext> },
    TContext
  >;
  query<TName extends string, TOutput = any>(
    name: TName,
    options: ProcedureOptionsWithoutInput<TOutput, TContext>
  ): Router<TRecord & { [K in TName]: Procedure<"query", void, TOutput, TContext> }, TContext>;

  mutation<TName extends string, TSchema extends SchemaLike<any>, TOutput = any>(
    name: TName,
    options: ProcedureOptionsWithInput<TSchema, TOutput, TContext>
  ): Router<
    TRecord & { [K in TName]: Procedure<"mutation", InferSchemaType<TSchema>, TOutput, TContext> },
    TContext
  >;
  mutation<TName extends string, TOutput = any>(
    name: TName,
    options: ProcedureOptionsWithoutInput<TOutput, TContext>
  ): Router<TRecord & { [K in TName]: Procedure<"mutation", void, TOutput, TContext> }, TContext>;

  subscription<TName extends string, TSchema extends SchemaLike<any>, TOutput = any>(
    name: TName,
    options: ProcedureOptionsWithInput<TSchema, TOutput, TContext>
  ): Router<
    TRecord & {
      [K in TName]: Procedure<"subscription", InferSchemaType<TSchema>, TOutput, TContext>;
    },
    TContext
  >;
  subscription<TName extends string, TOutput = any>(
    name: TName,
    options: ProcedureOptionsWithoutInput<TOutput, TContext>
  ): Router<
    TRecord & { [K in TName]: Procedure<"subscription", void, TOutput, TContext> },
    TContext
  >;

  use<TNewContext = TContext>(
    middleware: MiddlewareFn<TContext, TNewContext>
  ): Router<TRecord, TNewContext>;

  merge<TPrefix extends string, TSubRecord extends ProcedureRecord>(
    prefix: TPrefix,
    router: Router<TSubRecord, TContext>
  ): Router<TRecord & { [K in TPrefix]: Router<TSubRecord, TContext> }, TContext>;
}

export interface CORSOptions {
  origin?: string | string[] | ((origin: string) => boolean | string);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export type DynamicHeadersFn = (
  req: Request,
  ctx: any
) => Promise<Record<string, string>> | Record<string, string>;

export type HeadersConfig = Record<string, string> | DynamicHeadersFn;

export interface RouteRule {
  /**
   * Response headers to attach to all matching requests.
   */
  headers?: HeadersConfig;

  /**
   * Optional Cache-Control directives or header string.
   */
  cache?: CacheControlDirectives | string;

  /**
   * Required request headers. If any are missing, automatically rejects with HTTP 401 Unauthorized.
   */
  requireHeaders?: string[];

  /**
   * Required query parameters. If missing on GET requests, rejects with HTTP 400 Bad Request.
   */
  requireParams?: string[];

  /**
   * Custom guard function for matching requests. Return false or throw RPCError to reject.
   */
  guard?: (opts: {
    req: Request;
    ctx: any;
    path: string;
  }) => Promise<boolean | void> | boolean | void;
}

export interface FetchHandlerOptions<
  TRouter extends Router<any, any> = Router<any, any>,
  TContext = any
> {
  router: TRouter;
  endpoint?: string;
  cache?: CacheControlDirectives | string;
  etag?: boolean;
  createContext?: (opts: { req: Request; extra: any[] }) => Promise<TContext> | TContext;
  onError?: (opts: { error: any; path?: string; req: Request }) => void;
  cors?: boolean | CORSOptions;
  securityHeaders?: boolean | Record<string, string>;

  /**
   * Emit RFC 9457 Problem Details (`application/problem+json`) on error responses
   */
  problemDetails?: boolean;

  /**
   * Maximum allowed procedures in a single batch request to prevent resource exhaustion.
   * Defaults to 50.
   */
  maxBatchSize?: number;

  /**
   * Maximum allowed request body size in bytes to prevent memory exhaustion DoS.
   * Defaults to 10MB (10 * 1024 * 1024). Set to 0 or Infinity to disable.
   */
  maxBodySize?: number;

  /**
   * Anti-CSRF protection for mutation procedures.
   * When true (default), blocks cross-site form submissions and simple cross-origin mutations.
   * Defaults to true.
   */
  csrfProtection?: boolean;

  /**
   * Declarative pattern rules matching URL paths or procedure names (e.g. "*", "/api/*", "admin.*").
   * Supports wildcard matching with '*'.
   */
  rules?: Record<string, RouteRule> | Array<{ match: string } & RouteRule>;
}

export type ClientHeadersRule =
  | Record<string, string>
  | (() => Promise<Record<string, string>> | Record<string, string>);

export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ClientOptions {
  baseUrl?: string;
  endpoint?: string;
  fetch?: FetchFn;
  headers?:
    | Record<string, string>
    | Record<string, ClientHeadersRule>
    | (() => Promise<Record<string, string>> | Record<string, string>);
}

export interface SubscriptionCallbacks<TData = any> {
  onData: (data: TData) => void;
  onError?: (error: any) => void;
  onComplete?: () => void;
}

export interface SubscriptionHandle {
  unsubscribe: () => void;
}

export type InferProcedureInput<P> =
  P extends Procedure<any, infer TInput, any, any> ? TInput : void;

export type InferProcedureOutput<P> =
  P extends Procedure<any, any, infer TOutput, any> ? TOutput : unknown;

export type ClientQueryMethod<P> =
  InferProcedureInput<P> extends void | undefined
    ? (
        input?: void,
        options?: { signal?: AbortSignal; headers?: Record<string, string> }
      ) => Promise<InferProcedureOutput<P>>
    : (
        input: InferProcedureInput<P>,
        options?: { signal?: AbortSignal; headers?: Record<string, string> }
      ) => Promise<InferProcedureOutput<P>>;

export type ClientMutationMethod<P> =
  InferProcedureInput<P> extends void | undefined
    ? (
        input?: void,
        options?: { signal?: AbortSignal; headers?: Record<string, string> }
      ) => Promise<InferProcedureOutput<P>>
    : (
        input: InferProcedureInput<P>,
        options?: { signal?: AbortSignal; headers?: Record<string, string> }
      ) => Promise<InferProcedureOutput<P>>;

export type ClientSubscriptionMethod<P> =
  InferProcedureInput<P> extends void | undefined
    ? (
        input: void | undefined,
        callbacks: SubscriptionCallbacks<InferProcedureOutput<P>>
      ) => SubscriptionHandle
    : (
        input: InferProcedureInput<P>,
        callbacks: SubscriptionCallbacks<InferProcedureOutput<P>>
      ) => SubscriptionHandle;

export type ClientProcedure<P> =
  P extends Procedure<"query", infer TInput, infer TOutput, any>
    ? {
        query: ClientQueryMethod<P>;
        createQuery: (
          input?: TInput | (() => TInput),
          extra?: Partial<CreateQueryOptions<TOutput, any, TOutput, any>>
        ) => QueryResult<TOutput, any>;
        useQuery: (
          input?: TInput | (() => TInput),
          extra?: Partial<CreateQueryOptions<TOutput, any, TOutput, any>>
        ) => QueryResult<TOutput, any>;
        queryKey: (input?: TInput) => unknown[];
        queryOptions: (
          input?: TInput,
          extra?: Partial<CreateQueryOptions<TOutput, any, TOutput, any>>
        ) => CreateQueryOptions<TOutput, any, TOutput, any>;
      }
    : P extends Procedure<"mutation", infer TInput, infer TOutput, any>
      ? {
          mutate: ClientMutationMethod<P>;
          createMutation: (
            extra?: Partial<MutationOptions<TOutput, any, TInput, any>>
          ) => MutationResult<TOutput, any, TInput, any>;
          useMutation: (
            extra?: Partial<MutationOptions<TOutput, any, TInput, any>>
          ) => MutationResult<TOutput, any, TInput, any>;
          mutationKey: () => unknown[];
          mutationOptions: (
            extra?: Partial<MutationOptions<TOutput, any, TInput, any>>
          ) => MutationOptions<TOutput, any, TInput, any>;
        }
      : P extends Procedure<"subscription", any, any, any>
        ? {
            subscribe: ClientSubscriptionMethod<P>;
          }
        : never;

export type ClientRouter<R> =
  R extends Router<infer TRecord, any>
    ? {
        [K in keyof TRecord]: TRecord[K] extends Procedure<any, any, any, any>
          ? ClientProcedure<TRecord[K]>
          : TRecord[K] extends Router<any, any>
            ? ClientRouter<TRecord[K]>
            : never;
      }
    : never;

export interface RPCResponseSuccess<T = any> {
  result: {
    data: T;
  };
}

export interface RPCResponseError {
  error: {
    code: RPCErrorCode;
    message: string;
    issues?: ValidationIssue[];
    data?: any;
  };
}

export type RPCResponse<T = any> = RPCResponseSuccess<T> | RPCResponseError;
