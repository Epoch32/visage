import { describe, expect, it } from "bun:test";
import { compileJsx } from "../src/vite/compiler";

describe("Security Transform: Reverse Tabnabbing / Rel Shield", () => {
  describe("Default Off Behavior", () => {
    it("does not inject rel when security is disabled", () => {
      const code = '<a href="https://example.com" target="_blank">Link</a>';
      const result = compileJsx(code);

      expect(result.code).toContain('target=\\"_blank\\"');
      expect(result.code).not.toContain("noopener");
      expect(result.code).not.toContain("noreferrer");
    });
  });

  describe("Static Target Blank Shielding", () => {
    it("automatically injects rel='noopener noreferrer' when target='_blank' has no rel attribute", () => {
      const code = '<a href="https://partner.com" target="_blank">Partner</a>';
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain('rel=\\"noopener noreferrer\\"');
      expect(result.code).toContain('target=\\"_blank\\"');
    });

    it("appends missing tokens when rel has custom tokens like nofollow or author", () => {
      const code =
        '<a href="https://partner.com" target="_blank" rel="nofollow author">Partner</a>';
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain('rel=\\"nofollow author noopener noreferrer\\"');
    });

    it("appends only the missing token when rel has noopener but lacks noreferrer", () => {
      const code = '<a href="https://partner.com" target="_blank" rel="noopener">Partner</a>';
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain('rel=\\"noopener noreferrer\\"');
    });

    it("appends only the missing token when rel has noreferrer but lacks noopener", () => {
      const code = '<a href="https://partner.com" target="_blank" rel="noreferrer">Partner</a>';
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain('rel=\\"noreferrer noopener\\"');
    });

    it("does not duplicate tokens when both noopener and noreferrer are already present", () => {
      const code =
        '<a href="https://partner.com" target="_blank" rel="noopener noreferrer">Partner</a>';
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain('rel=\\"noopener noreferrer\\"');
      // Verify no duplicate tokens
      expect(result.code).not.toContain("noopener noopener");
      expect(result.code).not.toContain("noreferrer noreferrer");
    });

    it("handles whitespace variations in existing rel string", () => {
      const code =
        '<a href="https://partner.com" target="_blank" rel="  nofollow   noopener  ">Partner</a>';
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain('rel=\\"nofollow noopener noreferrer\\"');
    });

    it("does not modify links when target is not _blank", () => {
      const targets = ["_self", "_parent", "_top", "namedWindow", "modalTarget"];

      for (const target of targets) {
        const code = `<a href="https://example.com" target="${target}">Link</a>`;
        const result = compileJsx(code, { security: true });

        expect(result.code).not.toContain("noopener");
        expect(result.code).not.toContain("noreferrer");
      }
    });

    it("does not add rel attribute to links without target", () => {
      const code = '<a href="https://example.com">Internal</a>';
      const result = compileJsx(code, { security: true });

      expect(result.code).not.toContain("rel=");
    });

    it("does not add rel attribute to non-anchor tags with target", () => {
      const formCode = '<form target="_blank" action="/submit"><button>Go</button></form>';
      const result = compileJsx(formCode, { security: true });

      expect(result.code).not.toContain("rel=");
    });

    it("operates with zero runtime overhead by compiling directly into the hoisted template", () => {
      const code = '<a href="https://example.com" target="_blank">External</a>';
      const result = compileJsx(code, { security: true });

      // The hoisted template contains the complete safe HTML string
      expect(result.code).toContain(
        'template("<a href=\\"https://example.com\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">External</a>")'
      );
      // No security helpers emitted
      expect(result.code).not.toContain("_safeRel");
      expect(result.code).not.toContain("_safeUrl");
    });

    it("respects granular relShield: false option", () => {
      const code = '<a href="https://example.com" target="_blank">Link</a>';
      const result = compileJsx(code, {
        security: {
          relShield: false
        }
      });

      expect(result.code).toContain('target=\\"_blank\\"');
      expect(result.code).not.toContain("noopener");
    });
  });
});
