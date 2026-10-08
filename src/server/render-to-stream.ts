import type { Child } from "../dom/render";
import { renderToString } from "./render-to-string";

export interface StreamOptions {
  onChunk?: (chunk: string) => void;
  onError?: (error: any) => void;
}

/**
 * Stream HTML chunks progressively using standard Web Streams (ReadableStream)
 */
export function renderToStream(
  fn: () => Child,
  options?: StreamOptions
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      try {
        const initialHtml = renderToString(fn);
        options?.onChunk?.(initialHtml);
        controller.enqueue(encoder.encode(initialHtml));
        controller.close();
      } catch (err) {
        options?.onError?.(err);
        controller.error(err);
      }
    }
  });
}
