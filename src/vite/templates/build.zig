const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const exe_mod = b.createModule(.{
        .root_source_file = b.path("{{OUTPUT_DIR}}/main.zig"),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
    });

    const webview_dep = b.dependency("webview", .{
        .target = target,
        .optimize = optimize,
    });
    exe_mod.addImport("webview", webview_dep.module("webview"));

    exe_mod.addAnonymousImport("ui_html", .{
        .root_source_file = b.path("dist/index.html"),
    });

    const exe = b.addExecutable(.{
        .name = "visage-app",
        .root_module = exe_mod,
    });

    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the native Visage application");
    run_step.dependOn(&run_cmd.step);
}
