import type { VisageLogger } from "../logger";
import type { NoScriptPluginOptions, VisageVitePlugin } from "../types";

/**
 * Creates the visage:noscript Vite plugin.
 *
 * Automatically injects an accessible, styled <noscript> fallback into the HTML entry shell
 * so users with JavaScript disabled receive a clean, friendly message or page instead of a broken screen.
 */
export function createNoScriptPlugin(
  options: boolean | string | NoScriptPluginOptions | undefined,
  vLog: VisageLogger
): VisageVitePlugin {
  return {
    name: "visage:noscript",
    transformIndexHtml(html: string) {
      if (!options) return html;

      const opts: NoScriptPluginOptions =
        typeof options === "string"
          ? { message: options }
          : typeof options === "object"
            ? options
            : {};

      const title = opts.title ?? "JavaScript Required";
      const message =
        opts.message ??
        "This application requires JavaScript to function properly. Please enable JavaScript in your browser settings and reload the page.";
      const mode = opts.mode ?? "page";

      let noscriptHtml = "";

      if (mode === "page") {
        noscriptHtml = `
    <noscript>
      <style>
        .visage-noscript-page {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          box-sizing: border-box;
        }
        .visage-noscript-card {
          max-width: 460px;
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 32px 24px;
          background: #f9fafb;
          text-align: center;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .visage-noscript-title {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 10px 0;
        }
        .visage-noscript-desc {
          font-size: 14px;
          line-height: 1.5;
          color: #4b5563;
          margin: 0;
        }
        @media (prefers-color-scheme: dark) {
          .visage-noscript-page {
            background: #0f1115;
          }
          .visage-noscript-card {
            background: #17191e;
            border-color: #2a2e37;
          }
          .visage-noscript-title {
            color: #f3f4f6;
          }
          .visage-noscript-desc {
            color: #9ca3af;
          }
        }
      </style>
      <div class="visage-noscript-page ${opts.className ?? ""}" style="${opts.style ?? ""}">
        <div class="visage-noscript-card">
          <h1 class="visage-noscript-title">${title}</h1>
          <p class="visage-noscript-desc">${message}</p>
        </div>
      </div>
    </noscript>`;
      } else {
        noscriptHtml = `
    <noscript>
      <style>
        .visage-noscript-banner {
          display: block;
          padding: 14px 20px;
          background: #fef3c7;
          color: #92400e;
          border-bottom: 1px solid #f59e0b;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 14px;
          text-align: center;
          box-sizing: border-box;
        }
        @media (prefers-color-scheme: dark) {
          .visage-noscript-banner {
            background: #2b1f0c;
            color: #fde68a;
            border-bottom-color: #b45309;
          }
        }
      </style>
      <div class="visage-noscript-banner ${opts.className ?? ""}" style="${opts.style ?? ""}">
        <strong>${title}:</strong> ${message}
      </div>
    </noscript>`;
      }

      vLog.info("visage:noscript", `Injected <noscript> ${mode} fallback into HTML shell`);

      if (html.includes("<body")) {
        return html.replace(/<body([^>]*)>/i, `<body$1>${noscriptHtml}`);
      }
      return `${noscriptHtml}\n${html}`;
    }
  };
}
