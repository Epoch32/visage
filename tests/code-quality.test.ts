import { describe, expect, it } from "bun:test";

declare const Bun: any;

describe("Code Quality & Static Analysis", () => {
  it("passes Biome linting and formatting validation", () => {
    const proc = Bun.spawnSync(["bun", "x", "@biomejs/biome", "check", "."]);

    if (proc.exitCode !== 0) {
      console.error(proc.stdout.toString() || proc.stderr.toString());
    }
    expect(proc.exitCode).toBe(0);
  });

  it("passes TypeScript typechecking with zero diagnostic errors", () => {
    const proc = Bun.spawnSync(["bun", "x", "tsc", "--noEmit"]);

    if (proc.exitCode !== 0) {
      console.error(proc.stdout.toString() || proc.stderr.toString());
    }
    expect(proc.exitCode).toBe(0);
  });
});
