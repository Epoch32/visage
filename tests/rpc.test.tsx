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
        "Access-Control-Request-Method": "POST"
      }
    });

    const res = await handler(preflight);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://my-app.com");
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
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

    // 1. createQuery integration
    const query = createRoot(() =>
      createQuery(client.posts.getById.queryOptions({ id: 10 }), queryClient)
    );

    expect(query.isLoading()).toBe(true);
    await new Promise((r) => setTimeout(r, 15));

    expect(query.isSuccess()).toBe(true);
    expect(query.data()).toEqual({ id: 10, title: "Post #10", author: "Grace" });

    // 2. createMutation integration
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

  it("streams Server-Sent Events (SSE) via subscription", async () => {
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

    const received: number[] = [];
    let isCompleted = false;

    await new Promise<void>((resolve) => {
      const sub = client.countdown.subscribe(
        { from: 3 },
        {
          onData: (data) => {
            received.push(data.count);
          },
          onComplete: () => {
            isCompleted = true;
            resolve();
          }
        }
      );
      expect(typeof sub.unsubscribe).toBe("function");
    });

    expect(received).toEqual([3, 2, 1, 0]);
    expect(isCompleted).toBe(true);
  });
});
