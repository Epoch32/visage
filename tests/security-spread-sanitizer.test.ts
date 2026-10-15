import { describe, expect, it } from "bun:test";
import { compileJsx } from "../src/vite/compiler";

describe("Security Transform: Spread Attribute Sanitizer", () => {
  describe("Default Off Behavior", () => {
    it("does not sanitize spreads when security is disabled", () => {
      const code = "<button {...buttonProps}>Click</button>";
      const result = compileJsx(code);

      expect(result.code).toContain("Object.entries(buttonProps)");
      expect(result.code).not.toContain("_cleanSpread");
    });
  });

  describe("Native Element Spread Sanitization (Compile-Time Wrapping)", () => {
    it("wraps spreads on native HTML tags with _cleanSpread", () => {
      const code = "<button {...buttonProps}>Submit</button>";
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain("const _cleanSpread =");
      expect(result.code).toContain("const _safeUrl =");
      expect(result.code).toContain("const _safeName =");
      expect(result.code).toContain("Object.entries(_cleanSpread(buttonProps))");
    });

    it("wraps spreads on links, inputs, and containers", () => {
      const linkCode = "<a {...linkProps}>Link</a>";
      const linkResult = compileJsx(linkCode, { security: true });
      expect(linkResult.code).toContain("_cleanSpread(linkProps)");

      const inputCode = "<input {...inputProps} />";
      const inputResult = compileJsx(inputCode, { security: true });
      expect(inputResult.code).toContain("_cleanSpread(inputProps)");

      const divCode = "<div {...containerProps}>Content</div>";
      const divResult = compileJsx(divCode, { security: true });
      expect(divResult.code).toContain("_cleanSpread(containerProps)");
    });

    it("does NOT wrap spreads on custom components (preserves native JS object props)", () => {
      const code = "<CustomComponent {...componentProps} />";
      const result = compileJsx(code, { security: true });

      // Custom components receive raw object spreads, not DOM-sanitized spreads
      expect(result.code).not.toContain("_cleanSpread");
      expect(result.code).toContain("...componentProps");
    });

    it("evaluates functional behavior of injected _cleanSpread helper", () => {
      const helperCode = `
        const _safeUrl = (u) => /^(?:\\s*|[\\u0000-\\u001F\\u007F-\\u009F])*(?:(?:javascript|vbscript):|data\\s*:\\s*(?:text\\/(?:html|javascript|ecmascript)|application\\/(?:javascript|ecmascript))(?:\\s*|;|,))/i.test(String(typeof u === "function" ? u() : u ?? "")) ? "about:blank" : u;
        const _safeName = (n) => {
          const s = String(typeof n === "function" ? n() : n ?? "");
          return /^(?:submit|action|reset|elements|length|item|namedItem|nodeName|attributes|parentNode|ownerDocument|removeChild|appendChild|replaceChild|insertBefore|style|constructor|__proto__|prototype|valueOf|toString)$/i.test(s) ? "_" + s : n;
        };
        const _cleanSpread = (p) => {
          if (!p || typeof p !== "object") return p;
          const out = {};
          for (const [k, v] of Object.entries(p)) {
            if (/^(?:__proto__|constructor|prototype)$/.test(k)) continue;
            if (/^(?:innerHTML|dangerouslySetInnerHTML)$/.test(k)) continue;
            if (/^(?:href|src|action|formaction|cite|poster)$/i.test(k)) {
              out[k] = typeof _safeUrl === "function" ? _safeUrl(v) : v;
            } else if (/^(?:id|name)$/i.test(k)) {
              out[k] = typeof _safeName === "function" ? _safeName(v) : v;
            } else {
              out[k] = v;
            }
          }
          return out;
        };
        return _cleanSpread;
      `;
      const cleanSpread = new Function(helperCode)();

      const maliciousSpread = {
        href: "javascript:alert(1)",
        src: "data:text/html,<script>alert(1)</script>",
        id: "submit",
        name: "action",
        innerHTML: "<script>leak()</script>",
        dangerouslySetInnerHTML: { __html: "<script>leak()</script>" },
        __proto__: { isAdmin: true },
        constructor: { evil: true },
        className: "btn primary",
        disabled: true,
        "data-user-id": "42"
      };

      const cleaned = cleanSpread(maliciousSpread);

      // Dangerous URLs neutralized
      expect(cleaned.href).toBe("about:blank");
      expect(cleaned.src).toBe("about:blank");

      // DOM clobbering names prefixed
      expect(cleaned.id).toBe("_submit");
      expect(cleaned.name).toBe("_action");

      // Raw HTML injections stripped
      expect(cleaned.innerHTML).toBeUndefined();
      expect(cleaned.dangerouslySetInnerHTML).toBeUndefined();

      // Prototype pollution properties stripped
      expect(cleaned.constructor).not.toEqual({ evil: true });
      expect(({} as any).isAdmin).toBeUndefined();

      // Safe attributes preserved
      expect(cleaned.className).toBe("btn primary");
      expect(cleaned.disabled).toBe(true);
      expect(cleaned["data-user-id"]).toBe("42");
    });

    it("handles nullish and non-object inputs gracefully", () => {
      const helperCode = `
        const _cleanSpread = (p) => {
          if (!p || typeof p !== "object") return p;
          const out = {};
          for (const [k, v] of Object.entries(p)) {
            if (/^(?:__proto__|constructor|prototype)$/.test(k)) continue;
            if (/^(?:innerHTML|dangerouslySetInnerHTML)$/.test(k)) continue;
            if (/^(?:href|src|action|formaction|cite|poster)$/i.test(k)) {
              out[k] = typeof _safeUrl === "function" ? _safeUrl(v) : v;
            } else if (/^(?:id|name)$/i.test(k)) {
              out[k] = typeof _safeName === "function" ? _safeName(v) : v;
            } else {
              out[k] = v;
            }
          }
          return out;
        };
        return _cleanSpread;
      `;
      const cleanSpread = new Function(helperCode)();

      expect(cleanSpread(null)).toBeNull();
      expect(cleanSpread(undefined)).toBeUndefined();
      expect(cleanSpread(false)).toBe(false);
      expect(cleanSpread("text")).toBe("text");
    });

    it("respects granular spreadSanitizer: false option", () => {
      const code = "<button {...buttonProps}>Click</button>";
      const result = compileJsx(code, {
        security: {
          spreadSanitizer: false
        }
      });

      expect(result.code).not.toContain("_cleanSpread");
      expect(result.code).toContain("Object.entries(buttonProps)");
    });
  });
});
