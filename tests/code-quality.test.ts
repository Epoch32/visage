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

  it("resolves configured path aliases (@, @template, @vite, @signals)", async () => {
    const rootMod = await import("@");
    const templateMod = await import("@template");
    const viteMod = await import("@vite");
    const signalsMod = await import("@signals");

    expect(typeof rootMod.render).toBe("function");
    expect(typeof templateMod.template).toBe("function");
    expect(typeof viteMod.visage).toBe("function");
    expect(typeof signalsMod.signal).toBe("function");
  });
});
