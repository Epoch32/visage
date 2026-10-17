import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { matchRoute, scanPages, visage, visagePages } from "../src/vite";
import {
  generateClientEntry,
  generateDefault404Html,
  generateHtmlShell,
  generateNotFoundEntry
} from "../src/vite/pages/generator";

describe("Visage File-System MPA Pages Router (visage/pages)", () => {
  let tmpPagesDir: string;

  beforeAll(() => {
    tmpPagesDir = fs.mkdtempSync(path.join(os.tmpdir(), "visage-pages-test-"));

    // Set up mock pages directory structure
    fs.writeFileSync(
      path.join(tmpPagesDir, "_layout.tsx"),
      "export default function Layout({ children }) { return children; }"
    );
    fs.writeFileSync(
      path.join(tmpPagesDir, "_document.tsx"),
      "export default function Document() {}"
    );
    fs.writeFileSync(path.join(tmpPagesDir, "404.tsx"), "export default function NotFound() {}");
    fs.writeFileSync(path.join(tmpPagesDir, "index.tsx"), "export default function Home() {}");
    fs.writeFileSync(path.join(tmpPagesDir, "about.tsx"), "export default function About() {}");

    fs.mkdirSync(path.join(tmpPagesDir, "contact"));
    fs.writeFileSync(
      path.join(tmpPagesDir, "contact", "index.tsx"),
      "export default function Contact() {}"
    );

    fs.mkdirSync(path.join(tmpPagesDir, "blog"));
    fs.writeFileSync(
      path.join(tmpPagesDir, "blog", "index.tsx"),
      "export default function BlogIndex() {}"
    );
    fs.writeFileSync(
      path.join(tmpPagesDir, "blog", "[slug].tsx"),
      "export default function BlogPost() {}"
    );

    fs.mkdirSync(path.join(tmpPagesDir, "users"));
    fs.mkdirSync(path.join(tmpPagesDir, "users", "[id]"));
    fs.writeFileSync(
      path.join(tmpPagesDir, "users", "[id]", "settings.tsx"),
      "export default function UserSettings() {}"
    );

    fs.mkdirSync(path.join(tmpPagesDir, "docs"));
    fs.writeFileSync(
      path.join(tmpPagesDir, "docs", "[...all].tsx"),
      "export default function DocsCatchAll() {}"
    );
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpPagesDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe("Directory & Route Scanner", () => {
    it("discovers special root layout, document, and 404 files", () => {
      const { special } = scanPages(tmpPagesDir);

      expect(special.layout).toBeDefined();
      expect(special.layout).toContain("_layout.tsx");

      expect(special.document).toBeDefined();
      expect(special.document).toContain("_document.tsx");

      expect(special.notFound).toBeDefined();
      expect(special.notFound).toContain("404.tsx");
    });

    it("scans and compiles routes with correct URL paths and patterns", () => {
      const { routes } = scanPages(tmpPagesDir);

      const paths = routes.map((r) => r.path);
      expect(paths).toContain("/");
      expect(paths).toContain("/about");
      expect(paths).toContain("/contact");
      expect(paths).toContain("/blog");
      expect(paths).toContain("/blog/:slug");
      expect(paths).toContain("/users/:id/settings");
      expect(paths).toContain("/docs/*");
    });

    it("prioritizes static routes over dynamic and catch-all routes", () => {
      const { routes } = scanPages(tmpPagesDir);

      const blogIndexIdx = routes.findIndex((r) => r.path === "/blog");
      const blogDynamicIdx = routes.findIndex((r) => r.path === "/blog/:slug");
      const docsCatchAllIdx = routes.findIndex((r) => r.path === "/docs/*");

      expect(blogIndexIdx < blogDynamicIdx).toBe(true);
      expect(blogDynamicIdx < docsCatchAllIdx).toBe(true);
    });
  });

  describe("URL Route Matcher", () => {
    it("matches root and static paths exactly", () => {
      const { routes } = scanPages(tmpPagesDir);

      const homeMatch = matchRoute(routes, "/");
      expect(homeMatch).not.toBeNull();
      expect(homeMatch?.route.path).toBe("/");
      expect(homeMatch?.params).toEqual({});

      const aboutMatch = matchRoute(routes, "/about");
      expect(aboutMatch).not.toBeNull();
      expect(aboutMatch?.route.path).toBe("/about");

      // Optional trailing slash support
      const aboutTrailing = matchRoute(routes, "/about/");
      expect(aboutTrailing).not.toBeNull();
      expect(aboutTrailing?.route.path).toBe("/about");
    });

    it("extracts dynamic parameter segments", () => {
      const { routes } = scanPages(tmpPagesDir);

      const postMatch = matchRoute(routes, "/blog/signals-architecture");
      expect(postMatch).not.toBeNull();
      expect(postMatch?.route.path).toBe("/blog/:slug");
      expect(postMatch?.params).toEqual({ slug: "signals-architecture" });

      const userMatch = matchRoute(routes, "/users/epoch32/settings");
      expect(userMatch).not.toBeNull();
      expect(userMatch?.route.path).toBe("/users/:id/settings");
      expect(userMatch?.params).toEqual({ id: "epoch32" });
    });

    it("extracts catch-all segments", () => {
      const { routes } = scanPages(tmpPagesDir);

      const docsMatch = matchRoute(routes, "/docs/guides/getting-started/quickstart");
      expect(docsMatch).not.toBeNull();
      expect(docsMatch?.route.path).toBe("/docs/*");
      expect(docsMatch?.params).toEqual({ all: "guides/getting-started/quickstart" });
    });

    it("returns null for completely unmatched paths", () => {
      const { routes } = scanPages(tmpPagesDir);

      const unmatched = matchRoute(routes, "/non-existent/resource");
      expect(unmatched).toBeNull();
    });
  });

  describe("Client Entry & HTML Generators", () => {
    it("generates client entry with root layout, page component, and params", () => {
      const { routes, special } = scanPages(tmpPagesDir);
      const blogRoute = routes.find((r) => r.path === "/blog/:slug")!;

      const script = generateClientEntry(blogRoute, { slug: "reactivity" }, special, "visage-root");

      expect(script).toContain('import { render } from "@epoch32/visage"');
      expect(script).toContain("import PageComponent from");
      expect(script).toContain("import RootLayout from");
      expect(script).toContain('const params = {"slug":"reactivity"};');
      expect(script).toContain('document.getElementById("visage-root")');
    });

    it("generates custom not-found client entry", () => {
      const { special } = scanPages(tmpPagesDir);
      const script = generateNotFoundEntry(special.notFound!, "visage-root");

      expect(script).toContain('import { render } from "@epoch32/visage"');
      expect(script).toContain("import NotFoundComponent from");
      expect(script).toContain('document.getElementById("visage-root")');
    });

    it("generates HTML shell with script tag and root element", () => {
      const html = generateHtmlShell({
        title: "Test Page",
        rootId: "custom-root",
        clientEntryUrl: "/@visage-pages-entry?file=page.tsx"
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<title>Test Page</title>");
      expect(html).toContain('<div id="custom-root"></div>');
      expect(html).toContain(
        '<script type="module" data-visage-entry="true" src="/@visage-pages-entry?file=page.tsx"></script>'
      );
    });

    it("generates clean fallback 404 HTML", () => {
      const html = generateDefault404Html();

      expect(html).toContain("404");
      expect(html).toContain("Page Not Found");
      expect(html).toContain("Return to Homepage");
    });
  });

  describe("Vite Plugin Integration", () => {
    it("adds visage:pages plugin when pages option is enabled in visage()", () => {
      const plugins = visage({ pages: { dir: tmpPagesDir } });
      const pagesPlugin = plugins.find((p) => p.name === "visage:pages");

      expect(pagesPlugin).toBeDefined();
    });

    it("works as a standalone visagePages() plugin", () => {
      const plugin = visagePages({ dir: tmpPagesDir });

      expect(plugin.name).toBe("visage:pages");
      expect(plugin.configureServer).toBeDefined();
      expect(plugin.resolveId).toBeDefined();
      expect(plugin.load).toBeDefined();
    });

    it("resolves and loads virtual client entry modules", () => {
      const plugin = visagePages({ dir: tmpPagesDir });

      // Test resolveId
      const virtualId = `/@visage-pages-entry?file=${encodeURIComponent(path.join(tmpPagesDir, "about.tsx"))}`;
      const resolved = (plugin as any).resolveId(virtualId);
      expect(resolved).toBe(`\0${virtualId}`);

      // Test load
      const loaded = (plugin as any).load(resolved);
      expect(loaded).toBeDefined();
      expect(loaded).toContain('import { render } from "@epoch32/visage"');
      expect(loaded).toContain("about.tsx");
    });

    it("serves synthesized HTML responses in dev server middleware", async () => {
      const plugin = visagePages({ dir: tmpPagesDir });

      // Simulate configResolved
      (plugin as any).configResolved({
        root: tmpPagesDir,
        command: "serve",
        build: { outDir: "dist" }
      });

      let middlewareFn: any;
      const mockServer = {
        watcher: { on: () => {} },
        middlewares: {
          use: (fn: any) => {
            middlewareFn = fn;
          }
        },
        transformIndexHtml: async (_url: string, html: string) => html
      };

      (plugin as any).configureServer(mockServer);
      expect(middlewareFn).toBeDefined();

      // Test matching request
      let status = 0;
      const headers: Record<string, string> = {};
      let body = "";

      const mockReq = { url: "/about", method: "GET" };
      const mockRes = {
        set statusCode(code: number) {
          status = code;
        },
        setHeader(name: string, value: string) {
          headers[name] = value;
        },
        end(data: string) {
          body = data;
        }
      };

      await middlewareFn(mockReq, mockRes, () => {});

      expect(status).toBe(200);
      expect(headers["Content-Type"]).toContain("text/html");
      expect(body).toContain('<div id="visage-root"></div>');
      expect(body).toContain("/@visage-pages-entry");
      expect(body).toContain("about.tsx");
    });

    it("rewrites clean URLs to index.html in preview server middleware", async () => {
      const plugin = visagePages({ dir: tmpPagesDir });

      const mockDist = path.join(tmpPagesDir, "dist");
      fs.mkdirSync(path.join(mockDist, "about"), { recursive: true });
      fs.writeFileSync(path.join(mockDist, "about", "index.html"), "<h1>About</h1>");
      fs.writeFileSync(path.join(mockDist, "contact.html"), "<h1>Contact</h1>");
      fs.writeFileSync(path.join(mockDist, "404.html"), "<h1>Custom 404</h1>");

      (plugin as any).configResolved({
        root: tmpPagesDir,
        command: "serve",
        build: { outDir: "dist" }
      });

      let previewMiddleware: any;
      const mockPreviewServer = {
        middlewares: {
          use: (fn: any) => {
            previewMiddleware = fn;
          }
        }
      };

      (plugin as any).configurePreviewServer(mockPreviewServer);
      expect(previewMiddleware).toBeDefined();

      // Test directory index rewrite: /about -> /about/index.html
      const reqAbout = { url: "/about", method: "GET" };
      let nextCalled = false;
      await previewMiddleware(reqAbout, {}, () => {
        nextCalled = true;
      });
      expect(reqAbout.url).toBe("/about/index.html");
      expect(nextCalled).toBe(true);

      // Test clean HTML rewrite: /contact -> /contact.html
      const reqContact = { url: "/contact?foo=bar", method: "GET" };
      nextCalled = false;
      await previewMiddleware(reqContact, {}, () => {
        nextCalled = true;
      });
      expect(reqContact.url).toBe("/contact.html?foo=bar");
      expect(nextCalled).toBe(true);

      // Test fallback 404
      let status = 0;
      let body = "";
      const reqNotFound = { url: "/nonexistent", method: "GET" };
      const mockRes = {
        set statusCode(code: number) {
          status = code;
        },
        setHeader: () => {},
        end: (d: any) => {
          body = d ? String(d) : "";
        }
      };
      await previewMiddleware(reqNotFound, mockRes, () => {});
      expect(status).toBe(404);
      expect(body).toContain("Custom 404");
    });
  });
});
