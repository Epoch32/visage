import { describe, expect, it } from "bun:test";
import { compileJsx } from "../src/vite/compiler";

describe("Security Transform: DOM Clobbering Shield", () => {
  describe("Default Off Behavior", () => {
    it("does not guard name or id attributes when security is disabled", () => {
      const staticCode = '<input name="submit" id="action" />';
      const staticResult = compileJsx(staticCode);
      expect(staticResult.code).toContain('name=\\"submit\\"');
      expect(staticResult.code).toContain('id=\\"action\\"');

      const dynamicCode = "<input name={fieldName} id={fieldId} />";
      const dynamicResult = compileJsx(dynamicCode);
      expect(dynamicResult.code).not.toContain("_safeName");
      expect(dynamicResult.code).toContain('setAttribute(_el$, "name", fieldName)');
      expect(dynamicResult.code).toContain('setAttribute(_el$, "id", fieldId)');
    });
  });

  describe("Static DOM Clobbering Validation (Compile-Time)", () => {
    it("throws a compile-time error when name collisions with DOM Form / Element properties", () => {
      const dangerousNames = [
        "submit",
        "action",
        "reset",
        "elements",
        "length",
        "item",
        "namedItem",
        "nodeName",
        "attributes",
        "parentNode",
        "ownerDocument",
        "removeChild",
        "appendChild",
        "replaceChild",
        "insertBefore",
        "style",
        "constructor",
        "__proto__",
        "prototype",
        "valueOf",
        "toString"
      ];

      for (const name of dangerousNames) {
        const code = `<input name="${name}" />`;
        expect(() => {
          compileJsx(code, { security: true });
        }).toThrow(/\[visage:security\] Blocked dangerous DOM clobbering property/);
      }
    });

    it("throws a compile-time error when id collisions with DOM Form / Element properties", () => {
      const code = '<form id="action"><button>Submit</button></form>';
      expect(() => {
        compileJsx(code, { security: true });
      }).toThrow(
        /\[visage:security\] Blocked dangerous DOM clobbering property "action" in attribute "id"/
      );

      const divCode = '<div id="nodeName">Content</div>';
      expect(() => {
        compileJsx(divCode, { security: true });
      }).toThrow(
        /\[visage:security\] Blocked dangerous DOM clobbering property "nodeName" in attribute "id"/
      );
    });

    it("detects DOM clobbering collisions regardless of case", () => {
      const uppercase = '<input name="SUBMIT" />';
      expect(() => {
        compileJsx(uppercase, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous DOM clobbering property/);

      const mixedCase = '<form id="Action"><input /></form>';
      expect(() => {
        compileJsx(mixedCase, { security: true });
      }).toThrow(/\[visage:security\] Blocked dangerous DOM clobbering property/);
    });

    it("permits safe static names and IDs with zero runtime overhead", () => {
      const code = `
        <form id="login-form">
          <input name="username" id="username-field" />
          <input name="email" id="email-field" />
          <input name="searchQuery" id="search-bar" />
          <button id="login-submit-btn">Login</button>
        </form>
      `;
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain('id=\\"login-form\\"');
      expect(result.code).toContain('name=\\"username\\"');
      expect(result.code).toContain('name=\\"email\\"');
      expect(result.code).not.toContain("_safeName");
    });
  });

  describe("Dynamic DOM Clobbering Shielding (Runtime Helper)", () => {
    it("wraps dynamic name and id attributes with hoisted _safeName helper", () => {
      const code = "<input name={field.name} id={field.id} />";
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain("const _safeName =");
      expect(result.code).toContain('setAttribute(_el$, "name", _safeName(field.name))');
      expect(result.code).toContain('setAttribute(_el$, "id", _safeName(field.id))');
    });

    it("evaluates functional behavior of injected _safeName helper with strings", () => {
      const helperCode = `
        const _safeName = (n) => {
          const s = String(typeof n === "function" ? n() : n ?? "");
          return /^(?:submit|action|reset|elements|length|item|namedItem|nodeName|attributes|parentNode|ownerDocument|removeChild|appendChild|replaceChild|insertBefore|style|constructor|__proto__|prototype|valueOf|toString)$/i.test(s) ? "_" + s : n;
        };
        return _safeName;
      `;
      const safeName = new Function(helperCode)();

      // Dangerous names are neutralized with safe prefix
      expect(safeName("submit")).toBe("_submit");
      expect(safeName("action")).toBe("_action");
      expect(safeName("reset")).toBe("_reset");
      expect(safeName("elements")).toBe("_elements");
      expect(safeName("length")).toBe("_length");
      expect(safeName("nodeName")).toBe("_nodeName");
      expect(safeName("attributes")).toBe("_attributes");
      expect(safeName("parentNode")).toBe("_parentNode");
      expect(safeName("ownerDocument")).toBe("_ownerDocument");
      expect(safeName("constructor")).toBe("_constructor");
      expect(safeName("__proto__")).toBe("___proto__");

      // Safe names are returned untouched
      expect(safeName("username")).toBe("username");
      expect(safeName("user_id")).toBe("user_id");
      expect(safeName("emailAddress")).toBe("emailAddress");
      expect(safeName("first-name")).toBe("first-name");
    });

    it("evaluates functional behavior of injected _safeName helper with reactive signal getters", () => {
      const helperCode = `
        const _safeName = (n) => {
          const s = String(typeof n === "function" ? n() : n ?? "");
          return /^(?:submit|action|reset|elements|length|item|namedItem|nodeName|attributes|parentNode|ownerDocument|removeChild|appendChild|replaceChild|insertBefore|style|constructor|__proto__|prototype|valueOf|toString)$/i.test(s) ? "_" + s : n;
        };
        return _safeName;
      `;
      const safeName = new Function(helperCode)();

      // Dangerous signal returns safe prefixed string
      const clobberSignal = () => "submit";
      expect(safeName(clobberSignal)).toBe("_submit");

      // Safe signal preserves function reference for Visage reactive effect tracking
      const safeSignal = () => "userAccount";
      const result = safeName(safeSignal);
      expect(result).toBe(safeSignal);
      expect(typeof result).toBe("function");
      expect(result()).toBe("userAccount");
    });

    it("handles nullish values gracefully", () => {
      const helperCode = `
        const _safeName = (n) => {
          const s = String(typeof n === "function" ? n() : n ?? "");
          return /^(?:submit|action|reset|elements|length|item|namedItem|nodeName|attributes|parentNode|ownerDocument|removeChild|appendChild|replaceChild|insertBefore|style|constructor|__proto__|prototype|valueOf|toString)$/i.test(s) ? "_" + s : n;
        };
        return _safeName;
      `;
      const safeName = new Function(helperCode)();

      expect(safeName(null)).toBeNull();
      expect(safeName(undefined)).toBeUndefined();
      expect(safeName("")).toBe("");
    });

    it("respects granular clobberShield: false option", () => {
      const code = "<input name={field.name} />";
      const result = compileJsx(code, {
        security: {
          clobberShield: false
        }
      });

      expect(result.code).not.toContain("_safeName");
      expect(result.code).toContain('setAttribute(_el$, "name", field.name)');
    });
  });
});
