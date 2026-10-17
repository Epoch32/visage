import pc from "picocolors";

export interface VisageLogger {
  info(tag: string, message: string): void;
  warn(tag: string, message: string): void;
  error(tag: string, message: string): void;
  debug(tag: string, message: string): void;
  setViteLogger(logger: any): void;
}

const TAG_COLORS: Record<string, (str: string) => string> = {
  visage: pc.cyan,
  "visage:config": pc.cyan,
  "visage:compiler": pc.cyan,
  "visage:security": pc.green,
  "visage:csp": pc.yellow,
  "visage:native": pc.magenta,
  "visage:rpc": pc.blue,
  "visage:devtools": pc.cyan,
  "visage:lucide": pc.magenta,
  "visage:hmr": pc.green,
  "visage:ssr": pc.cyan,
  "visage:storage-preboot": pc.cyan
};

export function formatTag(tag: string): string {
  const normalizedTag = tag.startsWith("visage") ? tag : `visage:${tag}`;
  const colorFn = TAG_COLORS[normalizedTag] ?? pc.cyan;
  return pc.bold(colorFn(`[${normalizedTag}]`));
}

function clearCurrentLine(): void {
  if (typeof process !== "undefined" && process.stdout?.isTTY && !process.env?.CI) {
    process.stdout.clearLine?.(0);
    process.stdout.cursorTo?.(0);
  }
}

export function createVisageLogger(viteLogger?: any): VisageLogger {
  let currentLogger = viteLogger;

  return {
    setViteLogger(logger: any) {
      currentLogger = logger;
    },
    info(tag: string, message: string) {
      clearCurrentLine();
      const formatted = `${formatTag(tag)} ${message}`;
      if (currentLogger?.info) {
        currentLogger.info(formatted, { timestamp: true });
      } else {
        console.log(formatted);
      }
    },
    warn(tag: string, message: string) {
      clearCurrentLine();
      const formatted = `${formatTag(tag)} ${pc.yellow(message)}`;
      if (currentLogger?.warn) {
        currentLogger.warn(formatted, { timestamp: true });
      } else {
        console.warn(formatted);
      }
    },
    error(tag: string, message: string) {
      clearCurrentLine();
      const formatted = `${formatTag(tag)} ${pc.red(message)}`;
      if (currentLogger?.error) {
        currentLogger.error(formatted, { timestamp: true });
      } else {
        console.error(formatted);
      }
    },
    debug(tag: string, message: string) {
      if (typeof process !== "undefined" && process.env?.DEBUG) {
        const formatted = `${formatTag(tag)} ${pc.dim(message)}`;
        if (currentLogger?.info) {
          currentLogger.info(formatted, { timestamp: true });
        } else {
          console.debug(formatted);
        }
      }
    }
  };
}

export { pc, pc as colors };
