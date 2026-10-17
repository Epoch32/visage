import { describe, expect, it } from "bun:test";
import {
  generateStoragePrebootScript,
  injectStoragePrebootScript,
  scanCodeForPersistentSignals,
  visage
} from "../src/vite";

describe("Storage Preboot Experimental Transform (visage/vite)", () => {
  describe("AST Signal Scanner", () => {
    it("detects basic persistent signals with string key", () => {
      const code = `
        import { signal } from "visage/signals";
        const theme = signal("system", { persist: "theme" });
      `;
      const items = scanCodeForPersistentSignals(code);
      expect(items.length).toBe(1);
      expect(items[0]?.key).toBe("theme");
      expect(items[0]?.attribute).toBe("data-theme");
      expect(items[0]?.colorSchemeQuery).toBe(true);
      expect(items[0]?.fallback).toBe("system");
      expect(items[0]?.storage).toBe("local");
    });

    it("detects signals with explicit object persist options", () => {
      const code = `
        import { createSignal } from "visage";
        const sidebar = createSignal("expanded", {
          persist: {
            key: "sidebar-layout",
            storage: "session",
            attribute: "data-sidebar"
          }
        });
      `;
      const items = scanCodeForPersistentSignals(code);
      expect(items.length).toBe(1);
      expect(items[0]?.key).toBe("sidebar-layout");
      expect(items[0]?.storage).toBe("session");
      expect(items[0]?.attribute).toBe("data-sidebar");
      expect(items[0]?.fallback).toBe("expanded");
      expect(items[0]?.colorSchemeQuery).toBe(false);
    });

    it("supports class attribute targeting for body or html", () => {
      const code = `
        const compact = signal("compact-mode", {
          persist: {
            key: "density",
            attribute: "class",
            targetElement: "body"
          }
        });
      `;
      const items = scanCodeForPersistentSignals(code);
      expect(items.length).toBe(1);
      expect(items[0]?.key).toBe("density");
      expect(items[0]?.attribute).toBe("class");
      expect(items[0]?.targetElement).toBe("body");
    });

    it("returns empty array for code without persist", () => {
      const code = `
        const count = signal(0);
        const double = computed(() => count() * 2);
      `;
      const items = scanCodeForPersistentSignals(code);
      expect(items.length).toBe(0);
    });
  });

  describe("Script Generator & HTML Injector", () => {
    it("generates compact preboot script with window.__VISAGE_PREBOOT__ mapping", () => {
      const script = generateStoragePrebootScript([
        {
          key: "theme",
          attribute: "data-theme",
          fallback: "system",
          colorSchemeQuery: true,
          storage: "local"
        },
        {
          key: "sidebar",
          attribute: "data-sidebar",
          fallback: "open",
          colorSchemeQuery: false,
          storage: "session"
        }
      ]);

      expect(script).toContain('<script data-visage-preboot="true">');
      expect(script).toContain("__VISAGE_PREBOOT__");
      expect(script).toContain("localStorage");
      expect(script).toContain("sessionStorage");
      expect(script).toContain("prefers-color-scheme: dark");
      expect(script).toContain("data-theme");
      expect(script).toContain("data-sidebar");
    });

    it("injects preboot script immediately after <head> in HTML shell", () => {
      const html = `<!DOCTYPE html><html><head><title>Test</title></head><body><div id="app"></div></body></html>`;
      const script = `<script data-visage-preboot="true">/* preboot */</script>`;
      const result = injectStoragePrebootScript(html, script);

      expect(result).toContain(
        '<head>\n    <script data-visage-preboot="true">/* preboot */</script>'
      );
      expect(result).toContain("<title>Test</title>");
    });

    it("avoids duplicate script injections", () => {
      const html = `<html><head><script data-visage-preboot="true">/* existing */</script></head><body></body></html>`;
      const script = `<script data-visage-preboot="true">/* new */</script>`;
      const result = injectStoragePrebootScript(html, script);

      expect(result).toBe(html);
    });
  });

  describe("Vite Plugin Integration", () => {
    it("remains completely dormant when storagePreboot is not enabled", () => {
      const plugins = visage();
      const prebootPlugin = plugins.find((p) => p.name === "visage:storage-preboot");
      expect(prebootPlugin).toBeUndefined();
    });

    it("activates visage:storage-preboot plugin when explicitly configured", async () => {
      const plugins = visage({
        experimental: {
          storagePreboot: {
            states: [
              {
                key: "theme-pref",
                attribute: "data-theme",
                fallback: "system",
                colorSchemeQuery: true
              }
            ]
          }
        }
      });

      const prebootPlugin = plugins.find((p) => p.name === "visage:storage-preboot");
      expect(prebootPlugin).toBeDefined();

      // Test transformIndexHtml hook
      const initialHtml =
        "<!DOCTYPE html><html><head><title>App</title></head><body></body></html>";
      const transformedHtml = await (prebootPlugin as any).transformIndexHtml(initialHtml);

      expect(transformedHtml).toContain('data-visage-preboot="true"');
      expect(transformedHtml).toContain("theme-pref");
      expect(transformedHtml).toContain("data-theme");
      expect(transformedHtml).toContain("__VISAGE_PREBOOT__");
    });
  });
});
