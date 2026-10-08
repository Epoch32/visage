import { createProcedure } from "./procedure";
import type { MiddlewareFn, Procedure, ProcedureOptions, ProcedureRecord, Router } from "./types";

export class RouterImpl<TRecord extends ProcedureRecord = ProcedureRecord, TContext = any>
  implements Router<TRecord, TContext>
{
  _def: {
    record: TRecord;
    middlewares: MiddlewareFn<any, any>[];
  };

  constructor(record: TRecord = {} as TRecord, middlewares: MiddlewareFn<any, any>[] = []) {
    this._def = {
      record: { ...record },
      middlewares: [...middlewares]
    };
  }

  query(name: string, options: any): any {
    const proc = createProcedure("query", options, this._def.middlewares);
    const newRecord = {
      ...this._def.record,
      [name]: proc
    };

    return new RouterImpl(newRecord, this._def.middlewares);
  }

  mutation(name: string, options: any): any {
    const proc = createProcedure("mutation", options, this._def.middlewares);
    const newRecord = {
      ...this._def.record,
      [name]: proc
    };

    return new RouterImpl(newRecord, this._def.middlewares);
  }

  subscription(name: string, options: any): any {
    const proc = createProcedure("subscription", options, this._def.middlewares);
    const newRecord = {
      ...this._def.record,
      [name]: proc
    };

    return new RouterImpl(newRecord, this._def.middlewares);
  }

  use<TNewContext = TContext>(
    middleware: MiddlewareFn<TContext, TNewContext>
  ): Router<TRecord, TNewContext> {
    const updatedMiddlewares = [...this._def.middlewares, middleware];
    // Re-bind existing procedures with new middleware
    const updatedRecord: ProcedureRecord = {};
    for (const key in this._def.record) {
      const item = this._def.record[key]!;
      if ("type" in item) {
        updatedRecord[key] = {
          ...item,
          middlewares: [...updatedMiddlewares]
        };
      } else {
        updatedRecord[key] = item;
      }
    }
    return new RouterImpl(updatedRecord as TRecord, updatedMiddlewares);
  }

  merge<TPrefix extends string, TSubRecord extends ProcedureRecord>(
    prefix: TPrefix,
    router: Router<TSubRecord, TContext>
  ): Router<TRecord & { [K in TPrefix]: Router<TSubRecord, TContext> }, TContext> {
    const newRecord = {
      ...this._def.record,
      [prefix]: router
    } as TRecord & { [K in TPrefix]: Router<TSubRecord, TContext> };

    return new RouterImpl(newRecord, this._def.middlewares);
  }
}

export function createRouter<
  TRecord extends ProcedureRecord = Record<string, never>,
  TContext = any
>(record?: TRecord): Router<TRecord, TContext> {
  return new RouterImpl<TRecord, TContext>(record ?? ({} as TRecord));
}

export function query<TInput = any, TOutput = any, TContext = any>(
  options: ProcedureOptions<TInput, TOutput, TContext>
): Procedure<"query", TInput, TOutput, TContext> {
  return createProcedure("query", options);
}

export function mutation<TInput = any, TOutput = any, TContext = any>(
  options: ProcedureOptions<TInput, TOutput, TContext>
): Procedure<"mutation", TInput, TOutput, TContext> {
  return createProcedure("mutation", options);
}

export function subscription<TInput = any, TOutput = any, TContext = any>(
  options: ProcedureOptions<TInput, TOutput, TContext>
): Procedure<"subscription", TInput, TOutput, TContext> {
  return createProcedure("subscription", options);
}
