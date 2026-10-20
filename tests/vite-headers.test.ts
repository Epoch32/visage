import { describe, expect, it } from "bun:test";
import { createHeadersPlugin, formatHeadersFile, parseHeadersFile, visage } from "../src/vite";

describe("Visage Static Hosting Headers Plugin (RFC 9111 & RFC 8246)", () => {
  describe("Headers File Parser & Formatter", () => {
    it("parses Cloudflare/Netlify _headers format accurately", () => {
      const raw = `
# Existing comment
/assets/*
  Cache-Control: public, max-age=31536000, immutable
  X-Custom-Asset: true

/*
  Cache-Control: public, max-age=0, must-revalidate
  X-Frame-Options: DENY
      `;

      const rules = parseHeadersFile(raw);
      expect(rules.has("/assets/*")).toBe(true);
      expect(rules.has("/*")).toBe(true);

      const assetHeaders = rules.get("/assets/*")!;
      expect(assetHeaders.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
      expect(assetHeaders.get("X-Custom-Asset")).toBe("true");

      const docHeaders = rules.get("/*")!;
      expect(docHeaders.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
      expect(docHeaders.get("X-Frame-Options")).toBe("DENY");
    });

    it("formats structured rules back into valid _headers syntax", () => {
      const map = new Map<string, Map<string, string>>();
      const assetMap = new Map<string, string>();
      assetMap.set("Cache-Control", "public, max-age=31536000, immutable");
      map.set("/assets/*", assetMap);

      const formatted = formatHeadersFile(map);
      expect(formatted).toContain("/assets/*");
      expect(formatted).toContain("  Cache-Control: public, max-age=31536000, immutable");
    });
  });

  describe("Vite Plugin Build Emitting", () => {
    it("emits _headers asset with RFC 8246 immutable assets and RFC 9111 revalidation", () => {
      const vLog = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
      const plugin = createHeadersPlugin(true, vLog as any);

      let emittedFileName = "";
      let emittedSource = "";

      const contextMock = {
        emitFile: (opts: any) => {
          emittedFileName = opts.fileName;
          emittedSource = opts.source;
        }
      };

      (plugin as any).generateBundle.call(contextMock, {}, {});

      expect(emittedFileName).toBe("_headers");
      expect(emittedSource).toContain("/assets/*");
      expect(emittedSource).toContain("Cache-Control: public, max-age=31536000, immutable");
      // Does not emit conflicting catch-all rule that would clobber /assets/* in Cloudflare
      expect(emittedSource.split("\n")).not.toContain("/*");
    });

    it("emits /index.html when documentCacheControl is explicitly provided", () => {
      const vLog = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
      const plugin = createHeadersPlugin(
        { documentCacheControl: "public, max-age=0, must-revalidate" },
        vLog as any
      );

      let emittedSource = "";
      const contextMock = {
        emitFile: (opts: any) => {
          emittedSource = opts.source;
        }
      };

      (plugin as any).generateBundle.call(contextMock, {}, {});
      expect(emittedSource).toContain("/index.html");
      expect(emittedSource).toContain("Cache-Control: public, max-age=0, must-revalidate");
    });

    it("merges customRules into emitted _headers", () => {
      const vLog = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
      const plugin = createHeadersPlugin(
        {
          customRules: {
            "/api/*": {
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "no-store"
            }
          }
        },
        vLog as any
      );

      let emittedSource = "";
      const contextMock = {
        emitFile: (opts: any) => {
          emittedSource = opts.source;
        }
      };

      (plugin as any).generateBundle.call(contextMock, {}, {});

      expect(emittedSource).toContain("/api/*");
      expect(emittedSource).toContain("Access-Control-Allow-Origin: *");
      expect(emittedSource).toContain("Cache-Control: no-store");
      expect(emittedSource).toContain("/assets/*");
    });

    it("remains dormant when headers: false is configured in visage()", () => {
      const plugins = visage({ headers: false });
      const hasHeadersPlugin = plugins.some((p) => p.name === "visage:headers");
      expect(hasHeadersPlugin).toBe(false);
    });

    it("is included by default in visage() plugin pipeline", () => {
      const plugins = visage();
      const hasHeadersPlugin = plugins.some((p) => p.name === "visage:headers");
      expect(hasHeadersPlugin).toBe(true);
    });
  });

  describe("Vite Preview Server Cache Middleware", () => {
    it("attaches immutable Cache-Control to /assets/* requests and must-revalidate to HTML", () => {
      const vLog = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
      const plugin = createHeadersPlugin(true, vLog as any);

      let previewMiddleware: any;
      const mockServer = {
        middlewares: {
          use: (fn: any) => {
            previewMiddleware = fn;
          }
        }
      };

      (plugin as any).configurePreviewServer(mockServer);
      expect(previewMiddleware).toBeDefined();

      // 1. Asset request
      let assetCacheHeader = "";
      const assetReq = { url: "/assets/index-12345.js", headers: {} };
      const assetRes = {
        setHeader: (name: string, val: string) => {
          if (name === "Cache-Control") assetCacheHeader = val;
        }
      };
      previewMiddleware(assetReq, assetRes, () => {});
      expect(assetCacheHeader).toBe("public, max-age=31536000, immutable");

      // 2. HTML document request
      let htmlCacheHeader = "";
      const htmlReq = { url: "/roadmap", headers: { accept: "text/html,application/xhtml+xml" } };
      const htmlRes = {
        setHeader: (name: string, val: string) => {
          if (name === "Cache-Control") htmlCacheHeader = val;
        }
      };
      previewMiddleware(htmlReq, htmlRes, () => {});
      expect(htmlCacheHeader).toBe("public, max-age=0, must-revalidate");
    });
  });
});
