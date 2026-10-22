import { beforeEach, describe, expect, it } from "bun:test";
import { createMutation, createQuery, QueryClient } from "../src/query";
import { createClient, createFetchHandler, createRouter, RPCError, v } from "../src/rpc";
import { createRoot } from "../src/signals";
import { setupDOM } from "./dom-mock";

describe("Visage Type-Safe RPC & Full-Stack Wire Protocol (visage/rpc)", () => {
  beforeEach(() => {
    setupDOM();
  });

  // 1. Define Server Router
  const postsRouter = createRouter()
    .query("getById", {
      input: v.object({ id: v.number() }),
      resolve: async ({ input }) => {
        return { id: input.id, title: `Post #${input.id}`, author: "Grace" };
      }
    })
    .mutation("create", {
      input: v.object({ title: v.string().min(3), content: v.string() }),
      resolve: async ({ input, ctx }) => {
        return {
          id: 101,
          title: input.title,
          content: input.content,
          createdBy: ctx.userId ?? "anon"
        };
      }
    });

  const appRouter = createRouter()
    .use(async ({ ctx, next }) => {
      // Middleware adds request timestamp
      return next({
        ctx: { ...ctx, processedAt: 123456 }
      });
    })
    .query("greeting", {
      input: v.object({ name: v.string() }),
      resolve: async ({ input, ctx }) => {
        return { message: `Hello, ${input.name}!`, userRole: ctx.userRole ?? "guest" };
      }
    })
    .query("secretData", {
      resolve: async ({ ctx }) => {
        if (!ctx.userId) {
          throw new RPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
        }
        return { secret: "top-secret-value" };
      }
    })
    .subscription("countdown", {
      input: v.object({ from: v.number() }),
      resolve: async function* ({ input }) {
        for (let i = input.from; i >= 0; i--) {
          yield { count: i };
        }
      }
    })
    .merge("posts", postsRouter);

  type AppRouter = typeof appRouter;

  it("handles queries and mutations via standard Web Request and Response", async () => {
    const handler = createFetchHandler({
      router: appRouter,
      endpoint: "/api/rpc",
      createContext: async () => ({
        userId: "user-42",
        userRole: "admin"
      })
    });

    // 1. Test GET query
    const getReq = new Request(
      "http://localhost/api/rpc/greeting?input=" +
        encodeURIComponent(JSON.stringify({ name: "Visage" })),
      { method: "GET" }
    );
    const getRes = await handler(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.result.data).toEqual({
      message: "Hello, Visage!",
      userRole: "admin"
    });

    // 2. Test POST query on nested router
    const postQueryReq = new Request("http://localhost/api/rpc/posts.getById", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { id: 7 } })
    });
    const postQueryRes = await handler(postQueryReq);
    expect(postQueryRes.status).toBe(200);
    const postQueryData = await postQueryRes.json();
    expect(postQueryData.result.data).toEqual({
      id: 7,
      title: "Post #7",
      author: "Grace"
    });

    // 3. Test POST mutation
    const mutationReq = new Request("http://localhost/api/rpc/posts.create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { title: "New Feature", content: "Zero-VDOM RPC" } })
    });
    const mutationRes = await handler(mutationReq);
    expect(mutationRes.status).toBe(200);
    const mutationData = await mutationRes.json();
    expect(mutationData.result.data).toEqual({
      id: 101,
      title: "New Feature",
      content: "Zero-VDOM RPC",
      createdBy: "user-42"
    });
  });

  it("validates input schemas and returns HTTP 400 on invalid input", async () => {
    const handler = createFetchHandler({
      router: appRouter,
      endpoint: "/api/rpc"
    });

    // Title is less than min(3)
    const invalidReq = new Request("http://localhost/api/rpc/posts.create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { title: "a", content: "test" } })
    });
    const res = await handler(invalidReq);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.issues).not.toBeNull();
  });

  it("handles custom errors and HTTP status codes (401 Unauthorized)", async () => {
    const handler = createFetchHandler({
      router: appRouter,
      endpoint: "/api/rpc",
      createContext: () => ({}) // No userId -> unauthenticated
    });

    const req = new Request("http://localhost/api/rpc/secretData", {
      method: "GET"
    });
    const res = await handler(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toBe("Authentication required");
  });

  it("supports batch request execution in a single HTTP call", async () => {
    const handler = createFetchHandler({
      router: appRouter,
      endpoint: "/api/rpc"
    });

    const batchReq = new Request("http://localhost/api/rpc/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { id: 1, path: "greeting", input: { name: "Batch 1" } },
        { id: 2, path: "posts.getById", input: { id: 99 } },
        { id: 3, path: "posts.create", input: { title: "x", content: "too short" } } // Should fail with 400
      ])
    });

    const res = await handler(batchReq);
    expect(res.status).toBe(200);

    const results = await res.json();
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({
      id: 1,
      result: { data: { message: "Hello, Batch 1!", userRole: "guest" } }
    });
    expect(results[1]).toEqual({
      id: 2,
      result: { data: { id: 99, title: "Post #99", author: "Grace" } }
    });
    expect(results[2].error.code).toBe("BAD_REQUEST");
  });

  it("handles CORS preflight and custom headers", async () => {
    const handler = createFetchHandler({
      router: appRouter,
      endpoint: "/api/rpc",
      cors: {
        origin: "https://my-app.com",
        credentials: true
      }
    });

    const preflight = new Request("http://localhost/api/rpc/greeting", {
      method: "OPTIONS",
      headers: {
        Origin: "https://my-app.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type, authorization, x-visage-rpc"
      }
    });

    const res = await handler(preflight);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://my-app.com");
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain(
      "content-type, authorization, x-visage-rpc"
    );
    expect(res.headers.get("Vary")).toContain("Origin");

    // Unauthorized origin
    const evilReq = new Request("http://localhost/api/rpc/greeting", {
      method: "POST",
      headers: {
        Origin: "https://evil-attacker.com",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: "Attacker" })
    });
    const evilRes = await handler(evilReq);
    expect(evilRes.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(evilRes.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });

  it("integrates seamlessly with Hono-style sub-routing and context passing", async () => {
    // Simulated Hono context
    const honoContextMock = {
      get: (key: string) => (key === "auth" ? { user: "HonoUser", role: "maintainer" } : null),
      req: {
        raw: new Request(
          "http://localhost/api/rpc/greeting?input=" +
            encodeURIComponent(JSON.stringify({ name: "Hono" }))
        )
      }
    };

    const handler = createFetchHandler({
      router: appRouter,
      endpoint: "/api/rpc",
      createContext: (_opts) => {
        const auth = honoContextMock.get("auth");
        return {
          userId: auth?.user,
          userRole: auth?.role
        };
      }
    });

    // Mount handler in Hono: app.all('/api/rpc/*', (c) => handler(c.req.raw, c))
    const res = await handler(honoContextMock.req.raw, honoContextMock);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.result.data.message).toBe("Hello, Hono!");
    expect(data.result.data.userRole).toBe("maintainer");
  });

  it("executes end-to-end typed client calls via createClient proxy", async () => {
    const handler = createFetchHandler({
      router: appRouter,
      endpoint: "/api/rpc",
      createContext: () => ({ userId: "ClientUser" })
    });

    // Custom mock fetch that directly invokes the server handler
    const mockFetch = (url: string | URL | Request, init?: RequestInit) => {
      const req = new Request(url, init);
      return handler(req);
    };

    const client = createClient<AppRouter>({
      baseUrl: "http://localhost/api/rpc",
      fetch: mockFetch as any
    });

    // 1. Direct query call
    const greeting = await client.greeting.query({ name: "ProxyClient" });
    expect(greeting.message).toBe("Hello, ProxyClient!");

    // 2. Nested router query call
    const post = await client.posts.getById.query({ id: 42 });
    expect(post).toEqual({ id: 42, title: "Post #42", author: "Grace" });

    // 3. Mutation call
    const created = await client.posts.create.mutate({
      title: "New Post Title",
      content: "Created via Proxy Client"
    });
    expect(created.id).toBe(101);
    expect(created.createdBy).toBe("ClientUser");
  });

  it("integrates createClient with visage/query (createQuery & createMutation)", async () => {
    const handler = createFetchHandler({
      router: appRouter,
      endpoint: "/api/rpc"
    });

    const mockFetch = (url: string | URL | Request, init?: RequestInit) => {
      const req = new Request(url, init);
      return handler(req);
    };

    const client = createClient<AppRouter>({
      baseUrl: "http://localhost/api/rpc",
      fetch: mockFetch as any
    });

    const queryClient = new QueryClient();

    // 1. queryOptions + createQuery integration
    const query = createRoot(() =>
      createQuery(client.posts.getById.queryOptions({ id: 10 }), queryClient)
    );

    expect(query.isLoading()).toBe(true);
    await new Promise((r) => setTimeout(r, 15));

    expect(query.isSuccess()).toBe(true);
    expect(query.data()).toEqual({ id: 10, title: "Post #10", author: "Grace" });

    // 2. mutationOptions + createMutation integration
    const mutation = createRoot(() =>
      createMutation(client.posts.create.mutationOptions(), queryClient)
    );

    const created = await mutation.mutateAsync({
      title: "Visage Signal Post",
      content: "Fine-grained signals everywhere"
    });

    expect(created.title).toBe("Visage Signal Post");
    expect(mutation.isSuccess()).toBe(true);
  });

  it("supports direct streamlined RPC client proxy methods (client.procedure.createQuery & client.procedure.createMutation)", async () => {
    const handler = createFetchHandler({
      router: appRouter,
      endpoint: "/api/rpc"
    });

    const mockFetch = (url: string | URL | Request, init?: RequestInit) => {
      const req = new Request(url, init);
      return handler(req);
    };

    const client = createClient<AppRouter>({
      baseUrl: "http://localhost/api/rpc",
      fetch: mockFetch as any
    });

    // 1. Direct rpc.createQuery with static input
    const query = createRoot(() => client.posts.getById.createQuery({ id: 25 }));
    expect(query.isLoading()).toBe(true);
    await new Promise((r) => setTimeout(r, 15));
    expect(query.isSuccess()).toBe(true);
    expect(query.data()).toEqual({ id: 25, title: "Post #25", author: "Grace" });

    // 2. Direct rpc.useQuery alias
    const queryAlias = createRoot(() => client.posts.getById.useQuery({ id: 30 }));
    await new Promise((r) => setTimeout(r, 15));
    expect(queryAlias.data()).toEqual({ id: 30, title: "Post #30", author: "Grace" });

    // 3. Direct rpc.createMutation
    const createPost = createRoot(() => client.posts.create.createMutation());
    const res = await createPost.mutateAsync({
      title: "Direct Mutation Post",
      content: "No extra boilerplate needed"
    });
    expect(res.title).toBe("Direct Mutation Post");
    expect(createPost.isSuccess()).toBe(true);

    // 4. Direct rpc.useMutation alias
    const usePost = createRoot(() => client.posts.create.useMutation());
    const res2 = await usePost.mutateAsync({
      title: "Direct useMutation Post",
      content: "Works seamlessly"
    });
    expect(res2.title).toBe("Direct useMutation Post");
  });

  it("enforces declarative route rules on createFetchHandler", async () => {
    const handler = createFetchHandler({
      router: appRouter,
      endpoint: "/api/rpc",
      rules: {
        // Global rule
        "*": {
          headers: { "X-Server-Engine": "Visage-RPC" }
        },
        // Admin group rule
        secretData: {
          requireHeaders: ["x-admin-token"],
          headers: { "Cache-Control": "no-store, private" }
        },
        // Posts group rule with custom guard
        "posts.*": {
          headers: { "X-Scope": "posts-api" },
          guard: ({ req }) => {
            if (req.headers.get("x-blocked") === "true") return false;
          }
        }
      },
      createContext: async () => ({ userId: "test-user" })
    });

    // 1. Test global response header injection on public route
    const res1 = await handler(
      new Request(
        "http://localhost/api/rpc/greeting?input=" +
          encodeURIComponent(JSON.stringify({ name: "Alice" }))
      )
    );
    expect(res1.status).toBe(200);
    expect(res1.headers.get("X-Server-Engine")).toBe("Visage-RPC");

    // 2. Test requireHeaders rejection when missing
    const res2 = await handler(new Request("http://localhost/api/rpc/secretData"));
    expect(res2.status).toBe(401);
    const body2 = await res2.json();
    expect(body2.error.message).toContain("Missing required header 'x-admin-token'");

    // 3. Test requireHeaders success when provided + custom response header
    const res3 = await handler(
      new Request("http://localhost/api/rpc/secretData", {
        headers: { "x-admin-token": "secret-token-123" }
      })
    );
    expect(res3.status).toBe(200);
    expect(res3.headers.get("Cache-Control")).toBe("no-store, private");
    expect(res3.headers.get("X-Server-Engine")).toBe("Visage-RPC");

    // 4. Test guard function rejecting request
    const res4 = await handler(
      new Request(
        "http://localhost/api/rpc/posts.getById?input=" +
          encodeURIComponent(JSON.stringify({ id: 1 })),
        {
          headers: { "x-blocked": "true" }
        }
      )
    );
    expect(res4.status).toBe(401);
  });

  it("supports pattern-based client headers in createClient", async () => {
    let capturedHeaders: Record<string, string> = {};

    const mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = Object.fromEntries(new Headers(init?.headers).entries());
      return new Response(JSON.stringify({ result: { data: { success: true } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const client = createClient<AppRouter>({
      baseUrl: "http://localhost/api/rpc",
      fetch: mockFetch as any,
      headers: {
        "*": { "x-app-id": "web-client" },
        "posts.*": () => ({ "x-posts-auth": "bearer-123" })
      }
    });

    // 1. Querying greeting should only send global "*" headers
    await client.greeting.query({ name: "Bob" });
    expect(capturedHeaders["x-app-id"]).toBe("web-client");
    expect(capturedHeaders["x-posts-auth"]).toBe(undefined);

    // 2. Querying posts.getById should send both "*" and "posts.*" headers
    await client.posts.getById.query({ id: 99 });
    expect(capturedHeaders["x-app-id"]).toBe("web-client");
    expect(capturedHeaders["x-posts-auth"]).toBe("bearer-123");
  });

  it("handles RFC 9110 / RFC 9111 caching and 304 revalidation on RPC query procedures", async () => {
    const cachedRouter = createRouter().query("stats", {
      cache: { public: true, maxAge: 0, sMaxAge: 600, mustRevalidate: true },
      resolve: () => ({ activeUsers: 42, cpuLoad: 0.15 })
    });

    const handler = createFetchHandler({ router: cachedRouter, endpoint: "/api/rpc" });

    // 1. Initial query over GET
    const req1 = new Request("http://localhost/api/rpc/stats", { method: "GET" });
    const res1 = await handler(req1);
    expect(res1.status).toBe(200);

    const etag = res1.headers.get("etag");
    expect(etag).not.toBeNull();
    expect(etag?.startsWith('W/"')).toBe(true);

    const cacheControl = res1.headers.get("cache-control");
    expect(cacheControl).toContain("s-maxage=600");

    // 2. Revalidation with If-None-Match
    const req2 = new Request("http://localhost/api/rpc/stats", {
      method: "GET",
      headers: { "if-none-match": etag! }
    });
    const res2 = await handler(req2);
    expect(res2.status).toBe(304);
    expect(res2.statusText).toBe("Not Modified");
    expect(res2.headers.get("etag")).toBe(etag);
    expect(await res2.text()).toBe("");
  });

  it("supports multipart/form-data and binary file uploads via RPC mutations", async () => {
    const uploadRouter = createRouter()
      .mutation("uploadRaw", {
        input: v.formData(),
        resolve: async ({ input }) => {
          const file = input.get("bundle") as File;
          const site = input.get("siteId") as string;
          return {
            fileName: file.name,
            fileSize: file.size,
            site
          };
        }
      })
      .mutation("deploySite", {
        input: v.object({
          siteId: v.string(),
          archive: v.file({ maxSize: 1024 * 1024 })
        }),
        resolve: async ({ input }) => {
          return {
            deployed: true,
            siteId: input.siteId,
            archiveName: input.archive.name,
            bytes: input.archive.size
          };
        }
      });

    const handler = createFetchHandler({ router: uploadRouter, endpoint: "/api/rpc" });
    const client = createClient<typeof uploadRouter>({
      baseUrl: "http://localhost/api/rpc",
      fetch: (url, init) => handler(new Request(url, init))
    });

    // 1. Direct FormData mutation
    const fd = new FormData();
    const mockFile = new File(["console.log('hello')"], "index.js", { type: "text/javascript" });
    fd.append("siteId", "blog-app");
    fd.append("bundle", mockFile);

    const res1 = await client.uploadRaw.mutate(fd);
    expect(res1.fileName).toBe("index.js");
    expect(res1.site).toBe("blog-app");

    // 2. Object with File payload auto-marshaled into FormData
    const zipFile = new File(["<html/>"], "site.zip", { type: "application/zip" });
    const res2 = await client.deploySite.mutate({
      siteId: "my-site",
      archive: zipFile
    });
    expect(res2.deployed).toBe(true);
    expect(res2.siteId).toBe("my-site");
    expect(res2.archiveName).toBe("site.zip");
  });
});
