//! Visage Native IPC Call Dispatcher
const std = @import("std");
const builtin = @import("builtin");
const Webview = @import("webview").Webview;
const platform = @import("platform.zig");
const util = @import("util.zig");

pub var webview: ?*Webview = null;
pub var app_title: [:0]const u8 = "Visage App";

pub fn init(w: *Webview, title: [:0]const u8) void {
    webview = w;
    app_title = title;
}

pub fn handleNativeCall(id: [:0]const u8, req: [:0]const u8, arg: ?*anyopaque) void {
    _ = arg;
    const w = webview orelse return;

    if (std.mem.indexOf(u8, req, "getSystemInfo") != null) {
        var buf: [256:0]u8 = undefined;
        const os_name = @tagName(builtin.os.tag);
        const cpu_arch = @tagName(builtin.cpu.arch);
        const res = std.fmt.bufPrintZ(&buf, "{{\"os\": \"{s}\", \"arch\": \"{s}\", \"engine\": \"visage-native\"}}", .{ os_name, cpu_arch }) catch "{}";
        w.respond(id, .ok, res) catch {};
    } else if (std.mem.indexOf(u8, req, "ping") != null) {
        w.respond(id, .ok, "{\"pong\": true}") catch {};
    } else if (std.mem.indexOf(u8, req, "window:close") != null) {
        w.terminate() catch {};
    } else if (std.mem.indexOf(u8, req, "window:minimize") != null) {
        w.minimize() catch {};
        w.respond(id, .ok, "{}") catch {};
    } else if (std.mem.indexOf(u8, req, "window:maximize") != null) {
        w.maximize() catch {};
        w.respond(id, .ok, "{}") catch {};
    } else if (std.mem.indexOf(u8, req, "window:setDecorations") != null) {
        const gtk_win = if (builtin.os.tag == .linux) w.getWindow() else null;
        const enable = std.mem.indexOf(u8, req, "\"decorated\":false") == null and
            std.mem.indexOf(u8, req, "\"decorated\": false") == null;
        platform.setDecorations(gtk_win, enable);
        w.respond(id, .ok, "{\"success\": true}") catch {};
    } else if (std.mem.indexOf(u8, req, "window:startDrag") != null) {
        const gtk_win = if (builtin.os.tag == .linux) w.getWindow() else null;
        const root_x = util.getJsonIntField(req, "screenX") orelse 0;
        const root_y = util.getJsonIntField(req, "screenY") orelse 0;
        platform.startDrag(gtk_win, root_x, root_y);
        w.respond(id, .ok, "{\"success\": true}") catch {};
    } else if (std.mem.indexOf(u8, req, "window:setBorder") != null) {
        const color = util.getJsonStringField(req, "color") orelse "#3b82f6";
        const width = util.getJsonIntField(req, "width") orelse 1;
        const radius = util.getJsonIntField(req, "radius") orelse 0;
        platform.applyBorder(color, width, radius);
        w.respond(id, .ok, "{\"success\": true}") catch {};
    } else if (std.mem.indexOf(u8, req, "dialog:open") != null) {
        var out_buf: [4096]u8 = undefined;
        const title_str = util.getJsonStringField(req, "title") orelse "Open File";
        const is_dir = util.getJsonBoolField(req, "directory");
        const is_multiple = util.getJsonBoolField(req, "multiple");
        const def_path = util.getJsonStringField(req, "defaultPath");
        const gtk_win = if (builtin.os.tag == .linux) w.getWindow() else null;

        if (platform.openDialog(gtk_win, title_str, is_dir, is_multiple, def_path, &out_buf)) |res| {
            w.respond(id, .ok, res) catch {};
        } else {
            w.respond(id, .ok, "null") catch {};
        }
    } else if (std.mem.indexOf(u8, req, "dialog:save") != null) {
        var out_buf: [1024]u8 = undefined;
        const title_str = util.getJsonStringField(req, "title") orelse "Save File";
        const def_name = util.getJsonStringField(req, "defaultName");
        const def_path = util.getJsonStringField(req, "defaultPath");
        const gtk_win = if (builtin.os.tag == .linux) w.getWindow() else null;

        if (platform.saveDialog(gtk_win, title_str, def_name, def_path, &out_buf)) |res| {
            w.respond(id, .ok, res) catch {};
        } else {
            w.respond(id, .ok, "null") catch {};
        }
    } else if (std.mem.indexOf(u8, req, "dialog:message") != null) {
        const gtk_win = if (builtin.os.tag == .linux) w.getWindow() else null;
        const title = util.getJsonStringField(req, "title");
        const message = util.getJsonStringField(req, "message") orelse "Message";
        const level = util.getJsonStringField(req, "level") orelse "info";
        const buttons = util.getJsonStringField(req, "buttons") orelse "ok";

        const accepted = platform.messageDialog(gtk_win, title, message, level, buttons);
        w.respond(id, .ok, if (accepted) "true" else "false") catch {};
    } else if (std.mem.indexOf(u8, req, "notification:send") != null) {
        const title = util.getJsonStringField(req, "title") orelse app_title;
        const body = util.getJsonStringField(req, "body") orelse "";
        const urgency = util.getJsonStringField(req, "urgency") orelse "normal";
        const icon = util.getJsonStringField(req, "icon") orelse "dialog-information";
        platform.sendNotification(app_title, title, body, urgency, icon);
        w.respond(id, .ok, "{\"success\": true}") catch {};
    } else if (std.mem.indexOf(u8, req, "notification:isSupported") != null) {
        w.respond(id, .ok, if (platform.isNotificationSupported()) "true" else "false") catch {};
    } else {
        w.respond(id, .ok, "{\"ok\": true}") catch {};
    }
}
