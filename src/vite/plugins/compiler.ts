import * as path from "node:path";
import { compileJsx } from "../compiler";
import { pc, type VisageLogger } from "../logger";
import type { VisagePluginOptions, VisageVitePlugin } from "../types";

export function createCompilerPlugin(
  options: VisagePluginOptions,
  vLog: VisageLogger,
  compilerOpts: any,
  isSecureTransforms: boolean
): VisageVitePlugin {
  return {
    name: "visage:compiler",
    enforce: "pre",
    buildStart() {
      if (options.compiler) {
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
      try {
        const res = compileJsx(code, {
          filename: id,
          ...compilerOpts
        });
        return {
          code: res.code
        };
      } catch (err: any) {
        if (err?.message?.includes("[visage:security]")) {
          vLog.error("visage:security", `${path.basename(id)}: ${err.message}`);
        }
        return null;
      }
    }
  };
}
