import { describe, expect, it } from "bun:test";
import { compileJsx } from "../src/vite/compiler";
import { buildCspString, extractOriginFromUrl, injectCspMetaTag } from "../src/vite/csp";
import { visage } from "../src/vite/plugin";

describe("Content Security Policy (CSP): Core, Generator & Vite Integration", () => {
  describe("Default Off Behavior", () => {
    it("does not inject CSP meta tag or create visage:csp plugin when experimental.csp is omitted", () => {
      const plugins = visage({});
      const cspPlugin = plugins.find((p) => p.name === "visage:csp");
      expect(cspPlugin).toBeUndefined();
    });

    it("does not inject CSP meta tag when experimental.csp is explicitly false", () => {
      const plugins = visage({
        experimental: {
          csp: false
        }
      });
      const cspPlugin = plugins.find((p) => p.name === "visage:csp");
      expect(cspPlugin).toBeUndefined();
    });

    it("keeps compiler origin detection dormant when csp is false", () => {
      const result = compileJsx(
        `function App() {
          return (
            <div>
              <img src="https://images.unsplash.com/photo-1" />
              <iframe src="https://maps.google.com/embed" />
            </div>
          );
        }`,
        {
          csp: false
        }
      );

      expect(result.detectedOrigins.img.size).toBe(0);
      expect(result.detectedOrigins.frame.size).toBe(0);
    });
  });

  describe("URL & Origin Extraction (extractOriginFromUrl)", () => {
    it("extracts protocol, hostname, and port from standard absolute URLs", () => {
      expect(extractOriginFromUrl("https://api.example.com/v1/users")).toBe(
        "https://api.example.com"
      );
      expect(extractOriginFromUrl("http://localhost:3000/dashboard")).toBe("http://localhost:3000");
      expect(extractOriginFromUrl("https://sub.domain.co.uk:8443/app?query=1#hash")).toBe(
        "https://sub.domain.co.uk:8443"
      );
    });

    it("extracts origin from protocol-relative URLs", () => {
      expect(extractOriginFromUrl("//cdn.jsdelivr.net/npm/visage/dist/index.js")).toBe(
        "https://cdn.jsdelivr.net"
      );
      expect(extractOriginFromUrl("//assets.example.com")).toBe("https://assets.example.com");
    });

    it("extracts origin from WebSocket URLs", () => {
      expect(extractOriginFromUrl("wss://ws.example.com/socket")).toBe("wss://ws.example.com");
      expect(extractOriginFromUrl("ws://localhost:8080/events")).toBe("ws://localhost:8080");
    });

    it("returns null for relative paths, data URIs, javascript schemes, and anchors", () => {
      expect(extractOriginFromUrl("/assets/logo.png")).toBeNull();
      expect(extractOriginFromUrl("./avatar.jpg")).toBeNull();
      expect(extractOriginFromUrl("../styles/main.css")).toBeNull();
      expect(extractOriginFromUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==")).toBeNull();
      expect(extractOriginFromUrl("blob:https://example.com/uuid")).toBeNull();
      expect(extractOriginFromUrl("javascript:alert(1)")).toBeNull();
      expect(extractOriginFromUrl("#section")).toBeNull();
      expect(extractOriginFromUrl("")).toBeNull();
      expect(extractOriginFromUrl("   ")).toBeNull();
    });
  });

  describe("Baseline CSP Policy Generation (buildCspString)", () => {
    it("generates strict zero-trust baseline when passed true", () => {
      const csp = buildCspString(true);

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("img-src 'self' data:");
      expect(csp).toContain("font-src 'self' data:");
      expect(csp).toContain("connect-src 'self'");
      expect(csp).toContain("media-src 'self'");
      expect(csp).toContain("frame-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'none'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp.endsWith(";")).toBe(true);
    });

    it("merges configured origin lists into their respective directives", () => {
      const csp = buildCspString({
        connectSrc: ["https://api.my-saas.com", "wss://ws.my-saas.com"],
        imgSrc: ["https://images.unsplash.com", "https://avatar.githubusercontent.com"],
        fontSrc: ["https://fonts.gstatic.com"],
        styleSrc: ["https://fonts.googleapis.com"],
        scriptSrc: ["https://trusted.analytics.com"],
        mediaSrc: ["https://stream.mux.com"],
        frameSrc: ["https://www.youtube-nocookie.com"]
      });

      expect(csp).toContain("connect-src 'self' https://api.my-saas.com wss://ws.my-saas.com");
      expect(csp).toContain(
        "img-src 'self' data: https://images.unsplash.com https://avatar.githubusercontent.com"
      );
      expect(csp).toContain("font-src 'self' data: https://fonts.gstatic.com");
      expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
      expect(csp).toContain("script-src 'self' https://trusted.analytics.com");
      expect(csp).toContain("media-src 'self' https://stream.mux.com");
      expect(csp).toContain("frame-src 'self' https://www.youtube-nocookie.com");
    });

    it("deduplicates origin entries", () => {
      const csp = buildCspString({
        connectSrc: ["'self'", "https://api.example.com", "https://api.example.com"]
      });

      const match = csp.match(/connect-src [^;]+/);
      expect(match).not.toBeNull();
      const parts = match![0].split(" ");
      expect(parts.filter((p) => p === "https://api.example.com").length).toBe(1);
      expect(parts.filter((p) => p === "'self'").length).toBe(1);
    });

    it("supports upgradeInsecureRequests and reportUri directives", () => {
      const csp = buildCspString({
        upgradeInsecureRequests: true,
        reportUri: "/api/csp-report"
      });

      expect(csp).toContain("upgrade-insecure-requests;");
      expect(csp).toContain("report-uri /api/csp-report;");
    });

    it("allows low-level directive overrides via directives option", () => {
      const csp = buildCspString({
        directives: {
          "default-src": ["'none'"],
          "worker-src": ["'self'", "blob:"],
          "block-all-mixed-content": []
        }
      });

      expect(csp).toContain("default-src 'none'");
      expect(csp).not.toContain("default-src 'self'");
      expect(csp).toContain("worker-src 'self' blob:");
      expect(csp).toContain("block-all-mixed-content;");
    });
  });

  describe("HTML Meta Tag Injection (injectCspMetaTag)", () => {
    it("injects meta tag directly after opening <head> tag", () => {
      const html = "<!DOCTYPE html><html><head><title>App</title></head><body></body></html>";
      const csp = "default-src 'self';";
      const injected = injectCspMetaTag(html, csp);

      expect(injected).toContain(
        '<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src \'self\';">'
      );
      expect(injected).toContain("<title>App</title>");
    });

    it("replaces existing Content-Security-Policy meta tag if present", () => {
      const html =
        '<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\';"></head></html>';
      const csp = "default-src 'self'; connect-src https://api.com;";
      const injected = injectCspMetaTag(html, csp);

      expect(injected).toContain(
        '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; connect-src https://api.com;">'
      );
      expect(injected).not.toContain("default-src 'none'");
    });

    it("prepends meta tag to document if <head> is missing", () => {
      const html = "<div>Fragment</div>";
      const csp = "default-src 'self';";
      const injected = injectCspMetaTag(html, csp);

      expect(
        injected.startsWith(
          '<meta http-equiv="Content-Security-Policy" content="default-src \'self\';">'
        )
      ).toBe(true);
    });
  });

  describe("Static JSX Origin Auto-Detection", () => {
    it("automatically detects image origins from static img src attributes", () => {
      const result = compileJsx(
        `function Gallery() {
          return (
            <div>
              <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=500" />
              <img src={"https://cdn.pixabay.com/photo/2015/04/23/22/00/tree-736885_1280.jpg"} />
            </div>
          );
        }`,
        {
          csp: true
        }
      );

      expect(result.detectedOrigins.img.has("https://images.unsplash.com")).toBe(true);
      expect(result.detectedOrigins.img.has("https://cdn.pixabay.com")).toBe(true);
    });

    it("automatically detects origins from img srcset candidates", () => {
      const result = compileJsx(
        `function ResponsiveImg() {
          return (
            <img
              src="https://cdn1.example.com/small.jpg"
              srcset="https://cdn2.example.com/med.jpg 2x, https://cdn3.example.com/large.jpg 3x"
            />
          );
        }`,
        {
          csp: true
        }
      );

      expect(result.detectedOrigins.img.has("https://cdn1.example.com")).toBe(true);
      expect(result.detectedOrigins.img.has("https://cdn2.example.com")).toBe(true);
      expect(result.detectedOrigins.img.has("https://cdn3.example.com")).toBe(true);
    });

    it("automatically detects media origins from video, audio, source, and track tags", () => {
      const result = compileJsx(
        `function Player() {
          return (
            <div>
              <video
                src="https://videos.example.com/intro.mp4"
                poster="https://posters.example.com/cover.jpg"
              >
                <source src="https://backup-stream.org/fallback.mp4" type="video/mp4" />
                <track src="https://subtitles.org/sub.vtt" />
              </video>
              <audio src="https://audio.example.com/track.mp3" />
            </div>
          );
        }`,
        {
          csp: true
        }
      );

      expect(result.detectedOrigins.media.has("https://videos.example.com")).toBe(true);
      expect(result.detectedOrigins.media.has("https://backup-stream.org")).toBe(true);
      expect(result.detectedOrigins.media.has("https://subtitles.org")).toBe(true);
      expect(result.detectedOrigins.media.has("https://audio.example.com")).toBe(true);
      // Video poster is an image resource governed by img-src
      expect(result.detectedOrigins.img.has("https://posters.example.com")).toBe(true);
    });

    it("automatically detects frame origins from iframe tags", () => {
      const result = compileJsx(
        `function MapView() {
          return <iframe src="https://maps.google.com/embed?pb=123" />;
        }`,
        {
          csp: true
        }
      );

      expect(result.detectedOrigins.frame.has("https://maps.google.com")).toBe(true);
    });

    it("automatically detects style and font origins from link tags", () => {
      const result = compileJsx(
        `function HeadLinks() {
          return (
            <div>
              <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto" />
              <link rel="preload" as="font" href="https://fonts.gstatic.com/s/roboto.woff2" />
              <link rel="icon" href="https://cdn.example.com/favicon.ico" />
            </div>
          );
        }`,
        {
          csp: true
        }
      );

      expect(result.detectedOrigins.style.has("https://fonts.googleapis.com")).toBe(true);
      expect(result.detectedOrigins.font.has("https://fonts.gstatic.com")).toBe(true);
      expect(result.detectedOrigins.img.has("https://cdn.example.com")).toBe(true);
    });

    it("extracts static prefix origin from template literals with static head", () => {
      const result = compileJsx(
        `function UserAvatar({ id }) {
          return <img src={\`https://avatars.githubusercontent.com/u/\${id}?v=4\`} />;
        }`,
        {
          csp: true
        }
      );

      expect(result.detectedOrigins.img.has("https://avatars.githubusercontent.com")).toBe(true);
    });

    it("does not detect origins when autoDetectOrigins is disabled", () => {
      const result = compileJsx(
        `function Gallery() {
          return (
            <div>
              <img src="https://images.unsplash.com/photo-1" />
              <iframe src="https://maps.google.com/embed" />
            </div>
          );
        }`,
        {
          csp: {
            autoDetectOrigins: false
          }
        }
      );

      expect(result.detectedOrigins.img.size).toBe(0);
      expect(result.detectedOrigins.frame.size).toBe(0);
    });

    it("does not treat anchor navigation links as external CSP origins", () => {
      const result = compileJsx(
        `function Nav() {
          return <a href="https://external-site.com">External Link</a>;
        }`,
        {
          csp: true
        }
      );

      expect(result.detectedOrigins.connect.size).toBe(0);
      expect(result.detectedOrigins.frame.size).toBe(0);
    });
  });

  describe("Vite Plugin End-to-End Integration", () => {
    it("activates visage:csp plugin and injects CSP meta tag on transformIndexHtml", () => {
      const plugins = visage({
        experimental: {
          csp: true
        }
      });

      const cspPlugin = plugins.find((p) => p.name === "visage:csp");
      expect(cspPlugin).toBeDefined();

      const initialHtml =
        "<!DOCTYPE html><html><head><title>Visage App</title></head><body></body></html>";
      const transformed = (cspPlugin as any).transformIndexHtml(initialHtml);

      expect(transformed).toContain('<meta http-equiv="Content-Security-Policy" content="');
      expect(transformed).toContain("default-src 'self'");
      expect(transformed).toContain("script-src 'self'");
    });

    it("accumulates detected origins across transformed JSX files into final HTML CSP", () => {
      const plugins = visage({
        experimental: {
          csp: {
            connectSrc: ["https://api.backend.org"]
          }
        }
      });

      const compilerPlugin = plugins.find((p) => p.name === "visage:compiler");
      const cspPlugin = plugins.find((p) => p.name === "visage:csp");
      expect(compilerPlugin).toBeDefined();
      expect(cspPlugin).toBeDefined();

      // Transform first component
      const file1 = `
        export function ImageFeed() {
          return <img src="https://images.unsplash.com/photo-2" />;
        }
      `;
      (compilerPlugin as any).transform(file1, "src/ImageFeed.tsx");

      // Transform second component
      const file2 = `
        export function VideoEmbed() {
          return (
            <div>
              <iframe src="https://www.youtube.com/embed/abc" />
              <video src="https://media.stream.org/video.mp4" />
            </div>
          );
        }
      `;
      (compilerPlugin as any).transform(file2, "src/VideoEmbed.tsx");

      // Now request HTML transform
      const initialHtml = "<!DOCTYPE html><html><head></head><body></body></html>";
      const finalHtml = (cspPlugin as any).transformIndexHtml(initialHtml);

      expect(finalHtml).toContain("https://images.unsplash.com");
      expect(finalHtml).toContain("https://www.youtube.com");
      expect(finalHtml).toContain("https://media.stream.org");
      expect(finalHtml).toContain("https://api.backend.org");
    });
  });
});
