import * as path from "node:path";
import { compileJsx } from "../compiler";
import { pc, type VisageLogger } from "../logger";
import type { VisagePluginOptions, VisageVitePlugin } from "../types";

declare const process: any;

export function createCompilerPlugin(
  options: VisagePluginOptions,
  vLog: VisageLogger,
  compilerOpts: any,
  isSecureTransforms: boolean
): VisageVitePlugin {
  const isVerbose = Boolean(options.verbose || compilerOpts?.verbose);
  let root = process?.cwd ? process.cwd() : "";

  const aggregateStats = {
    filesCount: 0,
    templatesHoisted: 0,
    delegatedEvents: new Set<string>(),
    securityShields: new Map<string, number>(),
    helpersRequired: new Set<string>(),
    totalTransformTimeMs: 0
  };

  return {
    name: "visage:compiler",
    enforce: "pre",
    configResolved(config) {
      if (config.root) {
        root = config.root;
      }
      if (config.logger) {
        vLog.setViteLogger(config.logger);
      }
    },
    buildStart() {
      aggregateStats.filesCount = 0;
      aggregateStats.templatesHoisted = 0;
      aggregateStats.delegatedEvents.clear();
      aggregateStats.securityShields.clear();
      aggregateStats.helpersRequired.clear();
      aggregateStats.totalTransformTimeMs = 0;

      if (options.compiler !== false) {
        const target = options.ssr ? "ssr" : "client";
        vLog.info(
          "visage:compiler",
          `AOT JSX template compiler armed ${pc.dim(`(target: ${target})`)}`
        );
      }
      if (isSecureTransforms) {
        vLog.info(
          "visage:security",
          `AST security transforms active ${pc.dim("(6 shields armed: URL, rel, clobber, HTML, events, spreads)")}`
        );
      }
    },
    transform(code: string, id: string) {
      if (!/\.[jt]sx($|\?)/.test(id) || id.includes("node_modules")) {
        return null;
      }
      const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
      try {
        const res = compileJsx(code, {
          filename: id,
          ...compilerOpts
        });
        const duration =
          (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;

        if (res.stats) {
          aggregateStats.filesCount++;
          aggregateStats.templatesHoisted += res.stats.templatesHoisted;
          aggregateStats.totalTransformTimeMs += duration;

          for (const evt of res.stats.delegatedEvents) {
            aggregateStats.delegatedEvents.add(evt);
          }
          for (const helper of res.stats.securityHelpers) {
            aggregateStats.securityShields.set(
              helper,
              (aggregateStats.securityShields.get(helper) || 0) + 1
            );
          }
          for (const helper of res.stats.helpersRequired) {
            aggregateStats.helpersRequired.add(helper);
          }

          if (isVerbose) {
            const relPath = root ? path.relative(root, id) : path.basename(id);
            const details: string[] = [];
            if (res.stats.templatesHoisted > 0) {
              details.push(
                `${res.stats.templatesHoisted} template${res.stats.templatesHoisted === 1 ? "" : "s"}`
              );
            }
            if (res.stats.delegatedEvents.length > 0) {
              details.push(`events: [${res.stats.delegatedEvents.join(", ")}]`);
            }
            if (res.stats.securityHelpers.length > 0) {
              details.push(`shields: [${res.stats.securityHelpers.join(", ")}]`);
            }
            const detailStr = details.length > 0 ? ` (${details.join(", ")})` : "";
            vLog.info(
              "visage:compiler",
              `Transformed ${pc.cyan(relPath)}${detailStr} ${pc.dim(`[${duration.toFixed(1)}ms]`)}`
            );
          }
        }

        return {
          code: res.code
        };
      } catch (err: any) {
        if (err?.message?.includes("[visage:security]")) {
          vLog.error("visage:security", `${path.basename(id)}: ${err.message}`);
        }
        if (typeof (this as any)?.error === "function") {
          (this as any).error(err);
        }
        throw err;
      }
    },
    closeBundle() {
      if (aggregateStats.filesCount === 0) return;

      const eventsArr = Array.from(aggregateStats.delegatedEvents);
      const eventsStr =
        eventsArr.length > 0
          ? `${eventsArr.join(", ")} ${pc.dim(`(${eventsArr.length} global)`)}`
          : pc.dim("none");

      const shieldsEntries = Array.from(aggregateStats.securityShields.entries());
      const shieldsStr =
        shieldsEntries.length > 0
          ? shieldsEntries.map(([k, v]) => `${k} ${pc.dim(`(${v})`)}`).join(", ")
          : pc.dim("none required");

      const helpersArr = Array.from(aggregateStats.helpersRequired);
      const helpersStr = helpersArr.length > 0 ? pc.dim(helpersArr.join(", ")) : pc.dim("none");

      const summary = [
        pc.bold("AOT JSX Compiler Build Summary:"),
        `  ${pc.dim("•")} Transformed:      ${pc.cyan(String(aggregateStats.filesCount))} modules`,
        `  ${pc.dim("•")} Templates:        ${pc.green(String(aggregateStats.templatesHoisted))} hoisted DOM templates`,
        `  ${pc.dim("•")} Delegated Events: ${eventsStr}`,
        `  ${pc.dim("•")} Security Shields: ${shieldsStr}`,
        `  ${pc.dim("•")} Runtime Helpers:  ${helpersStr}`,
        `  ${pc.dim("•")} Transform Time:   ${pc.dim(`${aggregateStats.totalTransformTimeMs.toFixed(1)}ms`)}`
      ].join("\n");

      vLog.info("visage:compiler", summary);
    }
  };
}
