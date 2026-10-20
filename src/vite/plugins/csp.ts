import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { compileJsx } from "../compiler";
import type { DetectedOrigins } from "../compiler/types";
import { buildCspString, extractOriginFromUrl, injectCspMetaTag } from "../csp";
import { pc, type VisageLogger } from "../logger";
import type { CSPOptions, VisageVitePlugin } from "../types";

declare const process: any;

export function extractOriginsFromHtml(html: string, detectedOrigins: DetectedOrigins): void {
  const matches = html.matchAll(/<(?:img|iframe|video|audio|source|link)\b[^>]+>/gi);
  for (const match of matches) {
    const tag = match[0];
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
    const hrefMatch = tag.match(/\bhref=["']([^"']+)["']/i);
    const url = srcMatch?.[1] || hrefMatch?.[1];
    if (url) {
      const origin = extractOriginFromUrl(url);
      if (origin) {
        if (/^<img\b/i.test(tag)) detectedOrigins.img.add(origin);
        else if (/^<iframe\b/i.test(tag)) detectedOrigins.frame.add(origin);
        else if (/^<(?:video|audio|source)\b/i.test(tag)) detectedOrigins.media.add(origin);
        else if (/^<link\b/i.test(tag)) {
          if (/rel=["']stylesheet["']/i.test(tag)) {
            detectedOrigins.style.add(origin);
            if (origin.includes("fonts.googleapis.com")) {
              detectedOrigins.font.add("https://fonts.gstatic.com");
              detectedOrigins.connect.add("https://fonts.gstatic.com");
            }
          } else if (/as=["']font["']/i.test(tag)) {
            detectedOrigins.font.add(origin);
          } else if (/rel=["'](?:preconnect|dns-prefetch)["']/i.test(tag)) {
            detectedOrigins.connect.add(origin);
            if (origin.includes("fonts.gstatic.com")) {
              detectedOrigins.font.add("https://fonts.gstatic.com");
            }
          }
        }
      }
    }
  }
}

export function extractScriptHashesFromHtml(html: string, hashes: Set<string>): void {
  const scriptMatches = html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scriptMatches) {
    const content = match[1]?.trim();
    if (content) {
      const hash = crypto.createHash("sha256").update(content, "utf8").digest("base64");
      hashes.add(`'sha256-${hash}'`);
    }
  }
}

export function scanProjectOrigins(
  dir: string,
  cspOpts: boolean | CSPOptions,
  detectedOrigins: DetectedOrigins,
  compilerOpts: any,
  knownScriptHashes?: Set<string>
): void {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name.startsWith(".") ||
        entry.name === "zig-out" ||
        entry.name === "zig-pkg" ||
        entry.name === ".zig-cache"
      ) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanProjectOrigins(fullPath, cspOpts, detectedOrigins, compilerOpts, knownScriptHashes);
      } else if (/\.[jt]sx$/.test(entry.name)) {
        try {
          const code = fs.readFileSync(fullPath, "utf8");
          if (!/(?:https?:\/\/|\/\/|wss?:\/\/)/i.test(code)) {
            continue;
          }
          compileJsx(code, {
            filename: fullPath,
            ...compilerOpts,
            csp: cspOpts,
            detectedOrigins
          });
        } catch {
          // Ignore parse errors on scratch files
        }
      } else if (/\.html$/i.test(entry.name)) {
        try {
          const html = fs.readFileSync(fullPath, "utf8");
          extractOriginsFromHtml(html, detectedOrigins);
          if (knownScriptHashes) {
            extractScriptHashesFromHtml(html, knownScriptHashes);
          }
        } catch {
          // Ignore read errors
        }
      }
    }
  } catch {
    // Ignore directory read errors
  }
}

