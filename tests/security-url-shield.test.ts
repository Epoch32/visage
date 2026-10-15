import { describe, expect, it } from "bun:test";
import { compileJsx } from "../src/vite/compiler";

describe("Security Transform: URL Protocol Shield", () => {
  describe("Default Off Behavior", () => {
    it("keeps URL protocol shielding dormant when compiler is enabled without security", () => {
      const code = '<a href="javascript:alert(1)">Click</a>';
      const result = compileJsx(code);

      expect(result.code).toContain('href=\\"javascript:alert(1)\\"');
      expect(result.code).not.toContain("_safeUrl");
    });

    it("does not wrap dynamic URL attributes when security is disabled", () => {
      const code = "<a href={userUrl}>Link</a>";
      const result = compileJsx(code);

      expect(result.code).toContain('setAttribute(_el$, "href", userUrl)');
      expect(result.code).not.toContain("_safeUrl");
    });
  });

  describe("Static URL Protocol Validation (Compile-Time)", () => {
    it("throws a compile-time error on javascript: protocol in href", () => {
      const code = '<a href="javascript:alert(1)">Link</a>';
      expect(() => {
        compileJsx(code, { security: true });
      }).toThrow(
        /\[visage:security\] Blocked dangerous URI protocol "javascript:alert\(1\)" in attribute "href"/
      );
    });

    it("throws a compile-time error regardless of case (JAVASCRIPT: / JaVaScRiPt:)", () => {
      const uppercase = '<a href="JAVASCRIPT:alert(1)">Link</a>';
      expect(() => {
        compileJsx(uppercase, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous URI protocol/);

      const mixedCase = '<a href="JaVaScRiPt:void(0)">Link</a>';
      expect(() => {
        compileJsx(mixedCase, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous URI protocol/);
    });

    it("throws a compile-time error on vbscript: protocol in href", () => {
      const code = '<a href="vbscript:msgbox(1)">Link</a>';
      expect(() => {
        compileJsx(code, { security: true });
      }).toThrow(
        /\[visage:security\] Blocked dangerous URI protocol "vbscript:msgbox\(1\)" in attribute "href"/
      );
    });

    it("throws a compile-time error on dangerous data:text/html protocol in src", () => {
      const code = '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>';
      expect(() => {
        compileJsx(code, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous URI protocol/);

      const base64Html =
        '<iframe src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="></iframe>';
      expect(() => {
        compileJsx(base64Html, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous URI protocol/);
    });

    it("throws a compile-time error on dangerous data:text/javascript protocol", () => {
      const code = '<script src="data:text/javascript,alert(1)"></script>';
      expect(() => {
        compileJsx(code, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous URI protocol/);

      const appJs = '<script src="data:application/javascript,alert(1)"></script>';
      expect(() => {
        compileJsx(appJs, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous URI protocol/);
    });

    it("blocks dangerous protocols on form action and formAction attributes", () => {
      const formCode = '<form action="javascript:steal()"><input /></form>';
      expect(() => {
        compileJsx(formCode, { security: true });
      }).toThrow(
        /\[visage:security\] Blocked dangerous URI protocol "javascript:steal\(\)" in attribute "action"/
      );

      const buttonCode = '<button formAction="javascript:steal()">Submit</button>';
      expect(() => {
        compileJsx(buttonCode, { security: true });
      }).toThrow(
        /\[visage:security\] Blocked dangerous URI protocol "javascript:steal\(\)" in attribute "formAction"/
      );
    });

    it("blocks dangerous protocols on cite and poster attributes", () => {
      const citeCode = '<blockquote cite="javascript:evil()">Quote</blockquote>';
      expect(() => {
        compileJsx(citeCode, { security: true });
      }).toThrow(
        /\[visage:security\] Blocked dangerous URI protocol "javascript:evil\(\)" in attribute "cite"/
      );

      const posterCode = '<video poster="javascript:evil()"></video>';
      expect(() => {
        compileJsx(posterCode, { security: true });
      }).toThrow(
        /\[visage:security\] Blocked dangerous URI protocol "javascript:evil\(\)" in attribute "poster"/
      );
    });

    it("detects protocol evasion with leading whitespace, newlines, and control characters", () => {
      const leadingSpaces = '<a href="   javascript:alert(1)">Link</a>';
      expect(() => {
        compileJsx(leadingSpaces, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous URI protocol/);

      const leadingNewlines = '<a href="\n\tjavascript:alert(1)">Link</a>';
      expect(() => {
        compileJsx(leadingNewlines, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous URI protocol/);

      const nullByte = '<a href="\u0000javascript:alert(1)">Link</a>';
      expect(() => {
        compileJsx(nullByte, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous URI protocol/);
    });

    it("preserves safe static data image URLs in hoisted template", () => {
      const pngCode =
        '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" />';
      const result = compileJsx(pngCode, { security: true });

      expect(result.code).toContain('src=\\"data:image/png;base64,');
      expect(result.code).not.toContain("_safeUrl");
    });

    it("preserves all standard safe static URL schemes with zero runtime overhead", () => {
      const code = `
        <div>
          <a href="https://example.com/login">HTTPS</a>
          <a href="http://example.com/test">HTTP</a>
          <a href="//cdn.example.com/asset">Protocol-relative</a>
          <a href="/dashboard/settings">Root-relative</a>
          <a href="../profile">Path-relative</a>
          <a href="#section">Hash</a>
          <a href="?tab=overview">Query</a>
          <a href="mailto:support@example.com">Mailto</a>
          <a href="tel:+1234567890">Tel</a>
        </div>
      `;
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain('href=\\"https://example.com/login\\"');
      expect(result.code).toContain('href=\\"http://example.com/test\\"');
      expect(result.code).toContain('href=\\"//cdn.example.com/asset\\"');
      expect(result.code).toContain('href=\\"/dashboard/settings\\"');
      expect(result.code).toContain('href=\\"../profile\\"');
      expect(result.code).toContain('href=\\"#section\\"');
      expect(result.code).toContain('href=\\"?tab=overview\\"');
      expect(result.code).toContain('href=\\"mailto:support@example.com\\"');
      expect(result.code).toContain('href=\\"tel:+1234567890\\"');
      expect(result.code).not.toContain("_safeUrl");
    });
  });

  describe("Dynamic URL Protocol Shielding (Runtime Helper)", () => {
    it("wraps dynamic URL expressions in _safeUrl helper", () => {
      const code = "<a href={userUrl}>Click</a>";
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain("const _safeUrl =");
      expect(result.code).toContain('setAttribute(_el$, "href", _safeUrl(userUrl))');
    });

    it("wraps dynamic src on iframe and img in _safeUrl", () => {
      const code = `
        <div>
          <iframe src={embedUrl}></iframe>
          <img src={avatarUrl} />
        </div>
      `;
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain("_safeUrl(embedUrl)");
      expect(result.code).toContain("_safeUrl(avatarUrl)");
    });

    it("evaluates functional behavior of injected _safeUrl helper with string inputs", () => {
      const helperCode = String.raw`
        const _safeUrl = (u) =>
          /^(?:\s*|[\u0000-\u001F\u007F-\u009F])*(?:(?:javascript|vbscript):|data\s*:\s*(?:text\/(?:html|javascript|ecmascript)|application\/(?:javascript|ecmascript))(?:\s*|;|,))/i.test(
            String(typeof u === "function" ? u() : u ?? "")
          )
            ? "about:blank"
            : u;
        return _safeUrl;
      `;
      const safeUrl = new Function(helperCode)();

      // Malicious payloads neutralised to about:blank
      expect(safeUrl("javascript:alert(document.cookie)")).toBe("about:blank");
      expect(safeUrl("   JavaScript:void(0)")).toBe("about:blank");
      expect(safeUrl("\u0000javascript:alert(1)")).toBe("about:blank");
      expect(safeUrl("vbscript:MsgBox(1)")).toBe("about:blank");
      expect(safeUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe("about:blank");
      expect(safeUrl("data:text/javascript,evil()")).toBe("about:blank");
      expect(safeUrl("data:application/javascript,evil()")).toBe("about:blank");

      // Safe URLs returned untouched
      expect(safeUrl("https://example.com")).toBe("https://example.com");
      expect(safeUrl("http://localhost:3000")).toBe("http://localhost:3000");
      expect(safeUrl("/api/v1/users")).toBe("/api/v1/users");
      expect(safeUrl("data:image/svg+xml,<svg></svg>")).toBe("data:image/svg+xml,<svg></svg>");
    });

    it("evaluates functional behavior of injected _safeUrl helper with reactive signal getters", () => {
      const helperCode = String.raw`
        const _safeUrl = (u) =>
          /^(?:\s*|[\u0000-\u001F\u007F-\u009F])*(?:(?:javascript|vbscript):|data\s*:\s*(?:text\/(?:html|javascript|ecmascript)|application\/(?:javascript|ecmascript))(?:\s*|;|,))/i.test(
            String(typeof u === "function" ? u() : u ?? "")
          )
            ? "about:blank"
            : u;
        return _safeUrl;
      `;
      const safeUrl = new Function(helperCode)();

      // Dangerous signal returns about:blank
      const maliciousSignal = () => "javascript:alert(1)";
      expect(safeUrl(maliciousSignal)).toBe("about:blank");

      // Safe signal preserves original function reference for Visage reactive effects
      const safeSignal = () => "https://epoch32.com";
      const result = safeUrl(safeSignal);
      expect(result).toBe(safeSignal);
      expect(typeof result).toBe("function");
      expect(result()).toBe("https://epoch32.com");
    });

    it("handles nullish values gracefully", () => {
      const helperCode = String.raw`
        const _safeUrl = (u) =>
          /^(?:\s*|[\u0000-\u001F\u007F-\u009F])*(?:(?:javascript|vbscript):|data\s*:\s*(?:text\/(?:html|javascript|ecmascript)|application\/(?:javascript|ecmascript))(?:\s*|;|,))/i.test(
            String(typeof u === "function" ? u() : u ?? "")
          )
            ? "about:blank"
            : u;
        return _safeUrl;
      `;
      const safeUrl = new Function(helperCode)();

      expect(safeUrl(null)).toBeNull();
      expect(safeUrl(undefined)).toBeUndefined();
      expect(safeUrl("")).toBe("");
    });

    it("respects granular urlShield: false option", () => {
      const code = "<a href={userUrl}>Link</a>";
      const result = compileJsx(code, {
        security: {
          urlShield: false
        }
      });

      expect(result.code).not.toContain("_safeUrl");
      expect(result.code).toContain('setAttribute(_el$, "href", userUrl)');
    });
  });
});
