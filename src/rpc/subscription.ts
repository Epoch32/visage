import { RPCError } from "./error";

export interface SubscriptionOptions {
  /**
   * Interval in milliseconds for SSE heartbeat pings. Defaults to 15000ms. Set to 0 to disable.
   */
  heartbeatInterval?: number;
}

export function createSubscriptionResponse(
  iterable: AsyncIterable<any>,
  signal: AbortSignal,
  baseHeaders: Headers,
  options?: SubscriptionOptions
): Response {
  if (!iterable || typeof (iterable as any)[Symbol.asyncIterator] !== "function") {
    throw new RPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Subscription procedure must return an AsyncIterable"
    });
  }

  const heartbeatInterval = options?.heartbeatInterval ?? 15000;
  let heartbeatTimer: any = null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const cleanup = () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
      };

      if (heartbeatInterval > 0) {
        heartbeatTimer = setInterval(() => {
          if (signal?.aborted) {
            cleanup();
            return;
          }
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            cleanup();
          }
        }, heartbeatInterval);
      }

      const abortHandler = () => {
        cleanup();
      };
      signal?.addEventListener?.("abort", abortHandler, { once: true });

      try {
        for await (const chunk of iterable) {
          if (signal?.aborted) break;
          const message = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
        cleanup();
        controller.close();
      } catch (err: any) {
        cleanup();
        const errorMessage = `event: error\ndata: ${JSON.stringify({ message: err.message ?? "Stream error" })}\n\n`;
        controller.enqueue(encoder.encode(errorMessage));
        controller.close();
      } finally {
        cleanup();
        signal?.removeEventListener?.("abort", abortHandler);
      }
    },
    async cancel() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (typeof (iterable as any).return === "function") {
        await (iterable as any).return();
      }
    }
  });

  baseHeaders.set("Content-Type", "text/event-stream; charset=utf-8");
  baseHeaders.set("Cache-Control", "no-cache, no-transform");
  baseHeaders.set("Connection", "keep-alive");

  return new Response(stream, {
    status: 200,
    headers: baseHeaders
  });
}
