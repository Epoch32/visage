import { RPCError } from "./error";

export function createSubscriptionResponse(
  iterable: AsyncIterable<any>,
  signal: AbortSignal,
  baseHeaders: Headers
): Response {
  if (!iterable || typeof (iterable as any)[Symbol.asyncIterator] !== "function") {
    throw new RPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Subscription procedure must return an AsyncIterable"
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of iterable) {
          if (signal.aborted) break;
          const message = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
        controller.close();
      } catch (err: any) {
        const errorMessage = `event: error\ndata: ${JSON.stringify({ message: err.message ?? "Stream error" })}\n\n`;
        controller.enqueue(encoder.encode(errorMessage));
        controller.close();
      }
    },
    async cancel() {
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
