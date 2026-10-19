import type { InferSchemaType, SchemaLike, StandardSchemaV1 } from "@form/schema";
import type {
  ApiProcedure,
  MiddlewareDefinition,
  MiddlewareFn,
  MiddlewarePragma,
  ProcedureOptions
} from "./types";

/**
 * Define a type-safe Query procedure
 */
export function query<
  TSchema extends SchemaLike<any> | StandardSchemaV1<any>,
  TOutput = any,
  TCtx = any
>(options: {
  input: TSchema;
  output?: SchemaLike<TOutput> | StandardSchemaV1<TOutput>;
  resolve: (args: {
    input: InferSchemaType<TSchema>;
    ctx: TCtx;
    req: Request;
    params: Record<string, string>;
  }) => Promise<TOutput> | TOutput | AsyncGenerator<any, void, unknown>;
}): ApiProcedure<InferSchemaType<TSchema>, TOutput, TCtx>;
export function query<TInput = void, TOutput = any, TCtx = any>(
  options: ProcedureOptions<TInput, TOutput, TCtx>
): ApiProcedure<TInput, TOutput, TCtx>;
export function query(options: any): ApiProcedure<any, any, any> {
  return {
    type: "query",
    options
  };
}

/**
 * Define a type-safe Mutation procedure
 */
export function mutation<
  TSchema extends SchemaLike<any> | StandardSchemaV1<any>,
  TOutput = any,
  TCtx = any
>(options: {
  input: TSchema;
  output?: SchemaLike<TOutput> | StandardSchemaV1<TOutput>;
  resolve: (args: {
    input: InferSchemaType<TSchema>;
    ctx: TCtx;
    req: Request;
    params: Record<string, string>;
  }) => Promise<TOutput> | TOutput | AsyncGenerator<any, void, unknown>;
}): ApiProcedure<InferSchemaType<TSchema>, TOutput, TCtx>;
export function mutation<TInput = void, TOutput = any, TCtx = any>(
  options: ProcedureOptions<TInput, TOutput, TCtx>
): ApiProcedure<TInput, TOutput, TCtx>;
export function mutation(options: any): ApiProcedure<any, any, any> {
  return {
    type: "mutation",
    options
  };
}

/**
 * Define a real-time SSE / Stream Subscription procedure
 */
export function subscription<TOutput = any, TCtx = any>(
  options: Omit<ProcedureOptions<void, TOutput, TCtx>, "input">
): ApiProcedure<void, TOutput, TCtx> {
  return {
    type: "subscription",
    options: {
      ...options,
      resolve: options.resolve as any
    }
  };
}

/**
 * Helper to define a middleware function with optional pragma metadata
 */
export function defineMiddleware<TCtxIn = any, TCtxOut = any>(
  fn: MiddlewareFn<TCtxIn, TCtxOut>,
  pragma: MiddlewarePragma = { cascade: true, match: ["*"] }
): MiddlewareDefinition {
  return {
    fn,
    pragma
  };
}

/**
 * Composable Procedure Builder (Fluent Style)
 */
export class ProcedureBuilder<TCtx = any, TInput = any> {
  private _middlewares: MiddlewareFn[] = [];
  private _inputSchema?: SchemaLike<TInput> | StandardSchemaV1<TInput>;

  constructor(middlewares: MiddlewareFn[] = [], inputSchema?: SchemaLike<TInput>) {
    this._middlewares = middlewares;
    this._inputSchema = inputSchema;
  }

  use<TNextCtx = Record<string, unknown>>(
    middleware: MiddlewareFn<TCtx, TNextCtx>
  ): ProcedureBuilder<TCtx & TNextCtx, TInput> {
    return new ProcedureBuilder<TCtx & TNextCtx, TInput>(
      [...this._middlewares, middleware],
      this._inputSchema as any
    );
  }

  input<TNewInput>(
    schema: SchemaLike<TNewInput> | StandardSchemaV1<TNewInput>
  ): ProcedureBuilder<TCtx, TNewInput> {
    return new ProcedureBuilder<TCtx, TNewInput>(this._middlewares, schema as any);
  }

  query<TOutput>(
    resolve: (args: {
      input: TInput;
      ctx: TCtx;
      req: Request;
      params: Record<string, string>;
    }) => Promise<TOutput> | TOutput
  ): ApiProcedure<TInput, TOutput, TCtx> {
    return {
      type: "query",
      options: {
        input: this._inputSchema,
        resolve
      },
      middlewares: this._middlewares
    };
  }

  mutation<TOutput>(
    resolve: (args: {
      input: TInput;
      ctx: TCtx;
      req: Request;
      params: Record<string, string>;
    }) => Promise<TOutput> | TOutput
  ): ApiProcedure<TInput, TOutput, TCtx> {
    return {
      type: "mutation",
      options: {
        input: this._inputSchema,
        resolve
      },
      middlewares: this._middlewares
    };
  }

  subscription<TOutput>(
    resolve: (args: {
      ctx: TCtx;
      req: Request;
      params: Record<string, string>;
    }) => AsyncGenerator<TOutput, void, unknown>
  ): ApiProcedure<void, TOutput, TCtx> {
    return {
      type: "subscription",
      options: {
        resolve: resolve as any
      },
      middlewares: this._middlewares
    };
  }
}

export const procedure = new ProcedureBuilder<Record<string, unknown>>();
