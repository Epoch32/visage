import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { isNativeApp, native } from "../src/native";
import { scaffoldZigNative } from "../src/vite/native-scaffold";

describe("Visage Native IPC Bridge (visage/native)", () => {
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = (globalThis as any).window;
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  it("detects when running inside a native desktop host", () => {
    // Normal browser environment
    (globalThis as any).window = {};
    expect(isNativeApp()).toBe(false);

    // Host flag present
    (globalThis as any).window = { __visage_native: true };
    expect(isNativeApp()).toBe(true);

    // Windows WebView2 present
    (globalThis as any).window = { chrome: { webview: { postMessage: () => {} } } };
    expect(isNativeApp()).toBe(true);

    // macOS WKWebView / Linux WebKitGTK present
    (globalThis as any).window = {
      webkit: { messageHandlers: { visage: { postMessage: () => {} } } }
    };
    expect(isNativeApp()).toBe(true);
  });

  it("invokes commands via custom native call handler and resolves responses", async () => {
    (globalThis as any).window = {};

    let dispatchedId = "";
    let dispatchedCommand = "";
    let dispatchedPayload: any = null;

    (globalThis as any).window.__visage_native_call = (id: string, cmd: string, payload: any) => {
      dispatchedId = id;
      dispatchedCommand = cmd;
      dispatchedPayload = payload;

      // Simulate native host responding asynchronously
      setTimeout(() => {
        (globalThis as any).window.__visage_native_response({
          id,
          result: { os: "linux", arch: "x86_64" }
        });
      }, 5);
    };

    const res = await native.invoke("getSystemInfo", { verbose: true });
    expect(dispatchedCommand).toBe("getSystemInfo");
    expect(dispatchedPayload).toEqual({ verbose: true });
    expect(dispatchedId).toBeTruthy();
    expect(res).toEqual({ os: "linux", arch: "x86_64" });
  });

  it("resolves when custom native call handler directly returns a Promise", async () => {
    (globalThis as any).window = {};

    (globalThis as any).window.__visage_native_call = async (
      _id: string,
      cmd: string,
      payload: any
    ) => {
      return { echoCommand: cmd, echoPayload: payload };
    };

    const res = await native.invoke("echo", { test: 123 });
    expect(res).toEqual({ echoCommand: "echo", echoPayload: { test: 123 } });
  });

  it("subscribes to and receives asynchronous events from the native host", () => {
    (globalThis as any).window = {};

    let receivedPayload: any = null;
    const unsubscribe = native.on("system:battery", (payload) => {
      receivedPayload = payload;
    });

    expect(typeof (globalThis as any).window.__visage_native_event).toBe("function");

    // Simulate host emitting event
    (globalThis as any).window.__visage_native_event({
      event: "system:battery",
      payload: { level: 95, charging: true }
    });

    expect(receivedPayload).toEqual({ level: 95, charging: true });

    // Unsubscribe
    unsubscribe();
    receivedPayload = null;

    (globalThis as any).window.__visage_native_event({
      event: "system:battery",
      payload: { level: 50, charging: false }
    });

    expect(receivedPayload).toBeNull();
  });

  it("falls back to mock response in browser development mode", async () => {
    (globalThis as any).window = {};
    const res = await native.invoke("customCommand", { foo: "bar" });
    expect(res).toEqual({ ok: true, mock: true, command: "customCommand" });
  });

  it("invokes window control functions (close, minimize, maximize, setDecorations, setBorder, startDrag)", async () => {
    (globalThis as any).window = {};
    const calls: { cmd: string; payload: any }[] = [];

    (globalThis as any).window.__visage_native_call = async (
      _id: string,
      cmd: string,
      payload: any
    ) => {
      calls.push({ cmd, payload });
      return { success: true };
    };

    await native.window.close();
    await native.window.minimize();
    await native.window.maximize();
    await native.window.setDecorations(false);
    await native.window.setBorder({ color: "#3b82f6", width: 2, radius: 8 });
    await native.window.startDrag({ button: 1, screenX: 150, screenY: 200 });

    expect(calls).toEqual([
      { cmd: "window:close", payload: undefined },
      { cmd: "window:minimize", payload: undefined },
      { cmd: "window:maximize", payload: undefined },
      { cmd: "window:setDecorations", payload: { decorated: false } },
      { cmd: "window:setBorder", payload: { color: "#3b82f6", width: 2, radius: 8 } },
      { cmd: "window:startDrag", payload: { button: 1, screenX: 150, screenY: 200 } }
    ]);
  });

  it("invokes native dialog functions (open, save, message)", async () => {
    (globalThis as any).window = {};
    const calls: { cmd: string; payload: any }[] = [];

    (globalThis as any).window.__visage_native_call = async (
      _id: string,
      cmd: string,
      payload: any
    ) => {
      calls.push({ cmd, payload });
      if (cmd === "dialog:open") return "/home/user/document.txt";
      if (cmd === "dialog:save") return "/home/user/saved.txt";
      if (cmd === "dialog:message") return true;
      return null;
    };

    const openRes = await native.dialog.open({ title: "Select File", multiple: false });
    const saveRes = await native.dialog.save({ title: "Save Project", defaultName: "app.visage" });
    const msgRes = await native.dialog.message({
      title: "Confirm",
      message: "Are you sure?",
      level: "question",
      buttons: "yesNo"
    });

    expect(openRes).toBe("/home/user/document.txt");
    expect(saveRes).toBe("/home/user/saved.txt");
    expect(msgRes).toBe(true);

    expect(calls).toEqual([
      { cmd: "dialog:open", payload: { title: "Select File", multiple: false } },
      { cmd: "dialog:save", payload: { title: "Save Project", defaultName: "app.visage" } },
      {
        cmd: "dialog:message",
        payload: {
          title: "Confirm",
          message: "Are you sure?",
          level: "question",
          buttons: "yesNo"
        }
      }
    ]);
  });

  it("invokes native notification functions (send, isSupported)", async () => {
    (globalThis as any).window = {};
    const calls: { cmd: string; payload: any }[] = [];

    (globalThis as any).window.__visage_native_call = async (
      _id: string,
      cmd: string,
      payload: any
    ) => {
      calls.push({ cmd, payload });
      if (cmd === "notification:isSupported") return true;
      return { success: true };
    };

    await native.notification.send({
      title: "Build Complete",
      body: "Native executable ready in zig-out/bin/",
      urgency: "normal"
    });
    const supported = await native.notification.isSupported();

    expect(supported).toBe(true);
    expect(calls).toEqual([
      {
        cmd: "notification:send",
        payload: {
          title: "Build Complete",
          body: "Native executable ready in zig-out/bin/",
          urgency: "normal"
        }
      },
      { cmd: "notification:isSupported", payload: undefined }
    ]);
  });
});

