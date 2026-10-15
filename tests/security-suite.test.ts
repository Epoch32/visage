import { describe, expect, it } from "bun:test";
import { compileJsx } from "../src/vite/compiler";
import { visage } from "../src/vite/plugin";

describe("Security Transforms: Full Suite & Vite Plugin Integration", () => {
  describe("Vite Plugin Integration", () => {
    it("keeps all transforms dormant when compiler is enabled without experimental.secureTransforms", () => {
      const plugins = visage({
        compiler: true
      });

      const compilerPlugin = plugins.find((p) => p.name === "visage:compiler");
      expect(compilerPlugin).toBeDefined();

      const code = `
        function App() {
          return (
            <div>
              <a href="javascript:alert(1)" target="_blank">Link</a>
              <input name="submit" />
              <button {...props}>Button</button>
            </div>
          );
        }
      `;

      const transformed = (compilerPlugin as any).transform(code, "src/App.tsx");
      expect(transformed).not.toBeNull();
      // Dangerous static protocol compiled through
      expect(transformed.code).toContain('href=\\"javascript:alert(1)\\"');
      // No automatic rel="noopener"
      expect(transformed.code).not.toContain("noopener");
      // No security helpers injected
      expect(transformed.code).not.toContain("_safeUrl");
      expect(transformed.code).not.toContain("_safeName");
      expect(transformed.code).not.toContain("_cleanSpread");
    });

    it("activates all security transforms when experimental.secureTransforms is true", () => {
      const plugins = visage({
        experimental: {
          secureTransforms: true
        }
      });

      const compilerPlugin = plugins.find((p) => p.name === "visage:compiler");
      expect(compilerPlugin).toBeDefined();

      const dynamicCode = `
        function App() {
          return (
            <div>
              <a href={userUrl} target="_blank">Link</a>
              <input name={fieldName} />
              <div innerHTML={content} />
              <button {...props}>Button</button>
            </div>
          );
        }
      `;

      const transformed = (compilerPlugin as any).transform(dynamicCode, "src/App.tsx");
      expect(transformed).not.toBeNull();
      // All dynamic helpers wrapped
      expect(transformed.code).toContain("_safeUrl(userUrl)");
      expect(transformed.code).toContain("_safeName(fieldName)");
      expect(transformed.code).toContain("_safeHtml(content)");
      expect(transformed.code).toContain("_cleanSpread(props)");
      // Auto-injected rel
      expect(transformed.code).toContain('rel=\\"noopener noreferrer\\"');

      // Aborts build / transform on dangerous static protocol
      const dangerousStaticCode = '<a href="javascript:alert(1)">Click</a>';
      const failedTransform = (compilerPlugin as any).transform(dangerousStaticCode, "src/App.tsx");
      expect(failedTransform).toBeNull();
    });

    it("supports granular configuration object passed to experimental.secureTransforms", () => {
      const plugins = visage({
        experimental: {
          secureTransforms: {
            urlShield: true,
            relShield: false,
            clobberShield: false
          }
        }
      });

      const compilerPlugin = plugins.find((p) => p.name === "visage:compiler");
      expect(compilerPlugin).toBeDefined();

      const code = `
        function App() {
          return (
            <div>
              <a href={userUrl} target="_blank">Link</a>
              <input name={fieldName} />
            </div>
          );
        }
      `;

      const transformed = (compilerPlugin as any).transform(code, "src/App.tsx");
      expect(transformed).not.toBeNull();
      // urlShield is active
      expect(transformed.code).toContain("_safeUrl(userUrl)");
      // relShield is disabled
      expect(transformed.code).not.toContain("noopener");
      // clobberShield is disabled
      expect(transformed.code).not.toContain("_safeName");
    });
  });

  describe("File Output Cleanliness & Helper Isolation", () => {
    it("only emits the specific helpers that are actually used in a file", () => {
      // File A only uses dynamic URL: only _safeUrl should be emitted
      const fileA = "<a href={userUrl}>Link</a>";
      const resultA = compileJsx(fileA, { security: true });

      expect(resultA.code).toContain("const _safeUrl =");
      expect(resultA.code).not.toContain("_safeName");
      expect(resultA.code).not.toContain("_safeHtml");
      expect(resultA.code).not.toContain("_cleanSpread");

      // File B only uses dynamic ID: only _safeName should be emitted
      const fileB = "<input id={customId} />";
      const resultB = compileJsx(fileB, { security: true });

      expect(resultB.code).toContain("const _safeName =");
      expect(resultB.code).not.toContain("_safeUrl");
      expect(resultB.code).not.toContain("_safeHtml");
      expect(resultB.code).not.toContain("_cleanSpread");

      // File C only uses static links with target="_blank": zero helpers emitted!
      const fileC = '<a href="https://example.com" target="_blank">Link</a>';
      const resultC = compileJsx(fileC, { security: true });

      expect(resultC.code).toContain('rel=\\"noopener noreferrer\\"');
      expect(resultC.code).not.toContain("const _safe");
      expect(resultC.code).not.toContain("const _cleanSpread");
    });
  });
});
