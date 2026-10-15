import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ZigNativeOptions } from "./types";

/**
 * Automatically inspect Zig build error output and sync build.zig.zon fingerprint
 */
export function autoSyncZigFingerprint(projectRoot: string): void {
  const buildZonPath = path.join(projectRoot, "build.zig.zon");
  if (!fs.existsSync(buildZonPath)) return;

  try {
    execSync("zig build --help", { cwd: projectRoot, stdio: "pipe" });
  } catch (err: any) {
    const output = `${err.stderr?.toString() || ""}\n${err.stdout?.toString() || ""}`;
    const match =
      output.match(/if this is a new or forked package, use this value:\s*(0x[0-9a-fA-F]+)/) ||
      output.match(/suggested value:\s*(0x[0-9a-fA-F]+)/);

    if (match?.[1]) {
      const validFingerprint = match[1];
      let zon = fs.readFileSync(buildZonPath, "utf8");
      if (zon.includes(".fingerprint")) {
        zon = zon.replace(
          /\.fingerprint\s*=\s*0x[0-9a-fA-F]+/,
          `.fingerprint = ${validFingerprint}`
        );
      } else {
        zon = zon.replace(
          /(\.version\s*=\s*"[^"]*",?)/,
          `$1\n    .fingerprint = ${validFingerprint},`
        );
      }
      fs.writeFileSync(buildZonPath, zon, "utf8");
    }
  }
}

function loadTemplate(filename: string): string {
  const candidates = [
    new URL(`./templates/${filename}`, import.meta.url).pathname,
    path.resolve(__dirname, "templates", filename),
    path.resolve(process.cwd(), "src/vite/templates", filename)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf8");
    }
  }
  throw new Error(`[visage:native] Failed to locate native scaffold template: ${filename}`);
}

/**
 * Generate native Zig host project scaffolding (build.zig.zon, build.zig, src-native/main.zig)
 * with automated webview/webview bindings for Linux and cross-platform desktop compilation.
 */
export function scaffoldZigNative(projectRoot: string, options: ZigNativeOptions = {}): void {
  const title = options.title ?? "Visage Native";
  const width = options.width ?? 1024;
  const height = options.height ?? 768;
  const resizable = options.resizable !== false;
  const debug = Boolean(options.debug);
  const outputDir = path.resolve(projectRoot, options.outputDir ?? "src-native");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Generate build.zig.zon at project root if it does not exist
  const buildZonPath = path.join(projectRoot, "build.zig.zon");
  if (!fs.existsSync(buildZonPath)) {
    const buildZonContent = `.{
    .name = .visage_app,
    .version = "0.1.0",
    .fingerprint = 0xd0d1ff8d1cf1039a,
    .dependencies = .{
        .webview = .{
            .url = "git+https://github.com/happystraw/zig-webview",
            .hash = "webview-0.1.0-mgPxHGBfKQDfUGh2sTdiuIOVrBHRtvNZE4-B8NXoEWxA",
        },
    },
    .paths = .{
        "build.zig",
        "build.zig.zon",
        "${options.outputDir ?? "src-native"}",
    },
}
`;
    fs.writeFileSync(buildZonPath, buildZonContent, "utf8");
  }

  // 2. Generate build.zig at project root if it does not exist
  const buildZigPath = path.join(projectRoot, "build.zig");
  if (!fs.existsSync(buildZigPath)) {
    const relOutputDir = options.outputDir ?? "src-native";
    const template = loadTemplate("build.zig");
    const buildZigContent = template.replace("{{OUTPUT_DIR}}", relOutputDir);
    fs.writeFileSync(buildZigPath, buildZigContent, "utf8");
  }

  // 3. Generate src-native/main.zig if it does not already exist
  const mainZigPath = path.join(outputDir, "main.zig");
  if (!fs.existsSync(mainZigPath)) {
    const template = loadTemplate("main.zig");
    const mainZigContent = template
      .replace("{{WINDOW_TITLE}}", title)
      .replace("{{WINDOW_WIDTH}}", String(width))
      .replace("{{WINDOW_HEIGHT}}", String(height))
      .replace("{{WINDOW_RESIZABLE}}", String(resizable))
      .replace("{{WINDOW_DEBUG}}", String(debug));
    fs.writeFileSync(mainZigPath, mainZigContent, "utf8");
  }

  // 4. Automatically sync and validate package fingerprint if Zig compiler is available
  autoSyncZigFingerprint(projectRoot);
}
