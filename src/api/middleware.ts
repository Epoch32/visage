/**
 * Visage Middleware Execution Engine & Context Propagation
 */
import type { MiddlewareFn, NextFn } from "./types";

/**
 * Execute a chain of middlewares, accumulating context and returning either an early Response or merged Context
 */
export async function executeMiddlewareChain(
  middlewares: MiddlewareFn[],
  req: Request,
  url: URL,
  params: Record<string, string>,
  initialCtx: Record<string, any> = {}
): Promise<{ response?: Response; ctx: Record<string, any> }> {
  let currentCtx = { ...initialCtx };
  let earlyResponse: Response | undefined;

  let index = 0;

  const runner = async (): Promise<void> => {
    if (index >= middlewares.length) {
      return;
    }

    const currentMw = middlewares[index++]!;
    const next: NextFn = async (enriched) => {
      if (enriched && typeof enriched === "object") {
        currentCtx = { ...currentCtx, ...enriched };
      }
      await runner();
      return currentCtx;
    };

    const result = await currentMw({
      req,
      ctx: currentCtx,
      url,
      params,
      next
    });

    if (result instanceof Response) {
      earlyResponse = result;
    }
  };

  await runner();

  return {
    response: earlyResponse,
    ctx: currentCtx
  };
}
