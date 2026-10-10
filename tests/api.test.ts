import { describe, expect, it } from "bun:test";
import {
  createApi,
  mutation,
  parsePragma,
  procedure,
  query,
  RPCError,
  subscription,
  v
} from "../src/api";

describe("Visage Opinionated File-Based API Framework (visage/api)", () => {
  describe("Directive Pragma Parser & Route Matcher", () => {
    it("parses single-line and multi-line // @visage-middleware pragmas", () => {
      const src1 = `
// @visage-middleware cascade: true, match: ["*"], exclude: ["health", "public/*"], priority: 5
import { defineMiddleware } from "visage/api";
      `;
      const p1 = parsePragma(src1);
      expect(p1.cascade).toBe(true);
      expect(p1.match).toEqual(["*"]);
      expect(p1.exclude).toEqual(["health", "public/*"]);
      expect(p1.priority).toBe(5);

      const src2 = `
/* @visage-middleware cascade: false, match: ["users/*"] */
export const middleware = () => {};
      `;
      const p2 = parsePragma(src2);
      expect(p2.cascade).toBe(false);
      expect(p2.match).toEqual(["users/*"]);
    });

    it("defaults safely when no pragma is present", () => {
      const p = parsePragma("export default () => {};");
      expect(p.cascade).toBe(true);
      expect(p.match).toEqual(["*"]);
      expect(p.exclude).toEqual([]);
    });
  });

  describe("File-Based Routing & Middleware Cascades", () => {
    const apiFiles = {
      // Root Global Middleware (excludes health)
      "./routes/_middleware.ts": {
        middleware: async ({ next }: any) => {
          const res = await next({ globalPassed: true });
          return res;
        }
      },
      // Admin Auth Guard Middleware (cascades to all /admin subroutes)
      "./routes/admin/_middleware.ts": {
        middleware: async ({ req, next }: any) => {
          const auth = req.headers.get("Authorization");
          if (!auth?.startsWith("Bearer admin-token")) {
            throw new RPCError(401, "Admin Authorization Required");
          }
          return next({ adminUser: { id: "admin_99", role: "admin" } });
        }
      },
      // Public Health Check
      "./routes/health.ts": {
        default: query({
          resolve: () => ({ status: "healthy", timestamp: 123456789 })
        })
      },
      // Admin Stats
      "./routes/admin/stats.ts": {
        default: query({
          input: v.object({
            range: v.string()
          }),
          resolve: ({ input, ctx }: any) => ({
            range: input.range,
            user: ctx.adminUser,
            globalPassed: ctx.globalPassed
          })
        })
      },
      // Admin User Details by ID
      "./routes/admin/users/[id].ts": {
        get: query({
          resolve: ({ params, ctx }: any) => ({
            userId: params.id,
            requestedBy: ctx.adminUser.id
          })
        }),
        post: mutation({
          input: v.object({
            name: v.string()
          }),
          resolve: ({ input, params }: any) => ({
            updatedId: params.id,
            newName: input.name
          })
        })
      },
      // SSE Real-Time Stream
      "./routes/admin/notifications.ts": {
        default: subscription({
          resolve: async function* () {
            yield { message: "System online" };
            yield { message: "Backup complete" };
          }
        })
      }
    };

    const sourceMap = {
      "./routes/_middleware.ts": '// @visage-middleware cascade: true, exclude: ["health"]',
      "./routes/admin/_middleware.ts": "// @visage-middleware cascade: true"
    };

    const api = createApi(apiFiles, sourceMap, {
      cors: {
        origin: "*",
        credentials: true
      }
    });

    it("resolves public routes without triggering admin guard", async () => {
      const req = new Request("http://localhost/health");
      const res = await api.fetch(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.status).toBe("healthy");
    });

    it("blocks unauthorized requests to guarded admin route family", async () => {
      const req = new Request(
        `http://localhost/admin/stats?input=${encodeURIComponent(JSON.stringify({ range: "30d" }))}`
      );
      const res = await api.fetch(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
      expect(json.error.message).toContain("Admin Authorization Required");
    });

    it("allows authorized requests, verifies input schema, and passes accumulated context", async () => {
      const req = new Request(
        `http://localhost/admin/stats?input=${encodeURIComponent(JSON.stringify({ range: "30d" }))}`,
        {
          headers: {
            Authorization: "Bearer admin-token"
          }
        }
      );
      const res = await api.fetch(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.range).toBe("30d");
      expect(json.data.user.id).toBe("admin_99");
      expect(json.data.globalPassed).toBe(true);
    });

    it("extracts URL parameters from [id].ts routes and handles GET & POST methods", async () => {
      // GET
      const getReq = new Request("http://localhost/admin/users/user_456", {
        headers: { Authorization: "Bearer admin-token" }
      });
      const getRes = await api.fetch(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.data.userId).toBe("user_456");
      expect(getJson.data.requestedBy).toBe("admin_99");

      // POST Mutation
      const postReq = new Request("http://localhost/admin/users/user_456", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer admin-token"
        },
        body: JSON.stringify({ name: "Alice Wonderland" })
      });
      const postRes = await api.fetch(postReq);
      expect(postRes.status).toBe(200);
      const postJson = await postRes.json();
      expect(postJson.data.updatedId).toBe("user_456");
      expect(postJson.data.newName).toBe("Alice Wonderland");
    });

    it("streams SSE subscriptions with Content-Type: text/event-stream", async () => {
      const sseReq = new Request("http://localhost/admin/notifications", {
        headers: { Authorization: "Bearer admin-token" }
      });
      const sseRes = await api.fetch(sseReq);
      expect(sseRes.status).toBe(200);
      expect(sseRes.headers.get("Content-Type")).toBe("text/event-stream");

      const text = await sseRes.text();
      expect(text).toContain('data: {"message":"System online"}');
      expect(text).toContain('data: {"message":"Backup complete"}');
    });

    it("handles CORS OPTIONS preflight requests smoothly", async () => {
      const optReq = new Request("http://localhost/admin/stats", {
        method: "OPTIONS",
        headers: {
          Origin: "https://my-frontend.com"
        }
      });
      const optRes = await api.fetch(optReq);
      expect(optRes.status).toBe(204);
      expect(optRes.headers.get("Access-Control-Allow-Origin")).toBe("https://my-frontend.com");
      expect(optRes.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    });
  });

  describe("Procedure Builder (Fluent Chaining)", () => {
    it("chains typed middlewares and validates input", async () => {
      const guardedProc = procedure
        .use(async ({ req, next }) => {
          return next({ authHeader: req.headers.get("X-Custom-Auth") });
        })
        .input(v.object({ greeting: v.string() }))
        .query(({ input, ctx }: any) => ({
          result: `${input.greeting} with ${ctx.authHeader}`
        }));

      const files = {
        "./hello.ts": {
          default: guardedProc
        }
      };

      const api = createApi(files);
      const req = new Request(
        `http://localhost/hello?input=${encodeURIComponent(JSON.stringify({ greeting: "Hi" }))}`,
        {
          headers: { "X-Custom-Auth": "secret-123" }
        }
      );
      const res = await api.fetch(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.result).toBe("Hi with secret-123");
    });
  });
});
