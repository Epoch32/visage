import { createFetchHandler, createRouter, v } from "visage/rpc";
import { type SurveySubmission, SurveySubmissionSchema } from "./schema";

export interface SurveyResponseRecord extends SurveySubmission {
  id: string;
  submittedAt: string;
}

const responses: SurveyResponseRecord[] = [];
const subscribers = new Set<(data: SurveyResponseRecord) => void>();

export const surveyRouter = createRouter()
  .query("getConfig", {
    input: v.object({ surveyId: v.string() }),
    resolve: async ({ input }) => {
      return {
        id: input.surveyId,
        title: "Developer Experience & Reactivity Survey 2026",
        description:
          "Share your experience and help shape the future of high-performance UI engineering.",
        steps: ["Role & Identity", "Satisfaction & Ratings", "Detailed Feedback"]
      };
    }
  })
  .query("getStats", {
    resolve: async () => {
      const count = responses.length;
      const avgScore =
        count > 0 ? responses.reduce((acc, r) => acc + r.satisfactionScore, 0) / count : 0;
      return {
        totalResponses: count,
        averageSatisfaction: Number(avgScore.toFixed(1)),
        latestResponses: responses.slice(-5).reverse()
      };
    }
  })
  .mutation("submit", {
    input: SurveySubmissionSchema,
    resolve: async ({ input }) => {
      const record: SurveyResponseRecord = {
        ...input,
        id: `resp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        submittedAt: new Date().toISOString()
      };
      responses.push(record);

      // Broadcast to live stream subscribers
      for (const notify of subscribers) {
        notify(record);
      }

      return { success: true, responseId: record.id };
    }
  })
  .subscription("liveFeed", {
    resolve: async function* ({ signal }) {
      while (!signal.aborted) {
        const item = await new Promise<SurveyResponseRecord>((resolve) => {
          const listener = (data: SurveyResponseRecord) => {
            subscribers.delete(listener);
            resolve(data);
          };
          subscribers.add(listener);
        });
        yield item;
      }
    }
  });

export type SurveyRouter = typeof surveyRouter;

export const handleRpc = createFetchHandler({
  router: surveyRouter,
  endpoint: "/api/rpc",
  cors: true
});

// Standalone Bun server entrypoint if run directly
declare const Bun: any;
declare const process: any;

export function startServer(port = 3000) {
  console.log(`\nVisage Insights Enterprise Server`);
  console.log(`- Application:    http://localhost:${port}`);
  console.log(`- Live Analytics: http://localhost:${port}/analytics`);
  console.log(`- RPC API Base:   http://localhost:${port}/api/rpc\n`);

  if (typeof Bun !== "undefined") {
    return Bun.serve({
      port,
      async fetch(req: Request) {
        const url = new URL(req.url);

        // 1. RPC API Handlers
        if (url.pathname.startsWith("/api/rpc")) {
          return handleRpc(req);
        }

        // 2. Client Application Bundle
        if (url.pathname === "/bundle.js") {
          try {
            const entryPath = new URL("./index.ts", import.meta.url).pathname;
            const buildResult = await Bun.build({
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

        // 3. HTML Shell for Client-Side Routing
        try {
          const htmlPath = new URL("./index.html", import.meta.url).pathname;
          const htmlFile = Bun.file(htmlPath);
          if (await htmlFile.exists()) {
            return new Response(htmlFile, {
              headers: { "Content-Type": "text/html; charset=utf-8" }
            });
          }
        } catch {
          // fallback
        }

        return new Response("Visage Survey Suite", {
          headers: { "Content-Type": "text/plain" }
        });
      }
    });
  }
}

if (typeof (import.meta as any).main === "boolean" && (import.meta as any).main) {
  startServer(typeof process !== "undefined" ? Number(process.env?.PORT || 3000) : 3000);
}