describe("Zig Native Project Scaffolding", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "visage-zig-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("scaffolds build.zig.zon, main.zig, and build.zig with webview/webview dependency", () => {
    scaffoldZigNative(tempDir, {
      title: "Test Application Window",
      width: 1280,
      height: 800,
      debug: true,
      outputDir: "src-native"
    });

    const mainZigPath = path.join(tempDir, "src-native", "main.zig");
    const buildZigPath = path.join(tempDir, "build.zig");
    const buildZonPath = path.join(tempDir, "build.zig.zon");

    expect(fs.existsSync(mainZigPath)).toBe(true);
    expect(fs.existsSync(buildZigPath)).toBe(true);
    expect(fs.existsSync(buildZonPath)).toBe(true);

    const zonContent = fs.readFileSync(buildZonPath, "utf8");
    expect(zonContent).toContain('.url = "git+https://github.com/happystraw/zig-webview"');
    expect(zonContent).toContain(".name = .visage_app");

    const mainZigContent = fs.readFileSync(mainZigPath, "utf8");
    expect(mainZigContent).toContain('title: [:0]const u8 = "Test Application Window"');
    expect(mainZigContent).toContain("width: c_int = 1280");
    expect(mainZigContent).toContain("height: c_int = 800");
    expect(mainZigContent).toContain("debug: bool = true");
    expect(mainZigContent).toContain("decorations: bool = true");
    expect(mainZigContent).toContain("border_color: ?[:0]const u8 = null");
    expect(mainZigContent).toContain('@embedFile("ui_html")');
    expect(mainZigContent).toContain('const Webview = @import("webview").Webview;');

    const buildZigContent = fs.readFileSync(buildZigPath, "utf8");
    expect(buildZigContent).toContain('.dependency("webview"');
    expect(buildZigContent).toContain(".link_libc = true");
    expect(buildZigContent).toContain('.name = "visage-app"');
  });

  it("scaffolds custom window border and frameless window options in main.zig", () => {
    scaffoldZigNative(tempDir, {
      title: "Frameless Custom Border Window",
      decorations: false,
      border: {
        color: "#3b82f6",
        width: 3,
        radius: 12
      },
      outputDir: "src-native"
    });

    const mainZigPath = path.join(tempDir, "src-native", "main.zig");
    const mainZigContent = fs.readFileSync(mainZigPath, "utf8");

    expect(mainZigContent).toContain("decorations: bool = false");
    expect(mainZigContent).toContain('border_color: ?[:0]const u8 = "#3b82f6"');
    expect(mainZigContent).toContain("border_width: c_int = 3");
    expect(mainZigContent).toContain("border_radius: c_int = 12");
    expect(mainZigContent).toContain("linux.gtk_window_set_decorated(gtk_win, 0);");
    expect(mainZigContent).toContain(
      "linux.applyBorder(color, WindowConfig.border_width, WindowConfig.border_radius);"
    );
  });
});
