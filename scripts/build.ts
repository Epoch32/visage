import { cp, rm, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

const startTime = performance.now();
const rootDir = resolve(import.meta.dir, "..");
const distDir = resolve(rootDir, "dist");

console.log("\nVisage Production Build\n" + "-".repeat(50));

// Step 1: Clean dist directory
const cleanStart = performance.now();
console.log("\n[1/4] Cleaning dist/ directory...");
await rm(distDir, { recursive: true, force: true });
console.log(`  └─ dist/ removed in ${formatDuration(performance.now() - cleanStart)}`);

// Step 2: Bundle JavaScript entrypoints using Bun's native bundler
console.log("\n[2/4] Bundling JavaScript entrypoints (Bun.build)...");
const rawEntrypoints = [
  "src/index.ts",
  "src/signals/index.ts",
  "src/dom/index.ts",
  "src/template/index.ts",
  "src/api/index.ts",
  "src/rpc/index.ts",
  "src/query/index.ts",
  "src/style/index.ts",
  "src/devtools/index.ts",
  "src/ui/index.ts",
  "src/io/index.ts",
  "src/i18n/index.ts",
  "src/virtual/index.ts",
  "src/form/index.ts",
  "src/server/index.ts",
  "src/router/index.ts",
  "src/vite/index.ts",
  "src/jsx-runtime/index.ts",
  "src/charts/index.ts",
  "src/native/index.ts"
];

console.log(`  ├─ ${rawEntrypoints.length} entrypoints targeted:`);
for (const ep of rawEntrypoints) {
  console.log(`  │   - ${ep}`);
}

const bundleStart = performance.now();
const buildResult = await Bun.build({
  entrypoints: rawEntrypoints.map((e) => resolve(rootDir, e)),
  root: resolve(rootDir, "src"),
  outdir: distDir,
  splitting: true,
  external: ["node:*"]
});

if (!buildResult.success) {
  console.error("\nError: Bundling failed with errors:");
  for (const log of buildResult.logs) {
    console.error(log);
  }
  process.exit(1);
}

const bundleElapsed = performance.now() - bundleStart;
console.log(`  ├─ Bundled ${buildResult.outputs.length} outputs in ${formatDuration(bundleElapsed)}:`);

// Sort entry outputs first, then chunks
const entryOutputs: Array<{ name: string; size: string }> = [];
const chunkOutputs: Array<{ name: string; size: string }> = [];

for (const out of buildResult.outputs) {
  const relPath = relative(distDir, out.path);
  const size = formatBytes(out.size);
  if (out.kind === "entry-point") {
    entryOutputs.push({ name: relPath, size });
  } else {
    chunkOutputs.push({ name: relPath, size });
  }
}

entryOutputs.sort((a, b) => a.name.localeCompare(b.name));
chunkOutputs.sort((a, b) => a.name.localeCompare(b.name));

console.log("  │   [Entrypoints]");
for (const { name, size } of entryOutputs) {
  console.log(`  │     - ${name.padEnd(28)} ${size.padStart(10)}`);
}
console.log(`  │   [Shared Chunks: ${chunkOutputs.length} files]`);
for (const { name, size } of chunkOutputs.slice(0, 8)) {
  console.log(`  │     - ${name.padEnd(28)} ${size.padStart(10)}`);
}
if (chunkOutputs.length > 8) {
  console.log(`  │     ... and ${chunkOutputs.length - 8} more chunks`);
}
console.log(`  └─ Total JS bundle size: ${formatBytes(buildResult.outputs.reduce((acc, o) => acc + o.size, 0))}`);

// Step 3: Generate TypeScript declaration files
console.log("\n[3/4] Generating TypeScript declaration files (tsc)...");
const tscStart = performance.now();
const tscProc = Bun.spawn(["bun", "x", "tsc", "-p", "tsconfig.build.json"], {
  cwd: rootDir,
  stdout: "inherit",
  stderr: "inherit"
});

const tscExit = await tscProc.exited;
if (tscExit !== 0) {
  console.error(`Error: TypeScript declaration generation failed with code ${tscExit}`);
  process.exit(tscExit);
}
console.log(`  └─ Declarations emitted in ${formatDuration(performance.now() - tscStart)}`);

// Step 4: Copy static declarations and Vite scaffolding templates
console.log("\n[4/4] Copying static assets & template files...");
const copyStart = performance.now();

const jsxTypesSrc = resolve(rootDir, "src/jsx-runtime/jsx.d.ts");
const jsxTypesDest = resolve(distDir, "jsx-runtime/jsx.d.ts");
await cp(jsxTypesSrc, jsxTypesDest);
const jsxTypesStat = await stat(jsxTypesDest);
console.log(`  ├─ Copied JSX definitions: dist/jsx-runtime/jsx.d.ts (${formatBytes(jsxTypesStat.size)})`);

const templatesSrc = resolve(rootDir, "src/vite/templates");
const templatesDest = resolve(distDir, "vite/templates");
await cp(templatesSrc, templatesDest, { recursive: true });
console.log(`  ├─ Copied Vite scaffolding templates: dist/vite/templates/`);
console.log(`  └─ Assets copied in ${formatDuration(performance.now() - copyStart)}`);

// Final Summary
const totalElapsed = performance.now() - startTime;
console.log("\n" + "-".repeat(50));
console.log(`Visage built successfully in ${formatDuration(totalElapsed)}.\n`);
