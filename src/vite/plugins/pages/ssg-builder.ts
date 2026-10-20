import type { VisageLogger } from "../../logger";
import { pc } from "../../logger";
import { generateHtmlShell } from "../../pages/generator";
import type { PageRoute, PageSpecialFiles, PagesOptions } from "../../pages/types";

export interface SsgBuildParams {
  options: PagesOptions;
  routes: PageRoute[];
  special: PageSpecialFiles;
  base: string;
  rootId: string;
  vLog: VisageLogger;
}

export function buildSsgAssets(ctx: any, entryChunks: Map<string, any>, params: SsgBuildParams) {
  const { options, routes, special, base, rootId, vLog } = params;
  let generatedCount = 0;

  const allPathsToRender: { path: string; name: string }[] = [];
  for (const route of routes) {
    if (!route.isDynamic && !route.isCatchAll) {
      const name =
        route.path === "/"
          ? "index"
          : route.path.replace(/^\/+/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
      allPathsToRender.push({ path: route.path, name });
    }
  }

  if (options.staticPaths && Array.isArray(options.staticPaths)) {
    for (const sp of options.staticPaths) {
      const cleanSp = sp.startsWith("/") ? sp : `/${sp}`;
      const name = cleanSp.replace(/^\/+/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
      if (!allPathsToRender.some((p) => p.path === cleanSp)) {
        allPathsToRender.push({ path: cleanSp, name });
      }
    }
  }

  for (const item of allPathsToRender) {
    const chunk = entryChunks.get(`page-${item.name}`);
    if (!chunk) continue;

    const clientEntryUrl = `${base}/${chunk.fileName}`;

    let cssTags = "";
    const importedCss = (chunk as any).viteMetadata?.importedCss as Set<string> | undefined;
    if (importedCss) {
      for (const cssFile of importedCss) {
        cssTags += `\n    <link rel="stylesheet" crossorigin href="${base}/${cssFile}">`;
      }
    }

    const headTags = (options.headTags || "") + cssTags;
    const targetHtmlPath =
      item.path === "/" ? "index.html" : `${item.path.replace(/^\/+/, "")}/index.html`;

    const html = generateHtmlShell({
      title: options.title,
      rootId,
      clientEntryUrl,
      headTags,
      viewTransitions: options.viewTransitions !== false
    });

    ctx.emitFile({
      type: "asset",
      fileName: targetHtmlPath,
      source: html
    });
    generatedCount++;

    if (item.path !== "/") {
      const cleanHtmlPath = `${item.path.replace(/^\/+/, "")}.html`;
      ctx.emitFile({
        type: "asset",
        fileName: cleanHtmlPath,
        source: html
      });
      generatedCount++;
    }
  }

  if (special.notFound) {
    const chunk = entryChunks.get("page-404");
    if (chunk) {
      const clientEntryUrl = `${base}/${chunk.fileName}`;
      let cssTags = "";
      const importedCss = (chunk as any).viteMetadata?.importedCss as Set<string> | undefined;
      if (importedCss) {
        for (const cssFile of importedCss) {
          cssTags += `\n    <link rel="stylesheet" crossorigin href="${base}/${cssFile}">`;
        }
      }
      const headTags = (options.headTags || "") + cssTags;
      const html = generateHtmlShell({
        title: "404 - Not Found",
        rootId,
        clientEntryUrl,
        headTags,
        viewTransitions: options.viewTransitions !== false
      });

      ctx.emitFile({
        type: "asset",
        fileName: "404.html",
        source: html
      });
      generatedCount++;
    }
  }

  if (generatedCount > 0) {
    vLog.info(
      "visage:pages",
      `SSG static site generation complete ${pc.dim(`(${generatedCount} static HTML file${generatedCount === 1 ? "" : "s"} bundled)`)}`
    );
  }
}
