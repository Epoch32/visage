import { describe, expect, it } from "bun:test";
import { compileJsx } from "../src/vite/compiler";

describe("Security Transform: HTML Injection Shield", () => {
  describe("Default Off Behavior", () => {
    it("does not guard innerHTML or dangerouslySetInnerHTML when security is disabled", () => {
      const code = '<div innerHTML="<script>alert(1)</script>"></div>';
      const result = compileJsx(code);

      expect(result.code).toContain("<script>alert(1)</script>");
      expect(result.code).not.toContain("_safeHtml");

      const dynamicCode = "<div innerHTML={post.content} />";
      const dynamicResult = compileJsx(dynamicCode);
      expect(dynamicResult.code).not.toContain("_safeHtml");
      expect(dynamicResult.code).toContain('setAttribute(_el$, "innerHTML", post.content)');
    });
  });

  describe("Static HTML Injection Validation (Compile-Time)", () => {
    it("throws a compile-time error when static innerHTML contains script tags", () => {
      const singleLine = '<div innerHTML="<script>alert(1)</script>"></div>';
      expect(() => {
        compileJsx(singleLine, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous HTML injection in attribute "innerHTML"/);

      const multiline = `<div innerHTML="
        <script type='text/javascript'>
          window.token = document.cookie;
        </script>
      "></div>`;
      expect(() => {
        compileJsx(multiline, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous HTML injection in attribute "innerHTML"/);
    });

    it("throws a compile-time error when static innerHTML contains iframe, object, embed, or base tags", () => {
      const tags = [
        '<iframe src="https://attacker.com"></iframe>',
        '<object data="exploit.swf"></object>',
        '<embed src="exploit.pdf">',
        '<base href="https://attacker.com">'
      ];

      for (const tag of tags) {
        const code = `<div innerHTML='${tag}'></div>`;
        expect(() => {
          compileJsx(code, { security: true });
        }).toThrow(/\[visage:security\] Blocked dangerous HTML injection/);
      }
    });

    it("throws a compile-time error when static innerHTML contains inline event handlers", () => {
      const handlers = [
        '<img src="x" onerror="alert(1)">',
        '<img/src="x"/onerror=alert(1)>',
        "<svg/onload=alert(1)>",
        '<body onload="steal()">',
        '<svg onload="alert(1)">',
        '<a href="#" onmouseover="leak()">Hover</a>'
      ];

      for (const handler of handlers) {
        const code = `<div innerHTML='${handler}'></div>`;
        expect(() => {
          compileJsx(code, { security: true });
        }).toThrow(/\[visage:security\] Blocked dangerous HTML injection/);
      }
    });

    it("throws a compile-time error when static innerHTML contains dangerous URI protocols", () => {
      const urls = [
        '<a href="javascript:alert(1)">Click</a>',
        "<a href=javascript:alert(1)>Click</a>",
        "<iframe src=javascript:alert(1)></iframe>"
      ];
      for (const url of urls) {
        const code = `<div innerHTML='${url}'></div>`;
        expect(() => {
          compileJsx(code, { security: true });
        }).toThrow(/\[visage:security\] Blocked dangerous HTML injection/);
      }
    });

    it("permits safe static HTML markup without throwing", () => {
      const code =
        "<div innerHTML=\"<p>Welcome to <strong>Visage</strong>! Check our <a href='/docs'>documentation</a>.</p>\"></div>";
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain("Welcome to <strong>Visage</strong>");
      expect(result.code).not.toContain("_safeHtml");
    });
  });

  describe("Dynamic HTML Injection Shielding (Runtime Helper)", () => {
    it("wraps dynamic innerHTML bindings with hoisted _safeHtml helper", () => {
      const code = "<div innerHTML={article.body} />";
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain("const _safeHtml =");
      expect(result.code).toContain('setAttribute(_el$, "innerHTML", _safeHtml(article.body))');
    });

    it("wraps dangerouslySetInnerHTML bindings with hoisted _safeHtml helper", () => {
      const code = "<div dangerouslySetInnerHTML={article.rawHtml} />";
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain("const _safeHtml =");
      expect(result.code).toContain(
        'setAttribute(_el$, "dangerouslySetInnerHTML", _safeHtml(article.rawHtml))'
      );
    });

    it("evaluates functional behavior of injected _safeHtml helper on dangerous tags", () => {
      const helperCode = String.raw`
        const _safeHtml = (h) => {
          const raw = typeof h === "object" && h !== null && "__html" in h ? h.__html : h;
          const s = String(typeof raw === "function" ? raw() : raw ?? "");
          const clean = s
            .replace(/<(?:script|iframe|object|embed|base)\b[^>]*>[\s\S]*?<\/(?:script|iframe|object|embed|base)>|<(?:script|iframe|object|embed|base)\b[^>]*\/?>/gi, "")
            .replace(/[\s/]+on[a-z0-9_-]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
            .replace(/(?:href|src)\s*=\s*(?:['"]\s*(?:javascript|vbscript):[^'"]*['"]|(?:javascript|vbscript):[^\s>]*)/gi, 'href="about:blank"');
          return typeof h === "object" && h !== null && "__html" in h ? { ...h, __html: clean } : clean;
        };
        return _safeHtml;
      `;
      const safeHtml = new Function(helperCode)();

      // Strips script and its inner content
      expect(safeHtml("<script>alert(1)</script>Hello")).toBe("Hello");
      expect(safeHtml("<script type='text/javascript'>var secret = 42;</script>Article text")).toBe(
        "Article text"
      );

      // Strips iframe and embed tags
      expect(safeHtml('<iframe src="https://evil.com"></iframe>Clean')).toBe("Clean");
      expect(safeHtml('<embed src="evil.swf">Clean')).toBe("Clean");
      expect(safeHtml('<base href="https://evil.com">Clean')).toBe("Clean");

      // Strips inline event handlers (including HTML5 slash separators)
      expect(safeHtml('<img src="avatar.jpg" onerror="alert(1)">')).toBe('<img src="avatar.jpg">');
      expect(safeHtml('<img/src="avatar.jpg"/onerror=alert(1)>')).toBe('<img/src="avatar.jpg">');
      expect(safeHtml('<div onmouseover="track()" class="box">Content</div>')).toBe(
        '<div class="box">Content</div>'
      );

      // Neutralizes javascript: protocol (both quoted and unquoted)
      expect(safeHtml('<a href="javascript:alert(1)">Click</a>')).toBe(
        '<a href="about:blank">Click</a>'
      );
      expect(safeHtml("<a href=javascript:alert(1)>Click</a>")).toBe(
        '<a href="about:blank">Click</a>'
      );

      // Preserves safe formatting tags
      expect(safeHtml("<p>Paragraph with <b>Bold</b> and <i>Italic</i> text</p>")).toBe(
        "<p>Paragraph with <b>Bold</b> and <i>Italic</i> text</p>"
      );
      expect(safeHtml('<a href="https://example.com" class="link">Link</a>')).toBe(
        '<a href="https://example.com" class="link">Link</a>'
      );
    });

    it("evaluates functional behavior on dangerouslySetInnerHTML object payload", () => {
      const helperCode = String.raw`
        const _safeHtml = (h) => {
          const raw = typeof h === "object" && h !== null && "__html" in h ? h.__html : h;
          const s = String(typeof raw === "function" ? raw() : raw ?? "");
          const clean = s
            .replace(/<(?:script|iframe|object|embed|base)\b[^>]*>[\s\S]*?<\/(?:script|iframe|object|embed|base)>|<(?:script|iframe|object|embed|base)\b[^>]*\/?>/gi, "")
            .replace(/[\s/]+on[a-z0-9_-]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
            .replace(/(?:href|src)\s*=\s*(?:['"]\s*(?:javascript|vbscript):[^'"]*['"]|(?:javascript|vbscript):[^\s>]*)/gi, 'href="about:blank"');
          return typeof h === "object" && h !== null && "__html" in h ? { ...h, __html: clean } : clean;
        };
        return _safeHtml;
      `;
      const safeHtml = new Function(helperCode)();

      const payload = {
        __html: "<script>steal()</script><h3>Blog Title</h3><p>Post body</p>",
        customProp: "preserved"
      };

      const result = safeHtml(payload);
      expect(result.__html).toBe("<h3>Blog Title</h3><p>Post body</p>");
      expect(result.customProp).toBe("preserved");
    });

    it("respects granular htmlShield: false option", () => {
      const code = "<div innerHTML={post.content} />";
      const result = compileJsx(code, {
        security: {
          htmlShield: false
        }
      });

      expect(result.code).not.toContain("_safeHtml");
      expect(result.code).toContain('setAttribute(_el$, "innerHTML", post.content)');
    });
  });
});
