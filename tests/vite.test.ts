import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import { createRouter, v } from "../src/rpc";
import { visage, visageLucide } from "../src/vite";
import { createViteRpcMiddleware } from "../src/vite/rpc-middleware";

describe("Visage Vite Plugin (visage/vite)", () => {
  it("generates the standard plugin pipeline with config, transform, and server hooks", () => {
    const plugins = visage();
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins.length).toBe(7);

    const names = plugins.map((p) => p.name);
    expect(names).toContain("visage:config");
    expect(names).toContain("visage:lucide");
    expect(names).toContain("visage:compiler");
    expect(names).toContain("visage:storage-preboot");
    expect(names).toContain("visage:headers");
    expect(names).toContain("visage:transform");
    expect(names).toContain("visage:server");
  });

  it("configures oxc for automatic Visage JSX runtime and dependencies deduplication", () => {
    const configPlugin = visage().find((p) => p.name === "visage:config");
    expect(configPlugin?.config).not.toBeNull();

    const config = configPlugin!.config!({}, { command: "serve", mode: "development" });
    expect(config.esbuild).toBeUndefined();
    expect(config.oxc?.jsx?.runtime).toBe("automatic");
    expect(config.oxc?.jsx?.importSource).toBe("visage");
    expect(config.oxc?.jsx?.development).toBe(true);
    expect(config.optimizeDeps?.exclude).toContain("visage");
    expect(config.optimizeDeps?.exclude).toContain("visage/signals");
    expect(config.optimizeDeps?.exclude).toContain("visage/dom");
    expect(config.resolve?.dedupe).toContain("visage");
  });

  it("transforms JSX/TSX components to append HMR boundaries in development", () => {
    const transformPlugin = visage({ hmr: true }).find((p) => p.name === "visage:transform");
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

    // Transforms JSX files even when query parameters are present on id
    const queryResult = (transformPlugin as any).transform(
      sourceCode,
      "/src/components/Counter.tsx?import"
    );
    expect(queryResult).not.toBeNull();
    expect(queryResult?.code).toContain("/* @visage/vite-hmr */");

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
    const serverPlugin = visage({ devtools: true }).find((p) => p.name === "visage:server");
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

    const serverPlugin = visage({
      rpc: {
        router: testRouter,
        endpoint: "/api/rpc"
      }
    }).find((p) => p.name === "visage:server");

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

  it("translates lucide-react imports into native Visage icon modules via visageLucide()", () => {
    const plugin = visageLucide({
      aliases: ["lucide-react", "my-icons"]
    });

    expect(plugin.name).toBe("visage:lucide");

    const sampleCode = `
import { Check, ArrowRight as NextArrow, Trash2 } from "lucide-react";
import { Heart } from "my-icons";

export function Component() {
  return <div><Check /></div>;
}
    `.trim();

    const result: any = plugin.transform!(sampleCode, "/app/src/Button.tsx");
    expect(result).not.toBeNull();
    expect(result.code).toContain(
      'import { Check, ArrowRight as NextArrow, Trash2 } from "virtual:visage-icons?icons=Check,ArrowRight,Trash2";'
    );
    expect(result.code).toContain('import { Heart } from "virtual:visage-icons?icons=Heart";');

    // Test re-exports
    const exportCode = `export { Check, ArrowRight as NextArrow } from "lucide-react";`;
    const exportResult: any = plugin.transform!(exportCode, "/app/src/Icons.ts");
    expect(exportResult).not.toBeNull();
    expect(exportResult.code).toBe(
      `export { Check, ArrowRight as NextArrow } from "virtual:visage-icons?icons=Check,ArrowRight";`
    );

    // Test virtual module load
    const resolvedId = plugin.resolveId!("virtual:visage-icons?icons=Check,ArrowRight");
    expect(resolvedId).toBe("\0virtual:visage-icons?icons=Check,ArrowRight");

    const loadedModule: any = plugin.load!(resolvedId as string);
    expect(loadedModule).toContain('import { createIcon } from "visage/ui";');
    expect(loadedModule).toContain(
      'import { Check as __icon_node_Check, ArrowRight as __icon_node_ArrowRight } from "lucide";'
    );
    expect(loadedModule).toContain(
      'export const Check = /* @__PURE__ */ createIcon("Check", __icon_node_Check);'
    );
    expect(loadedModule).toContain(
      'export const ArrowRight = /* @__PURE__ */ createIcon("ArrowRight", __icon_node_ArrowRight);'
    );

    // Unrelated code should not transform
    const noMatch = plugin.transform!("console.log('hello');", "/app/src/index.ts");
    expect(noMatch).toBeNull();
  });

  it("handles raw 'lucide' imports by default in visageLucide()", () => {
    const defaultPlugin = visageLucide();

    const sample = `import { Trash2 } from "lucide";`;
    const res: any = defaultPlugin.transform!(sample, "/app/src/Panel.tsx");
    expect(res).not.toBeNull();
    expect(res.code).toBe('import { Trash2 } from "virtual:visage-icons?icons=Trash2";');

    // Internal lucide resolution inside virtual module should not be intercepted
    const internalResolve = defaultPlugin.resolveId!(
      "lucide",
      "\0virtual:visage-icons?icons=Trash2"
    );
    expect(internalResolve).toBeNull();
  });

  it("includes Lucide icon translation directly in visage() plugin by default", () => {
    const plugins = visage();
    const lucidePlugin = plugins.find((p) => p.name === "visage:lucide");
    expect(lucidePlugin).toBeDefined();

    const sample = `import { Settings } from "lucide-react";`;
    const res: any = lucidePlugin!.transform!(sample, "/app/src/Nav.tsx");
    expect(res).not.toBeNull();
    expect(res.code).toBe('import { Settings } from "virtual:visage-icons?icons=Settings";');

    // Does not log any deprecation warning
    const warnings: string[] = [];
    const mockLogger = {
      warn: (msg: string) => warnings.push(msg),
      info: () => {},
      error: () => {}
    };
    lucidePlugin!.configResolved?.({ logger: mockLogger });
    lucidePlugin!.buildStart?.();
    expect(warnings.length).toBe(0);
  });

  it("allows disabling Lucide icon translation via visage({ lucide: false })", () => {
    const plugins = visage({ lucide: false });
    const lucidePlugin = plugins.find((p) => p.name === "visage:lucide");
    expect(lucidePlugin).toBeUndefined();
  });

  it("logs a deprecation warning in the logging output of visageLucide()", () => {
    const plugin = visageLucide();
    const warnings: string[] = [];
    const mockLogger = {
      warn: (msg: string) => warnings.push(msg),
      info: () => {},
      error: () => {}
    };

    plugin.configResolved?.({ logger: mockLogger });
    plugin.buildStart?.();

    expect(warnings.length > 0).toBe(true);
    expect(warnings[0]).toContain("visageLucide() is deprecated in Version 2");
    expect(warnings[0]).toContain("will be fully removed in Version 3");
    expect(warnings[0]).toContain("built directly into the main visage() plugin");
  });

  it("activates the AOT template compiler and safe AST transforms by default", () => {
    const plugins = visage();
    const compilerPlugin = plugins.find((p) => p.name === "visage:compiler");
    expect(compilerPlugin).toBeDefined();

    const sample = `export function Box() { return <div class="box"><span>Hello</span></div>; }`;
    const res: any = compilerPlugin!.transform!(sample, "/app/src/Box.tsx");
    expect(res).not.toBeNull();
    expect(res.code).toContain("_tmpl$");
  });

  it("throws and halts the build on security errors during transformation", () => {
    const plugins = visage({ compiler: { security: true } });
    const compilerPlugin = plugins.find((p) => p.name === "visage:compiler");
    expect(compilerPlugin).toBeDefined();

    let pluginErrorCalled = false;
    const mockContext = {
      error() {
        pluginErrorCalled = true;
      }
    };

    const maliciousSample = `export function Attack() { return <a href="javascript:alert(1)">Click</a>; }`;
    expect(() => {
      (compilerPlugin!.transform as any).call(mockContext, maliciousSample, "/app/src/Attack.tsx");
    }).toThrow(/\[visage:security\] Blocked dangerous URI protocol/);

    expect(pluginErrorCalled).toBe(true);
  });

  it("allows disabling the AOT compiler via visage({ compiler: false })", () => {
    const plugins = visage({ compiler: false });
    const compilerPlugin = plugins.find((p) => p.name === "visage:compiler");
    expect(compilerPlugin).toBeUndefined();
    expect(plugins.length).toBe(6);
  });

  it("activates storage preboot by default in visage() plugin", () => {
    const plugins = visage();
    const prebootPlugin = plugins.find((p) => p.name === "visage:storage-preboot");
    expect(prebootPlugin).toBeDefined();
  });

  it("allows disabling storage preboot via visage({ storagePreboot: false })", () => {
    const plugins = visage({ storagePreboot: false });
    const prebootPlugin = plugins.find((p) => p.name === "visage:storage-preboot");
    expect(prebootPlugin).toBeUndefined();
    expect(plugins.length).toBe(6);
  });

  it("activates headers plugin by default in visage() plugin", () => {
    const plugins = visage();
    const headersPlugin = plugins.find((p) => p.name === "visage:headers");
    expect(headersPlugin).toBeDefined();
  });

  it("allows disabling headers plugin via visage({ headers: false })", () => {
    const plugins = visage({ headers: false });
    const headersPlugin = plugins.find((p) => p.name === "visage:headers");
    expect(headersPlugin).toBeUndefined();
    expect(plugins.length).toBe(6);
  });

  describe("Native Desktop Host Options", () => {
    it("keeps native desktop compiler features completely dormant by default", () => {
      const plugins = visage();
      const [configPlugin] = plugins;

      const config = configPlugin!.config!({}, { command: "build", mode: "production" });
      expect(config.base).toBeUndefined();

      const pluginNames = plugins.map((p) => p.name);
      expect(pluginNames).not.toContain("visage:native");
    });

    it("activates relative base path and native plugin when top-level native is explicitly enabled", () => {
      const plugins = visage({
        native: {
          title: "Custom Desktop Title",
          scaffold: false
        }
      });

      const [configPlugin] = plugins;
      const config = configPlugin!.config!({}, { command: "build", mode: "production" });
      expect(config.base).toBe("./");
      expect(config.optimizeDeps?.exclude).toContain("visage/native");

      const nativePlugin = plugins.find((p) => p.name === "visage:native");
      expect(nativePlugin).toBeDefined();
    });

    it("supports legacy experimental.zigNative option for backwards compatibility", () => {
      const plugins = visage({
        experimental: {
          zigNative: {
            title: "Legacy Desktop Title",
            scaffold: false
          }
        }
      });

      const [configPlugin] = plugins;
      const config = configPlugin!.config!({}, { command: "build", mode: "production" });
      expect(config.base).toBe("./");
      expect(config.optimizeDeps?.exclude).toContain("visage/native");

      const nativePlugin = plugins.find((p) => p.name === "visage:native");
      expect(nativePlugin).toBeDefined();
    });
  });

  describe("Compiler Diagnostics & Build Summary", () => {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: strip ANSI escape codes in test assertion
    const stripAnsi = (str: string) => str.replace(/\u001b\[[0-9;]*m/g, "");

    it("logs per-file transform diagnostics when verbose is enabled", () => {
      const logs: string[] = [];
      const mockLogger = {
        info: (msg: string) => logs.push(msg),
        warn: () => {},
        error: () => {},
        debug: () => {}
      };

      const plugins = visage({ verbose: true });
      const compilerPlugin = plugins.find((p) => p.name === "visage:compiler");
      expect(compilerPlugin).toBeDefined();

      compilerPlugin!.configResolved?.({ root: "/app", command: "build", logger: mockLogger });
      compilerPlugin!.buildStart?.();

      const sample = `export function Nav() { return <nav><button onClick={handleClick}>Menu</button></nav>; }`;
      const res: any = compilerPlugin!.transform!(sample, "/app/src/Nav.tsx");
      expect(res).not.toBeNull();

      const verboseLog = logs.find((l) => l.includes("Transformed") && l.includes("Nav.tsx"));
      expect(verboseLog).toBeDefined();
      const cleanVerbose = stripAnsi(verboseLog!);
      expect(cleanVerbose).toContain("1 template");
      expect(cleanVerbose).toContain("events: [click]");
    });

    it("prints build summary dashboard on closeBundle() after transforming modules", () => {
      const logs: string[] = [];
      const mockLogger = {
        info: (msg: string) => logs.push(msg),
        warn: () => {},
        error: () => {},
        debug: () => {}
      };

      const plugins = visage({ verbose: false });
      const compilerPlugin = plugins.find((p) => p.name === "visage:compiler");
      expect(compilerPlugin).toBeDefined();

      compilerPlugin!.configResolved?.({ root: "/app", command: "build", logger: mockLogger });
      compilerPlugin!.buildStart?.();

      const sample = `export function Box() { return <a href="https://example.com" onClick={go}><span>Link</span></a>; }`;
      compilerPlugin!.transform!(sample, "/app/src/Box.tsx");

      compilerPlugin!.closeBundle?.();

      const summaryLog = logs.find((l) => l.includes("AOT JSX Compiler Build Summary"));
      expect(summaryLog).toBeDefined();
      const cleanSummary = stripAnsi(summaryLog!);
      expect(cleanSummary).toContain("Transformed:      1 modules");
      expect(cleanSummary).toContain("Templates:        1 hoisted DOM templates");
      expect(cleanSummary).toContain("click");
    });

    it("does not print build summary dashboard when 0 modules transformed", () => {
      const logs: string[] = [];
      const mockLogger = {
        info: (msg: string) => logs.push(msg),
        warn: () => {},
        error: () => {},
        debug: () => {}
      };

      const plugins = visage();
      const compilerPlugin = plugins.find((p) => p.name === "visage:compiler");
      expect(compilerPlugin).toBeDefined();

      compilerPlugin!.configResolved?.({ root: "/app", command: "build", logger: mockLogger });
      compilerPlugin!.buildStart?.();
      compilerPlugin!.closeBundle?.();

      const summaryLog = logs.find((l) => l.includes("AOT JSX Compiler Build Summary"));
      expect(summaryLog).toBeUndefined();
    });
  });

  describe("Visage Vite RPC Middleware", () => {
    it("cancels SSE stream reader when client disconnects", async () => {
      let cancelled = false;
      const streamRouter = createRouter().subscription("events", {
        resolve: async function* () {
          try {
            while (true) {
              yield { tick: Date.now() };
              await new Promise((r) => setTimeout(r, 10));
            }
          } finally {
            cancelled = true;
          }
        }
      });

      const middleware = createViteRpcMiddleware({
        router: streamRouter,
        endpoint: "/api/rpc"
      });

      class MockReq extends EventEmitter {
        url = "/api/rpc/events";
        method = "GET";
        headers = { host: "localhost" };
        [Symbol.asyncIterator]() {
          return (async function* () {})();
        }
      }

      class MockRes extends EventEmitter {
        statusCode = 200;
        headers = new Map<string, string>();
        writes: any[] = [];
        writableEnded = false;
        setHeader(k: string, v: string) {
          this.headers.set(k, v);
        }
        write(chunk: any) {
          this.writes.push(chunk);
        }
        end() {
          this.writableEnded = true;
        }
      }

      const req = new MockReq();
      const res = new MockRes();

      const handlerPromise = middleware(req, res, () => {});

      // Wait a brief tick for stream to start and first chunk to arrive
      await new Promise((r) => setTimeout(r, 35));
      expect(res.writes.length > 0).toBe(true);

      // Simulate client disconnect
      req.emit("close");

      await handlerPromise;
      expect(cancelled).toBe(true);
    });
  });
});
