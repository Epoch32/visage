/**
 * Visage API & File-Based RPC Routing System Types
 */
import type { SchemaLike, StandardSchemaV1 } from "../form/schema";
import type { RPCErrorCode } from "../rpc/types";

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
  cors?: {
    origin?: string | string[] | ((origin: string) => boolean);
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  };
  onError?: (err: Error, req: Request) => Response | Promise<Response>;
}
