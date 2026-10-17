import { pc, type VisageLogger } from "../logger";
import {
  generateStoragePrebootScript,
  injectStoragePrebootScript,
  scanCodeForPersistentSignals,
  scanProjectStoragePreboot
} from "../storage-preboot";
import type { StoragePrebootItem, StoragePrebootOptions, VisageVitePlugin } from "../types";

declare const process: any;

export function createStoragePrebootPlugin(
  options: StoragePrebootOptions,
  vLog: VisageLogger
): VisageVitePlugin {
  const detectedStates = new Map<string, StoragePrebootItem>();
  let hasPreScanned = false;
  let projectRoot = typeof process !== "undefined" ? process.cwd() : ".";

  if (options.states) {
    for (const st of options.states) {
      detectedStates.set(st.key, st);
    }
  }

  return {
    name: "visage:storage-preboot",
    configResolved(config) {
      if (config?.root) {
        projectRoot = config.root;
      }
    },
    buildStart() {
      const shouldAutoDetect = options.autoDetect !== false;
      if (shouldAutoDetect && !hasPreScanned) {
        scanProjectStoragePreboot(projectRoot, detectedStates);
        hasPreScanned = true;
      }
      const stateCount = detectedStates.size;
      const keysSample = Array.from(detectedStates.keys()).slice(0, 3).join(", ");
      vLog.info(
        "visage:storage-preboot",
        `Storage Preboot active ${pc.dim(`(${stateCount} state${stateCount === 1 ? "" : "s"}${stateCount > 0 ? `: ${keysSample}` : ""})`)}`
      );
    },
    transform(code: string, id: string) {
      if (options.autoDetect === false) return null;
      if (!/\.[jt]sx?($|\?)/.test(id) || id.includes("node_modules")) return null;
      if (!code.includes("persist")) return null;

      const found = scanCodeForPersistentSignals(code);
      for (const item of found) {
        detectedStates.set(item.key, item);
      }
      return null;
    },
    transformIndexHtml(html: string) {
      const shouldAutoDetect = options.autoDetect !== false;
      if (shouldAutoDetect && !hasPreScanned) {
        scanProjectStoragePreboot(projectRoot, detectedStates);
        hasPreScanned = true;
      }

      const items = Array.from(detectedStates.values());
      if (items.length === 0) return html;

      const scriptTag = generateStoragePrebootScript(items);
      vLog.debug(
        "visage:storage-preboot",
        `Injected storage preboot script into HTML shell (${items.length} states)`
      );
      return injectStoragePrebootScript(html, scriptTag);
    }
  };
}
