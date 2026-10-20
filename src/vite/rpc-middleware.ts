import { createFetchHandler } from "@rpc/server";
import type { VisagePluginOptions } from "./types";

declare const Buffer: any;

/**
 * Attach Visage RPC handler to Vite's Connect dev server middleware
 */
export function createViteRpcMiddleware(options: NonNullable<VisagePluginOptions["rpc"]>) {
  const endpoint = options.endpoint ?? "/api/rpc";
  const handler = createFetchHandler({
    router: options.router,
    endpoint,
    cors: true
  });

  return async (req: any, res: any, next: () => void) => {
    const url = req.url || "";
    if (!url.startsWith(endpoint)) {
      return next();
    }

    try {
      // 1. Read request body if present
      const chunks: any[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const rawBody = chunks.length > 0 ? Buffer.concat(chunks).toString("utf-8") : undefined;

      // 2. Construct standard Web Request
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const host = req.headers.host || "localhost";
      const fullUrl = `${protocol}://${host}${url}`;

      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v !== undefined) {
          if (Array.isArray(v)) {
            for (const item of v) headers.append(k, item);
          } else {
            headers.set(k, String(v));
          }
        }
      }

      const webReq = new Request(fullUrl, {
        method: req.method,
        headers,
        body: req.method !== "GET" && req.method !== "HEAD" ? rawBody : undefined
      });

      // 3. Execute Visage RPC handler
      const webRes = await handler(webReq);

      // 4. Send response back through Connect/Vite res
      res.statusCode = webRes.status;
      webRes.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      // Handle SSE streams or standard bodies
      const isStream = webRes.headers.get("content-type")?.includes("text/event-stream");
      if (isStream && webRes.body) {
        const reader = webRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        const text = await webRes.text();
        res.end(text);
      }
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err?.message || "Internal Server Error" }));
    }
  };
}
