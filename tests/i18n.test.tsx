import { beforeEach, describe, expect, it } from "bun:test";
import { createI18n } from "../src/i18n";
import { createRoot } from "../src/signals";
import { setupDOM } from "./dom-mock";

describe("Visage Fine-Grained I18n & Community Translation Engine (visage/i18n)", () => {
  beforeEach(() => {
    setupDOM();
  });

  const baseTranslations = {
    en: {
      common: {
        welcome: "Welcome, {{name}}!",
        save: "Save"
      },
      items: {
        zero: "No items found",
        one: "{{count}} item",
        other: "{{count}} items"
      },
      nested: {
        deep: {
          key: "Deep value"
        }
      }
    },
    es: {
      common: {
        welcome: "¡Bienvenido, {{name}}!",
        save: "Guardar"
      },
      items: {
        zero: "No se encontraron artículos",
        one: "{{count}} artículo",
        other: "{{count}} artículos"
      }
    }
  };

  it("translates basic and nested keys with reactive locale switching", async () => {
    const i18n = createI18n({
      defaultLocale: "en",
      translations: baseTranslations
    });

    createRoot(() => {
      expect(i18n.locale()).toBe("en");
      expect(i18n.t("common.save")).toBe("Save");
      expect(i18n.t("common.welcome", { name: "Alice" })).toBe("Welcome, Alice!");
      expect(i18n.t("nested.deep.key")).toBe("Deep value");

      // Switch language reactively
      i18n.setLocale("es");
      expect(i18n.locale()).toBe("es");
      expect(i18n.t("common.save")).toBe("Guardar");
      expect(i18n.t("common.welcome", { name: "Carlos" })).toBe("¡Bienvenido, Carlos!");

      // Falls back to fallbackLocale if key is missing in Spanish
      expect(i18n.t("nested.deep.key")).toBe("Deep value");
    });
  });

  it("handles CLDR standard pluralization rules accurately", () => {
    const i18n = createI18n({
      defaultLocale: "en",
      translations: baseTranslations
    });

    expect(i18n.t("items", { count: 0 })).toBe("No items found");
    expect(i18n.t("items", { count: 1 })).toBe("1 item");
    expect(i18n.t("items", { count: 5 })).toBe("5 items");

    i18n.setLocale("es");
    expect(i18n.t("items", { count: 0 })).toBe("No se encontraron artículos");
    expect(i18n.t("items", { count: 1 })).toBe("1 artículo");
    expect(i18n.t("items", { count: 10 })).toBe("10 artículos");
  });

  it("returns fine-grained reactive accessor that updates when locale changes", async () => {
    const i18n = createI18n({
      defaultLocale: "en",
      translations: baseTranslations
    });

    createRoot(() => {
      const greeting = i18n.accessor("common.welcome", { name: "Grace" });
      expect(greeting()).toBe("Welcome, Grace!");

      i18n.setLocale("es");
      expect(greeting()).toBe("¡Bienvenido, Grace!");
    });
  });

  it("loads translations asynchronously with dynamic loader (e.g. Crowdin OTA / dynamic import)", async () => {
    const mockRemoteFr = {
      common: {
        welcome: "Bienvenue, {{name}}!",
        save: "Enregistrer"
      }
    };

    const i18n = createI18n({
      defaultLocale: "en",
      translations: baseTranslations,
      loader: async (locale) => {
        if (locale === "fr") {
          return mockRemoteFr;
        }
        throw new Error("Locale not found");
      }
    });

    expect(i18n.has("common.save", "fr")).toBe(false);

    // Asynchronously switch to french
    await i18n.setLocale("fr");

    expect(i18n.locale()).toBe("fr");
    expect(i18n.t("common.save")).toBe("Enregistrer");
    expect(i18n.t("common.welcome", { name: "Amélie" })).toBe("Bienvenue, Amélie!");
    expect(i18n.has("common.save")).toBe(true);
  });

  it("supports in-context translation wrapping for Crowdin / Weblate visual editor", () => {
    const i18n = createI18n({
      defaultLocale: "en",
      translations: baseTranslations,
      inContext: true
    });

    const rendered = i18n.t("common.save");
    expect(rendered).toBe("<!-- crwdns:common.save -->Save<!-- /crwdns -->");

    const customI18n = createI18n({
      defaultLocale: "en",
      translations: baseTranslations,
      inContext: (key, text) => `[translate:${key}]${text}[/translate]`
    });

    expect(customI18n.t("common.save")).toBe("[translate:common.save]Save[/translate]");
  });

  it("formats numbers and dates reactively using Intl", () => {
    const i18n = createI18n({
      defaultLocale: "en-US",
      translations: baseTranslations
    });

    const numFormatted = i18n.formatNumber(12500.5, { style: "currency", currency: "USD" });
    expect(numFormatted).toContain("12,500.50");

    const relative = i18n.formatRelativeTime(-1, "day", { numeric: "auto" });
    expect(relative).toContain("yesterday");
  });

  it("merges dynamic dictionaries and reports missing keys with custom handler", () => {
    const i18n = createI18n({
      defaultLocale: "en",
      translations: baseTranslations,
      onMissingKey: (key) => `MISSING[${key}]`
    });

    expect(i18n.t("non.existent.key")).toBe("MISSING[non.existent.key]");

    // Dynamically add translations
    i18n.addTranslations("en", {
      newSection: {
        feature: "New Feature Title"
      }
    });

    expect(i18n.t("newSection.feature")).toBe("New Feature Title");
  });
});
