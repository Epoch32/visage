import { beforeEach, describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import {
  createStyle,
  css,
  cx,
  extractStyleTags,
  render,
  Style,
  scopeCSS,
  scopeSelector,
  signal,
  styleManager
} from "../src";

describe("Visage Scoped Styles & CSS Engine (visage/style)", () => {
  let container: HTMLElement;

  beforeEach(() => {
    styleManager.clear();
    container = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(container);
  });

  describe("Selector and CSS Scoping Parser", () => {
    it("scopes standard compound class and element selectors", () => {
      const scoped = scopeSelector(".card > .title:hover, button", { scopeId: "v-123" });
      expect(scoped).toContain(".card[data-v-123] > .title[data-v-123]:hover");
      expect(scoped).toContain("button[data-v-123]");
    });

    it("scopes selectors with passToChildren=true as descendant rules", () => {
      const scoped = scopeSelector(".step-node, button", {
        scopeId: "v-abc",
        passToChildren: true
      });
      expect(scoped).toContain("[data-v-abc] .step-node");
      expect(scoped).toContain("[data-v-abc] button");
    });

    it("unwraps :global() selectors leaving them un-scoped", () => {
      const scoped = scopeSelector(".parent :global(.global-btn)", { scopeId: "v-123" });
      expect(scoped).toBe(".parent[data-v-123] .global-btn");

      const rootGlobal = scopeSelector(":global(body)", { scopeId: "v-123" });
      expect(rootGlobal).toBe("body");
    });

    it("transforms :deep() selectors to target descendant elements", () => {
      const scoped = scopeSelector(".dialog :deep(.close-btn)", { scopeId: "v-123" });
      expect(scoped).toBe(".dialog[data-v-123] .close-btn");

      const topDeep = scopeSelector(":deep(.badge)", { scopeId: "v-123" });
      expect(topDeep).toBe("[data-v-123] .badge");
    });

    it("scopes @keyframes definitions and renames animation references", () => {
      const rawCSS = `
        @keyframes pulse {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        .dot {
          animation: pulse 2s infinite ease-in-out;
        }
      `;

      const scoped = scopeCSS(rawCSS, { scopeId: "v-xyz" });
      expect(scoped).toContain("@keyframes v-xyz-pulse");
      expect(scoped).toContain("animation: v-xyz-pulse 2s infinite ease-in-out;");
    });

    it("preserves and transforms rules inside nested @media queries", () => {
      const rawCSS = `
        .container { width: 100%; }
        @media (min-width: 768px) {
          .container { width: 750px; }
          .title { font-size: 2rem; }
        }
      `;

      const scoped = scopeCSS(rawCSS, { scopeId: "v-m1" });
      expect(scoped).toContain(".container[data-v-m1] { width: 100%; }");
      expect(scoped).toContain("@media (min-width: 768px)");
      expect(scoped).toContain(".container[data-v-m1] { width: 750px; }");
      expect(scoped).toContain(".title[data-v-m1] { font-size: 2rem; }");
    });

    it("correctly parses rules with string literals or comments containing braces without premature truncation", () => {
      const rawCSS = `
        .tooltip::after {
          content: "}";
          color: red;
        }
        .code::before {
          /* { unescaped comment brace */
          content: '{';
        }
        .card {
          padding: 8px;
          & .nested {
            color: blue;
          }
        }
      `;

      const scoped = scopeCSS(rawCSS, { scopeId: "v-braces" });
      expect(scoped).toContain(".tooltip[data-v-braces]::after {");
      expect(scoped).toContain('content: "}";');
      expect(scoped).toContain("color: red;");
      expect(scoped).toContain(".code[data-v-braces]::before {");
      expect(scoped).toContain(".card[data-v-braces] {");
      expect(scoped).toContain("& .nested {");
    });
  });

  describe("createStyle and tagged template css", () => {
    it("generates hashed class names and injects scoped stylesheet", () => {
      const styles = createStyle(`
        .card { padding: 16px; }
        .active { color: blue; }
      `);

      expect(styles.card).toBe(`card_${styles.scope}`);
      expect(styles.active).toBe(`active_${styles.scope}`);
      expect(styleManager.has(styles.scope)).toBe(true);

      const combined = styles.cx(styles.card, { [styles.active]: true, hidden: false });
      expect(combined).toBe(`${styles.card} ${styles.active}`);
    });

    it("creates standalone scoped class using css tagged template", () => {
      const btnClass = css`
        background: red;
        color: white;
      `;

      expect(btnClass.startsWith("visage_cls-")).toBe(true);
    });

    it("supports object style maps in createStyle", () => {
      const styles = createStyle({
        card: { background: "#ffffff", padding: "20px", borderRadius: "8px" },
        active: { color: "blue", "&:hover": { color: "darkblue" } }
      });

      expect(styles.card).toBe(`card_${styles.scope}`);
      expect(styles.active).toBe(`active_${styles.scope}`);
      expect(styleManager.has(styles.scope)).toBe(true);
    });
  });

  describe("Enhanced Reactive class / className Prop Handling", () => {
    it("reactively updates class when using object conditional syntax", () => {
      const currentStep = signal(1);

      const unmount = render(
        () => (
          <div
            id="test-node"
            class={{
              "step-node": true,
              active: () => currentStep() === 1,
              completed: () => currentStep() > 1
            }}
          />
        ),
        container
      );

      const el = container.querySelector("#test-node");
      expect(el?.getAttribute("class")).toBe("step-node active");

      // Move to step 2
      currentStep.set(2);
      expect(el?.getAttribute("class")).toBe("step-node completed");

      unmount();
    });

    it("reactively updates class when using array syntax", () => {
      const isOnline = signal(false);

      const unmount = render(
        () => <div id="status-node" class={["badge", () => (isOnline() ? "online" : "offline")]} />,
        container
      );

      const el = container.querySelector("#status-node");
      expect(el?.getAttribute("class")).toBe("badge offline");

      isOnline.set(true);
      expect(el?.getAttribute("class")).toBe("badge online");

      unmount();
    });

    it("evaluates cx utility helper correctly", () => {
      const isPrimary = signal(true);
      const isLarge = false;

      const result = cx("btn", { "btn-primary": () => isPrimary(), "btn-lg": isLarge }, [
        "extra",
        undefined
      ]);
      expect(result).toBe("btn btn-primary extra");
    });
  });

  describe("<Style> JSX Component", () => {
    it("mounts <Style> block, attaches scope attribute to parent, and injects into head", async () => {
      function MyComponent() {
        return (
          <div id="target-box" class="box">
            <span class="label">Hello Scoped</span>
            <Style>{`
              .box { padding: 20px; }
              .label { font-weight: 700; }
            `}</Style>
          </div>
        );
      }

      const unmount = render(() => <MyComponent />, container);

      // Wait for microtask to attach data-v-xxx attribute
      await new Promise((r) => queueMicrotask(() => r(null)));

      const box = container.querySelector("#target-box");
      expect(box).not.toBeNull();

      // Find attribute starting with data-v-
      const attrNames = Array.from((box as HTMLElement).attributes).map((a) => a.name);
      const hasScopeAttr = attrNames.some((name) => name.startsWith("data-v-"));
      expect(hasScopeAttr).toBe(true);

      // Verify <style> element injected into document.head
      const headStyles = document.head.querySelectorAll("style[data-visage-scope]");
      expect(headStyles.length > 0).toBe(true);

      unmount();
    });
  });

  describe("SSR Style Extraction", () => {
    it("collects scoped styles rendered on server and extracts style tags", () => {
      styleManager.clear();

      createStyle(`
        .serverCard { margin: 10px; }
      `);

      const ssrOutput = extractStyleTags();
      expect(ssrOutput).toContain("data-visage-ssr");
      expect(ssrOutput).toContain(".serverCard_");
    });

    it("adopts existing SSR style tags in the document without creating duplicates", () => {
      styleManager.clear();

      // Simulate SSR pre-rendered style tag in head
      const ssrTag = document.createElement("style");
      ssrTag.id = "visage-style-v-ssr-test";
      ssrTag.textContent = ".card { color: red; }";
      document.head.appendChild(ssrTag);

      const beforeCount = document.head.querySelectorAll("#visage-style-v-ssr-test").length;
      expect(beforeCount).toBe(1);

      // Client injects matching style
      const uninject = styleManager.inject("v-ssr-test", ".card { color: red; }");

      // Verify no duplicate tag was appended
      const afterCount = document.head.querySelectorAll("#visage-style-v-ssr-test").length;
      expect(afterCount).toBe(1);

      uninject();
    });
  });
});
