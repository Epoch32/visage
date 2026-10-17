import type { PageRoute, PageSpecialFiles } from "./types";

/**
 * Escapes characters for HTML text insertion
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Generates the synthesized client mount script for a page route
 */
export function generateClientEntry(
  route: PageRoute,
  params: Record<string, string>,
  special: PageSpecialFiles,
  rootId: string
): string {
  const pageImportPath = JSON.stringify(route.filePath);
  const layoutImportPath = special.layout ? JSON.stringify(special.layout) : null;
  const serializedParams = JSON.stringify(params);

  return `
import { render } from "@epoch32/visage";
import PageComponent from ${pageImportPath};
${layoutImportPath ? `import RootLayout from ${layoutImportPath};` : ""}

const params = ${serializedParams};
const target = document.getElementById(${JSON.stringify(rootId)});

if (target) {
  render(() => {
    ${
      layoutImportPath
        ? `return RootLayout({ params, children: PageComponent({ params }) });`
        : `return PageComponent({ params });`
    }
  }, target);
}
`.trim();
}

/**
 * Generates the synthesized client mount script for a custom 404 page
 */
export function generateNotFoundEntry(notFoundFilePath: string, rootId: string): string {
  return `
import { render } from "@epoch32/visage";
import NotFoundComponent from ${JSON.stringify(notFoundFilePath)};

const target = document.getElementById(${JSON.stringify(rootId)});
if (target) {
  render(() => NotFoundComponent({}), target);
}
`.trim();
}

/**
 * Embedded soft-navigation and View Transitions runtime for MPA pages
 */
export const softNavScript = `
(() => {
  if (typeof window === "undefined" || window.__visage_soft_nav) return;
  window.__visage_soft_nav = true;

  async function navigate(url, isPopState) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        window.location.href = url;
        return;
      }
      const htmlText = await res.text();
      const nextDoc = new DOMParser().parseFromString(htmlText, "text/html");

      const updateDom = async () => {
        document.title = nextDoc.title;

        for (const el of nextDoc.head.querySelectorAll("link[rel='stylesheet'], style")) {
          const href = el.getAttribute("href");
          const devId = el.getAttribute("data-vite-dev-id");
          const selector = href
            ? "link[href=\\"" + href + "\\"]"
            : devId
              ? "style[data-vite-dev-id=\\"" + devId + "\\"]"
              : null;
          if (!selector || !document.head.querySelector(selector)) {
            document.head.appendChild(el.cloneNode(true));
          }
        }

        const nextScript = nextDoc.querySelector("script[type='module']");
        const nextScriptSrc = nextScript ? nextScript.getAttribute("src") : null;

        if (!isPopState) {
          window.history.pushState({ visage: true }, "", url);
        }

        if (nextScriptSrc) {
          await import(/* @vite-ignore */ nextScriptSrc);
        }

        window.scrollTo(0, 0);
      };

      if (document.startViewTransition) {
        document.startViewTransition(updateDom);
      } else {
        await updateDom();
      }
    } catch {
      window.location.href = url;
    }
  }

  document.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
    const a = e.target.closest("a");
    if (!a || !a.href) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download") || a.hasAttribute("data-reload")) return;

    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      return;
    }

    e.preventDefault();
    navigate(url.href, false);
  });

  window.addEventListener("popstate", () => {
    navigate(window.location.href, true);
  });
})();
`.trim();

/**
 * Generates the HTML shell for a given route and client entry script URL
 */
export function generateHtmlShell(options: {
  title?: string;
  rootId?: string;
  clientEntryUrl: string;
  headTags?: string;
  viewTransitions?: boolean;
}): string {
  const {
    title = "Visage App",
    rootId = "visage-root",
    clientEntryUrl,
    headTags = "",
    viewTransitions = false
  } = options;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    ${headTags}
  </head>
  <body>
    <div id="${escapeHtml(rootId)}"></div>
    <script type="module" src="${clientEntryUrl}"></script>
    ${viewTransitions ? `<script>${softNavScript}</script>` : ""}
  </body>
</html>`;
}

/**
 * Generates a default styled 404 HTML document if no custom 404.tsx component was provided
 */
export function generateDefault404Html(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>404 - Page Not Found | Visage</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        background-color: #0c0d14;
        color: #f0f6fc;
      }
      .container {
        text-align: center;
        padding: 40px 24px;
      }
      h1 {
        font-size: 72px;
        font-weight: 800;
        margin: 0;
        background: linear-gradient(90deg, #93c5fd, #c084fc, #f472b6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -2px;
      }
      p.desc {
        color: #94a3b8;
        font-size: 16px;
        margin: 12px 0 24px;
      }
      a.back-btn {
        display: inline-block;
        background: #1e2238;
        color: #93c5fd;
        border: 1px solid #2d3356;
        padding: 8px 18px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.15s ease;
      }
      a.back-btn:hover {
        background: #282e4e;
        border-color: #3d4677;
        color: #fff;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>404</h1>
      <p class="desc">The page you requested could not be found.</p>
      <a href="/" class="back-btn">Return to Homepage</a>
    </div>
  </body>
</html>`;
}