export function createCspPlugin(
  cspOpts: any,
  detectedOrigins: DetectedOrigins,
  vLog: VisageLogger,
  virtualOrigin?: string,
  compilerOpts?: any
): VisageVitePlugin {
  let hasPreScanned = false;
  let projectRoot = typeof process !== "undefined" ? process.cwd() : ".";
  const knownScriptHashes = new Set<string>();

  return {
    name: "visage:csp",
    configResolved(config) {
      if (config?.root) {
        projectRoot = config.root;
      }
    },
    buildStart() {
      const voDetail = virtualOrigin ? `, origin: ${virtualOrigin}` : "";
      vLog.info(
        "visage:csp",
        `Content Security Policy generator armed ${pc.dim(`(strict zero-trust${voDetail})`)}`
      );
      const shouldAutoDetect = typeof cspOpts !== "object" || cspOpts.autoDetectOrigins !== false;
      if (shouldAutoDetect && !hasPreScanned) {
        scanProjectOrigins(projectRoot, cspOpts, detectedOrigins, compilerOpts, knownScriptHashes);
        hasPreScanned = true;
        const originCount =
          detectedOrigins.connect.size +
          detectedOrigins.img.size +
          detectedOrigins.font.size +
          detectedOrigins.style.size +
          detectedOrigins.media.size +
          detectedOrigins.frame.size;
        if (originCount > 0) {
          const originsSample = [
            ...detectedOrigins.connect,
            ...detectedOrigins.img,
            ...detectedOrigins.font,
            ...detectedOrigins.style,
            ...detectedOrigins.media,
            ...detectedOrigins.frame
          ];
          vLog.info(
            "visage:csp",
            `Auto-whitelisted ${originCount} external origin${originCount > 1 ? "s" : ""} from project scan ${pc.dim(`(${originsSample.slice(0, 3).join(", ")}${originCount > 3 ? ", ..." : ""})`)}`
          );
        }
      }
    },
    transformIndexHtml(html: string) {
      const shouldAutoDetect = typeof cspOpts !== "object" || cspOpts.autoDetectOrigins !== false;
      if (shouldAutoDetect && !hasPreScanned) {
        scanProjectOrigins(projectRoot, cspOpts, detectedOrigins, compilerOpts, knownScriptHashes);
        hasPreScanned = true;
      }
      extractOriginsFromHtml(html, detectedOrigins);
      let transformedHtml = html;
      if (virtualOrigin && !/<base\b/i.test(transformedHtml)) {
        const voBase = virtualOrigin.endsWith("/") ? virtualOrigin : `${virtualOrigin}/`;
        transformedHtml = transformedHtml.replace(
          /(<head\b[^>]*>)/i,
          `$1\n    <base href="${voBase}">`
        );
      }
      const shouldHashInline = typeof cspOpts !== "object" || cspOpts.hashInlineScripts !== false;
      if (shouldHashInline) {
        extractScriptHashesFromHtml(transformedHtml, knownScriptHashes);
      }
      const inlineScriptHashes = Array.from(knownScriptHashes);
      const cspString = buildCspString(cspOpts, detectedOrigins, inlineScriptHashes, "meta");
      vLog.debug(
        "visage:csp",
        `Injected CSP meta tag into HTML shell ${pc.dim(`(${cspString.slice(0, 45)}...)`)}`
      );
      return injectCspMetaTag(transformedHtml, cspString);
    },
    configureServer(server) {
      const shouldSetHeaders = typeof cspOpts !== "object" || cspOpts.headers !== false;
      if (shouldSetHeaders) {
        server.middlewares.use((req: any, res: any, next: any) => {
          const accept = req.headers?.accept || "";
          if (
            typeof accept === "string" &&
            (accept.includes("text/html") || req.url === "/" || req.url?.endsWith(".html"))
          ) {
            const shouldAutoDetect =
              typeof cspOpts !== "object" || cspOpts.autoDetectOrigins !== false;
            if (shouldAutoDetect && !hasPreScanned) {
              scanProjectOrigins(
                projectRoot,
                cspOpts,
                detectedOrigins,
                compilerOpts,
                knownScriptHashes
              );
              hasPreScanned = true;
            }

            const setCspHeader = () => {
              const headerCsp = buildCspString(
                cspOpts,
                detectedOrigins,
                knownScriptHashes.size > 0 ? Array.from(knownScriptHashes) : undefined,
                "header"
              );
              res.setHeader("Content-Security-Policy", headerCsp);
            };

            setCspHeader();

            if (typeof res.end === "function") {
              const originalEnd = res.end;
              res.end = function (this: any, chunk?: any, encoding?: any, cb?: any) {
                if (!res.headersSent) {
                  setCspHeader();
                }
                return originalEnd.call(this, chunk, encoding, cb);
              };
            }
          }
          next();
        });
      }
    },
    configurePreviewServer(server) {
      const shouldSetHeaders = typeof cspOpts !== "object" || cspOpts.headers !== false;
      if (shouldSetHeaders) {
        server.middlewares.use((req: any, res: any, next: any) => {
          const accept = req.headers?.accept || "";
          if (
            typeof accept === "string" &&
            (accept.includes("text/html") || req.url === "/" || req.url?.endsWith(".html"))
          ) {
            const shouldAutoDetect =
              typeof cspOpts !== "object" || cspOpts.autoDetectOrigins !== false;
            if (shouldAutoDetect && !hasPreScanned) {
              scanProjectOrigins(
                projectRoot,
                cspOpts,
                detectedOrigins,
                compilerOpts,
                knownScriptHashes
              );
              hasPreScanned = true;
            }

            const setCspHeader = () => {
              const headerCsp = buildCspString(
                cspOpts,
                detectedOrigins,
                knownScriptHashes.size > 0 ? Array.from(knownScriptHashes) : undefined,
                "header"
              );
              res.setHeader("Content-Security-Policy", headerCsp);
            };

            setCspHeader();

            if (typeof res.end === "function") {
              const originalEnd = res.end;
              res.end = function (this: any, chunk?: any, encoding?: any, cb?: any) {
                if (!res.headersSent) {
                  setCspHeader();
                }
                return originalEnd.call(this, chunk, encoding, cb);
              };
            }
          }
          next();
        });
      }
    }
  };
}
