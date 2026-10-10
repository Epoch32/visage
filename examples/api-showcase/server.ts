import { createApi } from "visage/api";
import { renderToString } from "visage/server";
import { App } from "./App";
import * as globalMiddleware from "./routes/_middleware";
import * as adminMiddleware from "./routes/admin/_middleware";
import * as adminEvents from "./routes/admin/events";
import * as adminMetrics from "./routes/admin/metrics";
import * as healthRoute from "./routes/health";
import * as todoItemRoute from "./routes/todos/[id]";
import * as todosRoute from "./routes/todos/index";

// 1. Build File Router Map
const apiFiles = {
  "./routes/_middleware.ts": globalMiddleware,
  "./routes/health.ts": healthRoute,
  "./routes/todos/index.ts": todosRoute,
  "./routes/todos/[id].ts": todoItemRoute,
  "./routes/admin/_middleware.ts": adminMiddleware,
  "./routes/admin/metrics.ts": adminMetrics,
  "./routes/admin/events.ts": adminEvents
};

const sourceMap = {
  "./routes/_middleware.ts": '// @visage-middleware cascade: true, exclude: ["health"]',
  "./routes/admin/_middleware.ts": "// @visage-middleware cascade: true"
};

export const api = createApi(apiFiles, sourceMap, {
  prefix: "/api",
  cors: { origin: "*", credentials: true }
});

// 2. Full-Stack Bun Server
const port = Number(process.env.PORT || 3030);

export default {
  port,
  async fetch(req: Request) {
    const url = new URL(req.url);

    // API Routes (/api/*)
    if (url.pathname.startsWith("/api/")) {
      return api.fetch(req);
    }

    // Client Browser JavaScript Bundle
    if (url.pathname === "/bundle.js") {
      try {
        const entryPath = new URL("./client.tsx", import.meta.url).pathname;
        const buildResult = await (globalThis as any).Bun.build({
          entrypoints: [entryPath],
          target: "browser",
          minify: false
        });

        if (buildResult.success && buildResult.outputs[0]) {
          const code = await buildResult.outputs[0].text();
          return new Response(code, {
            headers: { "Content-Type": "application/javascript; charset=utf-8" }
          });
        }
      } catch (err) {
        console.error("Bundle build error:", err);
      }
    }

    // SSR Frontend Page (/)
    const appHtml = renderToString(() => App());
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Visage File-Based API Showcase</title>
    <style>body { margin: 0; background: #09090b; color: #f4f4f5; }</style>
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <script type="module" src="/bundle.js"></script>
  </body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
};

console.log(`Visage API Showcase running at http://localhost:${port}`);
