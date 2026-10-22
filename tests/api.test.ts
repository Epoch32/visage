import { describe, expect, it } from "bun:test";
import {
  createApi,
  createApiClient,
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
          if (auth !== "Bearer admin-token") {
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
        origin: "https://my-frontend.com",
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

  describe("Typed API Client (createApiClient)", () => {
    it("calls GET, POST, dynamic parameters, and unwrap response data", async () => {
      const files = {
        "./health.ts": {
          GET: query({
            resolve: () => ({ status: "ok", timestamp: 12345 })
          })
        },
        "./users/[id].ts": {
          GET: query({
            input: v.object({ id: v.string() }),
            resolve: ({ params }) => ({ id: params.id, name: `User ${params.id}` })
          }),
          POST: mutation({
            input: v.object({ email: v.string() }),
            resolve: ({ params, input }) => ({
              id: params.id,
              email: input.email,
              updated: true
            })
          })
        },
        "./admin/stream.ts": {
          GET: subscription({
            resolve: async function* () {
              yield { event: "ping", seq: 1 };
              yield { event: "pong", seq: 2 };
            }
          })
        }
      };

      const api = createApi(files, { prefix: "/api" });

      const client = createApiClient({
        baseUrl: "http://localhost/api",
        fetch: async (url, init) => {
          const req = new Request(url, init);
          return api.fetch(req);
        }
      });

      // 1. Static GET endpoint
      const health = await client.health.get();
      expect(health).toEqual({ status: "ok", timestamp: 12345 });

      // 2. Dynamic path parameter via index accessor
      const user1 = await client.users["user-99"].get();
      expect(user1).toEqual({ id: "user-99", name: "User user-99" });

      // 3. Dynamic path parameter via function call
      const user2 = await client.users("user-100").get();
      expect(user2).toEqual({ id: "user-100", name: "User user-100" });

      // 4. POST mutation with body
      const updated = await client.users["user-99"].post({ email: "user99@visage.dev" });
      expect(updated).toEqual({
        id: "user-99",
        email: "user99@visage.dev",
        updated: true
      });

      // 5. Query Options and Query Signals
      const qOpts = client.users["user-99"].queryOptions();
      expect(qOpts.queryKey).toEqual(["users", "user-99"]);
      const queryData = await qOpts.queryFn({ signal: new AbortController().signal });
      expect(queryData).toEqual({ id: "user-99", name: "User user-99" });

      // 6. SSE Subscription
      const received: any[] = [];
      await new Promise<void>((resolve, reject) => {
        client.admin.stream.subscribe(undefined, {
          onData: (data: any) => {
            received.push(data);
            if (received.length === 2) resolve();
          },
          onError: (err: any) => reject(err),
          onComplete: () => resolve()
        });
      });

      expect(received).toEqual([
        { event: "ping", seq: 1 },
        { event: "pong", seq: 2 }
      ]);
    });
  });

  describe("Server-Side Rendering (SSR) Integration", () => {
    it("renders JSX component trees with Show, For, and DevTools to HTML string without document", async () => {
      const { renderToString } = await import("../src/server");
      const { App } = await import("../examples/api-showcase/App");

      const html = renderToString(() => App());
      expect(typeof html).toBe("string");
      expect(html).toContain("Visage Full-Stack API Showcase");
      expect(html).toContain("Reactive Todos (/api/todos)");
      expect(html).toContain("Guarded Admin Family (/api/admin/*)");
    });
  });

  describe("CORS Origin Validation & Security", () => {
    const corsFiles = {
      "./routes/health.ts": {
        default: query({
          resolve: () => ({ status: "healthy" })
        })
      }
    };

    it("reflects allowed origins with credentials and Vary header", async () => {
      const api = createApi(
        corsFiles,
        {},
        {
          cors: {
            origin: ["https://trusted-app.com", "https://another-trusted.com"],
            credentials: true
          }
        }
      );

      const req = new Request("http://localhost/health", {
        headers: { Origin: "https://trusted-app.com" }
      });
      const res = await api.fetch(req);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://trusted-app.com");
      expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
      expect(res.headers.get("Vary")).toContain("Origin");
    });

    it("does not reflect unauthorized origins or credentials", async () => {
      const api = createApi(
        corsFiles,
        {},
        {
          cors: {
            origin: "https://trusted-app.com",
            credentials: true
          }
        }
      );

      const req = new Request("http://localhost/health", {
        headers: { Origin: "https://evil-attacker.com" }
      });
      const res = await api.fetch(req);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(res.headers.get("Access-Control-Allow-Credentials")).toBeNull();

      const preflight = new Request("http://localhost/health", {
        method: "OPTIONS",
        headers: {
          Origin: "https://evil-attacker.com",
          "Access-Control-Request-Method": "GET"
        }
      });
      const preflightRes = await api.fetch(preflight);
      expect(preflightRes.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(preflightRes.headers.get("Access-Control-Allow-Credentials")).toBeNull();
    });

    it("disallows wildcard CORS origin reflection when credentials are enabled", async () => {
      const api = createApi(
        corsFiles,
        {},
        {
          cors: {
            origin: "*",
            credentials: true
          }
        }
      );

      const req = new Request("http://localhost/health", {
        headers: { Origin: "https://evil-attacker.com" }
      });
      const res = await api.fetch(req);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(res.headers.get("Access-Control-Allow-Credentials")).toBeNull();
    });
  });

  describe("HTTP Caching & Conditional Revalidation (RFC 9110 / RFC 9111)", () => {
    const cacheFiles = {
      "./routes/feed.ts": {
        get: procedure
          .cache({ public: true, maxAge: 0, sMaxAge: 3600, mustRevalidate: true })
          .query(() => ({ items: ["article-1", "article-2"] }))
      },
      "./routes/raw-info.ts": {
        default: async () =>
          new Response("Visage Server v2.0", {
            status: 200,
            headers: { "Content-Type": "text/plain" }
          })
      }
    };

    const api = createApi(
      cacheFiles,
      {},
      {
        cors: { origin: "*" }
      }
    );

    it("automatically generates weak ETag and attaches structured Cache-Control", async () => {
      const req = new Request("http://localhost/feed");
      const res = await api.fetch(req);
      expect(res.status).toBe(200);

      const etag = res.headers.get("etag");
      expect(etag).not.toBeNull();
      expect(etag?.startsWith('W/"')).toBe(true);

      const cacheControl = res.headers.get("cache-control");
      expect(cacheControl).toContain("public");
      expect(cacheControl).toContain("s-maxage=3600");
      expect(cacheControl).toContain("must-revalidate");

      const body = await res.json();
      expect(body.data.items).toEqual(["article-1", "article-2"]);
    });

    it("returns 304 Not Modified when client supplies matching If-None-Match", async () => {
      // 1. Initial request to obtain ETag
      const req1 = new Request("http://localhost/feed");
      const res1 = await api.fetch(req1);
      const etag = res1.headers.get("etag")!;

      // 2. Revalidation request
      const req2 = new Request("http://localhost/feed", {
        headers: { "If-None-Match": etag }
      });
      const res2 = await api.fetch(req2);
      expect(res2.status).toBe(304);
      expect(res2.statusText).toBe("Not Modified");
      expect(res2.headers.get("etag")).toBe(etag);
      expect(res2.headers.get("cache-control")).toContain("s-maxage=3600");
      expect(res2.headers.get("content-type")).toBeNull();
      expect(await res2.text()).toBe("");
    });

    it("supports RFC 9110 §9.3.2 HEAD requests returning identical headers with empty body", async () => {
      const headReq = new Request("http://localhost/feed", { method: "HEAD" });
      const headRes = await api.fetch(headReq);
      expect(headRes.status).toBe(200);
      expect(headRes.headers.get("etag")).not.toBeNull();
      expect(headRes.headers.get("cache-control")).toContain("s-maxage=3600");
      expect(headRes.headers.get("content-type")).toBe("application/json");
      expect(await headRes.text()).toBe("");
    });
  });

  describe("Security & Hardening", () => {
    it("enforces valid HTTP methods on query, mutation, and subscription procedures (405 Method Not Allowed)", async () => {
      const api = createApi({
        "routes/danger.ts": {
          default: mutation({
            resolve: () => ({ deleted: true })
          })
        },
        "routes/events.ts": {
          default: subscription({
            resolve: async function* () {
              yield { ping: true };
            }
          })
        }
      });

      // 1. GET on a mutation procedure must be rejected with 405
      const getRes = await api.fetch(new Request("http://localhost/danger", { method: "GET" }));
      expect(getRes.status).toBe(405);
      const getBody = await getRes.json();
      expect(getBody.error.code).toBe("METHOD_NOT_ALLOWED");

      // 2. HEAD on a mutation procedure must be rejected with 405
      const headRes = await api.fetch(new Request("http://localhost/danger", { method: "HEAD" }));
      expect(headRes.status).toBe(405);

      // 3. POST on a mutation procedure is allowed
      const postRes = await api.fetch(
        new Request("http://localhost/danger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        })
      );
      expect(postRes.status).toBe(200);
      const postBody = await postRes.json();
      expect(postBody.data.deleted).toBe(true);

      // 4. POST on a subscription procedure must be rejected with 405
      const subPostRes = await api.fetch(
        new Request("http://localhost/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        })
      );
      expect(subPostRes.status).toBe(405);
      const subPostBody = await subPostRes.json();
      expect(subPostBody.error.code).toBe("METHOD_NOT_ALLOWED");
    });

    it("handles malformed URI parameters safely and returns 400 Bad Request instead of crashing", async () => {
      const api = createApi({
        "routes/users/[id].ts": {
          get: query({
            resolve: ({ params }: any) => ({ id: params.id })
          })
        }
      });

      // Malformed URI percent encoding (%E0%A4%A)
      const res = await api.fetch(new Request("http://localhost/users/%E0%A4%A"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("Malformed");
    });

    it("masks raw internal exception messages in production mode to prevent information disclosure", async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";

        const api = createApi({
          "routes/failing.ts": {
            get: query({
              resolve: () => {
                throw new Error("Secret database credentials leak in PostgreSQL error");
              }
            })
          }
        });

        const res = await api.fetch(new Request("http://localhost/failing"));
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error.message).toBe("Internal Server Error");
        expect(body.error.message).not.toContain("Secret database credentials");
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it("blocks unauthorized cross-site and cross-origin form submissions with anti-CSRF protection", async () => {
      const api = createApi({
        "routes/account.ts": {
          post: mutation({
            resolve: () => ({ deleted: true })
          })
        }
      });

      // 1. Cross-site request without custom header
      const crossSiteReq = new Request("http://localhost/account", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Sec-Fetch-Site": "cross-site"
        },
        body: "confirm=true"
      });
      const res1 = await api.fetch(crossSiteReq);
      expect(res1.status).toBe(403);
      const body1 = await res1.json();
      expect(body1.error.code).toBe("FORBIDDEN");
      expect(body1.error.message).toContain("CSRF");

      // 2. Cross-origin form submission from another host without custom header
      const crossOriginFormReq = new Request("http://victim.com/account", {
        method: "POST",
        headers: {
          Host: "victim.com",
          Origin: "https://evil-attacker.com",
          "Content-Type": "multipart/form-data; boundary=----boundary"
        },
        body: '------boundary\r\nContent-Disposition: form-data; name="confirm"\r\n\r\ntrue\r\n------boundary--\r\n'
      });
      const res2 = await api.fetch(crossOriginFormReq);
      expect(res2.status).toBe(403);

      // 3. Legitimate mutation with custom x-visage-api header is allowed
      const legitReq = new Request("http://victim.com/account", {
        method: "POST",
        headers: {
          Host: "victim.com",
          "Content-Type": "application/json",
          "x-visage-api": "1"
        },
        body: JSON.stringify({})
      });
      const res3 = await api.fetch(legitReq);
      expect(res3.status).toBe(200);
      const body3 = await res3.json();
      expect(body3.data.deleted).toBe(true);
    });

    it("enforces maxBodySize limit and returns 413 Payload Too Large when exceeded", async () => {
      const api = createApi(
        {
          "routes/upload.ts": {
            post: mutation({
              resolve: () => ({ success: true })
            })
          }
        },
        {},
        {
          maxBodySize: 100 // 100 bytes limit
        }
      );

      // Oversized request (200 bytes Content-Length)
      const oversizedReq = new Request("http://localhost/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "200",
          "x-visage-api": "1"
        },
        body: JSON.stringify({ data: "x".repeat(150) })
      });

      const res = await api.fetch(oversizedReq);
      expect(res.status).toBe(413);
      const body = await res.json();
      expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
      expect(body.error.message).toContain("exceeds limit");
    });

    it("emits SSE keep-alive heartbeat pings and cleans up timers on stream close", async () => {
      const api = createApi(
        {
          "routes/ticker.ts": {
            default: subscription({
              resolve: async function* () {
                yield { msg: "start" };
                // Wait longer than heartbeat interval
                await new Promise((resolve) => setTimeout(resolve, 60));
                yield { msg: "end" };
              }
            })
          }
        },
        {},
        {
          heartbeatInterval: 25 // 25ms heartbeat
        }
      );

      const res = await api.fetch(new Request("http://localhost/ticker"));
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value);
      }

      expect(text).toContain('data: {"msg":"start"}');
      expect(text).toContain(": ping\n\n");
      expect(text).toContain('data: {"msg":"end"}');
    });

    it("blocks prototype pollution attempts in query search params and path parameters", async () => {
      const api = createApi({
        "routes/echo.ts": {
          get: query({
            resolve: ({ input }: any) => ({ ...input })
          })
        }
      });

      // Pass __proto__ and constructor in query string
      const res = await api.fetch(
        new Request("http://localhost/echo?__proto__[polluted]=true&constructor=evil&valid=ok")
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.valid).toBe("ok");
      expect(Object.hasOwn(body.data, "__proto__")).toBe(false);
      expect(Object.hasOwn(body.data, "constructor")).toBe(false);
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });
});
