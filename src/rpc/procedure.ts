import { validateWithSchema } from "../form/schema";
import { RPCError } from "./error";
import type { MiddlewareFn, Procedure, ProcedureOptions, ProcedureType } from "./types";

export function createProcedure<
  TType extends ProcedureType,
  TInput = any,
  TOutput = any,
  TContext = any
>(
  type: TType,
  options: ProcedureOptions<TInput, TOutput, TContext>,
  middlewares: MiddlewareFn<any, any>[] = []
): Procedure<TType, TInput, TOutput, TContext> {
  return {
    type,
    inputSchema: options.input,
    outputSchema: options.output,
    middlewares: [...middlewares],
    resolve: options.resolve as any
  };
}

export async function executeProcedure(
  procedure: Procedure<any, any, any, any>,
  opts: {
    rawInput: unknown;
    ctx: any;
    req: Request;
    signal: AbortSignal;
  }
): Promise<any> {
  let input = opts.rawInput;

  if (procedure.inputSchema) {
    const res = validateWithSchema(procedure.inputSchema, opts.rawInput);
    if (!res.success) {
      throw new RPCError({
        code: "BAD_REQUEST",
        message: "Invalid procedure input",
        issues: res.issues
      });
    }
    input = res.data;
  }

  // Middleware pipeline runner
  let currentIndex = 0;
  let currentContext = opts.ctx;

  const runPipeline = async (ctx: any): Promise<any> => {
    currentContext = ctx;
    if (currentIndex < procedure.middlewares.length) {
      const mw = procedure.middlewares[currentIndex++]!;
      return mw({
        ctx: currentContext,
        req: opts.req,
        signal: opts.signal,
        next: async (nextOpts) => {
          return runPipeline(nextOpts?.ctx ?? currentContext);
        }
      });
    }

    return procedure.resolve({
      input,
      ctx: currentContext,
      req: opts.req,
      signal: opts.signal
    });
  };

  const output = await runPipeline(currentContext);

  if (procedure.outputSchema && procedure.type !== "subscription") {
    const res = validateWithSchema(procedure.outputSchema, output);
    if (!res.success) {
      throw new RPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Invalid procedure output",
        issues: res.issues
      });
    }
    return res.data;
  }

  return output;
}
