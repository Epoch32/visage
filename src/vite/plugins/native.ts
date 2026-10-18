import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { DetectedOrigins } from "../compiler/types";
import { buildCspString, injectCspMetaTag } from "../csp";
import { pc, type VisageLogger } from "../logger";
import { scaffoldZigNative } from "../native-scaffold";
import type { CSPOptions, VisageVitePlugin, ZigNativeOptions } from "../types";

declare const process: any;

export function inlineSingleFileHtml(
  outDir: string,
  csp?: boolean | CSPOptions,
  detectedOrigins?: DetectedOrigins,
  virtualOrigin?: string
): void {
  const htmlPath = path.join(outDir, "index.html");
  if (!fs.existsSync(htmlPath)) return;

  let html = fs.readFileSync(htmlPath, "utf8");

  // Remove modulepreload links to prevent failed fetches on data / memory origins
  html = html.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, "");

  // Inline stylesheet links
  html = html.replace(
    /<link\b[^>]*href=["'](?:\.\/)?assets\/([^"']+)["'][^>]*>/gi,
    (match, file) => {
      const assetPath = path.join(outDir, "assets", file);
      if (fs.existsSync(assetPath)) {
        const content = fs.readFileSync(assetPath, "utf8");
        return `<style>\n${content}\n</style>`;
      }
      return match;
    }
  );

  // Inline script tags and capture SHA-256 hashes for CSP
  const scriptHashes: string[] = [];
  const inlinedScripts: string[] = [];
  html = html.replace(
    /<script\b[^>]*src=["'](?:\.\/)?assets\/([^"']+)["'][^>]*><\/script>/gi,
    (match, file) => {
      const assetPath = path.join(outDir, "assets", file);
      if (fs.existsSync(assetPath)) {
        const content = fs.readFileSync(assetPath, "utf8");
        const scriptCode = content.trim();
        try {
          const hash = crypto.createHash("sha256").update(scriptCode).digest("base64");
          scriptHashes.push(`'sha256-${hash}'`);
        } catch {
          // Ignore hash failure if crypto unavailable
        }
        inlinedScripts.push(`<script type="module">${scriptCode}</script>`);
        return "";
      }
      return match;
    }
  );

  if (inlinedScripts.length > 0) {
    const scriptsBlock = inlinedScripts.join("\n");
    if (html.includes("</body>")) {
      html = html.replace("</body>", `  ${scriptsBlock}\n</body>`);
    } else {
      html += `\n${scriptsBlock}`;
    }
  }

  // If virtualOrigin is set, ensure <base href="${virtualOrigin}/"> is present
  if (virtualOrigin && !/<base\b/i.test(html)) {
    const voBase = virtualOrigin.endsWith("/") ? virtualOrigin : `${virtualOrigin}/`;
    html = html.replace(/(<head\b[^>]*>)/i, `$1\n    <base href="${voBase}">`);
  }

  if (csp) {
    const mergedCspOpts: CSPOptions = typeof csp === "object" ? { ...csp } : {};
    if (virtualOrigin) {
      mergedCspOpts.virtualOrigin = virtualOrigin;
    }
    if (scriptHashes.length > 0) {
      const scriptSrc = new Set(mergedCspOpts.scriptSrc ?? ["'self'"]);
      for (const h of scriptHashes) scriptSrc.add(h);
      if (virtualOrigin) scriptSrc.add(virtualOrigin.replace(/\/+$/, ""));
      mergedCspOpts.scriptSrc = Array.from(scriptSrc);
    }
    const cspString = buildCspString(mergedCspOpts, detectedOrigins);
    html = injectCspMetaTag(html, cspString);
  }

  fs.writeFileSync(htmlPath, html, "utf8");
}

export function createNativePlugin(
  zigOpts: ZigNativeOptions,
  vLog: VisageLogger,
  virtualOrigin?: string,
  cspOpts?: boolean | CSPOptions,
  detectedOrigins?: DetectedOrigins
): VisageVitePlugin {
  return {
    name: "visage:native",
    apply: "build",
    buildStart() {
      vLog.info(
        "visage:native",
        `Zig native desktop compilation target active ${pc.dim(`(window: "${zigOpts.title ?? "Visage Native"}", origin: ${virtualOrigin})`)}`
      );
    },
    closeBundle() {
      if (typeof process !== "undefined") {
        inlineSingleFileHtml(
          path.resolve(process.cwd(), "dist"),
          cspOpts,
          detectedOrigins,
          virtualOrigin
        );
        vLog.info(
          "visage:native",
          `Inlined single-file HTML bundle for embedded webview distribution ${pc.dim("(dist/index.html)")}`
        );
      }
      if (zigOpts.scaffold !== false && typeof process !== "undefined") {
        scaffoldZigNative(process.cwd(), { ...zigOpts, virtualOrigin });
        vLog.info("visage:native", "Synchronized native Zig scaffold and build configuration");
      }
    }
  };
}
