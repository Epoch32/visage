import { describe, expect, it } from "bun:test";
import { compileJsx } from "../src/vite/compiler";

describe("Security Transform: Event Handler Shield", () => {
  describe("Default Off Behavior", () => {
    it("does not throw on string event handlers when security is disabled", () => {
      const code = '<button onClick="doSubmit()">Submit</button>';
      // When security is disabled, it compiles (placed into static attributes)
      const result = compileJsx(code);
      expect(result.code).toContain('onClick=\\"doSubmit()\\"');
    });
  });

  describe("String Event Handler Prevention (Compile-Time)", () => {
    it("throws a compile-time error when an event handler receives a static string literal", () => {
      const eventAttributes = [
        'onClick="handleClick()"',
        'onFocus="handleFocus()"',
        'onBlur="handleBlur()"',
        'onMouseEnter="trackEnter()"',
        'onKeyDown="handleKey()"',
        'onSubmit="doSubmit()"'
      ];

      for (const attr of eventAttributes) {
        const code = `<button ${attr}>Button</button>`;
        expect(() => {
          compileJsx(code, { security: true });
        }).toThrow(/\[visage:security\] Blocked string literal event handler in attribute/);
      }
    });

    it("throws a compile-time error when an event handler receives a string JSX expression container", () => {
      const code = '<button onClick={"doClick()"}>Click</button>';
      expect(() => {
        compileJsx(code, { security: true });
      }).toThrow(/\[visage:security\] Blocked string literal event handler in attribute "onClick"/);
    });

    it("throws a compile-time error when an event handler receives a template literal", () => {
      const simpleTemplate = "<button onClick={`doClick()`}>Click</button>";
      expect(() => {
        compileJsx(simpleTemplate, { security: true });
      }).toThrow(/\[visage:security\] Blocked string literal event handler in attribute "onClick"/);

      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal template expression in JSX source code
      const dynamicTemplate = "<button onMouseOver={`trackEvent(${id})`}>Hover</button>";
      expect(() => {
        compileJsx(dynamicTemplate, { security: true });
      }).toThrow(
        /\[visage:security\] Blocked string literal event handler in attribute "onMouseOver"/
      );
    });

    it("blocks string handlers on capture event attributes", () => {
      const code = '<button onCapture:click="captureHandler()">Capture</button>';
      expect(() => {
        compileJsx(code, { security: true });
      }).toThrow(
        /\[visage:security\] Blocked string literal event handler in attribute "onCapture:click"/
      );
    });

    it("provides clear diagnostic message with attribute name and snippet", () => {
      const code = '<input onInput="validateInput()" />';
      expect(() => {
        compileJsx(code, { security: true });
      }).toThrow(
        '[visage:security] Blocked string literal event handler in attribute "onInput" ("validateInput()"). Event handlers must be functions.'
      );
    });

    it("permits valid function identifiers", () => {
      const code = "<button onClick={handleClick}>Submit</button>";
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain("handleClick");
      expect(result.code).toContain("__click");
    });

    it("permits valid inline arrow function expressions", () => {
      const code = "<button onClick={(e) => console.log(e)}>Log</button>";
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain("__click");
    });

    it("permits valid event delegation tuples [handler, data]", () => {
      const code = "<button onClick={[handleSelect, item.id]}>Select</button>";
      const result = compileJsx(code, { security: true });

      expect(result.code).toContain("__click = handleSelect");
      expect(result.code).toContain("__clickData = item.id");
    });

    it("respects granular eventShield: false option", () => {
      const code = '<button onClick="doSubmit()">Submit</button>';
      const result = compileJsx(code, {
        security: {
          eventShield: false
        }
      });

      expect(result.code).toContain('onClick=\\"doSubmit()\\"');
    });
  });
});
