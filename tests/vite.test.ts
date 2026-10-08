import { describe, expect, it } from "bun:test";
import { createRouter, v } from "../src/rpc";
import { visage } from "../src/vite";

describe("Visage Vite Plugin (visage/vite)", () => {
  it("generates the standard plugin pipeline with config, transform, and server hooks", () => {
    const plugins = visage();
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins.length).toBe(3);

    const names = plugins.map((p) => p.name);
    expect(names).toContain("visage:config");
    expect(names).toContain("visage:transform");
    expect(names).toContain("visage:server");
  });

  it("configures esbuild for automatic Visage JSX runtime and dependencies deduplication", () => {
    const [configPlugin] = visage();
    expect(configPlugin?.config).not.toBeNull();

    const config = configPlugin!.config!({}, { command: "serve", mode: "development" });
    expect(config.esbuild?.jsx).toBe("automatic");
    expect(config.esbuild?.jsxImportSource).toBe("visage");
    expect(config.esbuild?.jsxDev).toBe(true);
    expect(config.optimizeDeps?.include).toContain("visage");
    expect(config.optimizeDeps?.include).toContain("visage/signals");
    expect(config.optimizeDeps?.include).toContain("visage/dom");
    expect(config.resolve?.dedupe).toContain("visage");
  });

  it("transforms JSX/TSX components to append HMR boundaries in development", () => {
    const [, transformPlugin] = visage({ hmr: true });
    expect(transformPlugin?.transform).not.toBeNull();

    const sourceCode = `
      import { signal } from "visage/signals";
      export function Counter() {
        const count = signal(0);
        return <button onClick={() => count.update(c => c + 1)}>Count: {count}</button>;
      }
    `;

    const result = (transformPlugin as any).transform(sourceCode, "/src/components/Counter.tsx");
    expect(result).not.toBeNull();
    expect(result?.code).toContain("/* @visage/vite-hmr */");
    expect(result?.code).toContain("import.meta.hot.accept");

    // Does not transform non-JSX files or node_modules
    const jsResult = (transformPlugin as any).transform(sourceCode, "/src/utils.ts");
    expect(jsResult).toBeNull();

    const vendorResult = (transformPlugin as any).transform(
      sourceCode,
      "/node_modules/pkg/Component.tsx"
    );
    expect(vendorResult).toBeNull();
  });

  it("injects devtools metadata into HTML shell in development", () => {
    const [, , serverPlugin] = visage({ devtools: true });
    expect(serverPlugin?.transformIndexHtml).not.toBeNull();

    const inputHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Visage App</title>
        </head>
        <body><div id="root"></div></body>
      </html>
    `;

    const outputHtml = serverPlugin!.transformIndexHtml!(inputHtml);
    expect(outputHtml).toContain('<meta name="visage-devtools" content="enabled" />');
  });

  it("attaches full-stack RPC middleware into Vite dev server when configured", async () => {
    const testRouter = createRouter().query("getGreeting", {
      input: v.object({ name: v.string() }),
      resolve: async ({ input }) => ({ message: `Hello, ${input.name}!` })
    });

    const [, , serverPlugin] = visage({
      rpc: {
        router: testRouter,
        endpoint: "/api/rpc"
      }
    });

    let registeredMiddleware: any = null;
    const mockServer = {
      middlewares: {
        use: (fn: any) => {
          registeredMiddleware = fn;
        }
      }
    };

    serverPlugin!.configureServer!(mockServer);
    expect(registeredMiddleware).not.toBeNull();

    // Test simulated request through Connect middleware
    const mockReq = {
      url: "/api/rpc/getGreeting",
      method: "POST",
      headers: { host: "localhost:5173" },
      async *[Symbol.asyncIterator]() {
        yield JSON.stringify({ name: "Visage Developer" });
      }
    };

    let responseStatus = 0;
    const responseHeaders: Record<string, string> = {};
    let responseBody = "";

    const mockRes = {
      set statusCode(val: number) {
        responseStatus = val;
      },
      setHeader(k: string, v: string) {
        responseHeaders[k.toLowerCase()] = v;
      },
      write(chunk: any) {
        responseBody += chunk.toString();
      },
      end(chunk?: any) {
        if (chunk) responseBody += chunk.toString();
      }
    };

    let nextCalled = false;
    await registeredMiddleware(mockReq, mockRes, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(responseStatus).toBe(200);
    expect(responseHeaders["content-type"]).toContain("application/json");
    expect(JSON.parse(responseBody)).toEqual({
      result: { data: { message: "Hello, Visage Developer!" } }
    });
  });
});
