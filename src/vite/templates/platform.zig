//! Visage Native Platform Bindings (GTK3 / Linux)
const std = @import("std");
const builtin = @import("builtin");
const util = @import("util.zig");
const BufferWriter = util.BufferWriter;

pub const linux = if (builtin.os.tag == .linux) struct {
    pub extern fn gtk_window_set_decorated(window: ?*anyopaque, setting: c_int) void;
    pub extern fn gtk_window_get_decorated(window: ?*anyopaque) c_int;
    pub extern fn gtk_window_begin_move_drag(window: ?*anyopaque, button: c_int, root_x: c_int, root_y: c_int, timestamp: u32) void;
    pub extern fn gtk_css_provider_new() ?*anyopaque;
    pub extern fn gtk_css_provider_load_from_data(provider: ?*anyopaque, data: [*]const u8, length: isize, err: ?*anyopaque) c_int;
    pub extern fn gdk_screen_get_default() ?*anyopaque;
    pub extern fn gtk_style_context_add_provider_for_screen(screen: ?*anyopaque, provider: ?*anyopaque, priority: c_uint) void;
    pub extern fn g_object_unref(object: ?*anyopaque) void;

    // File Chooser Dialog
    pub extern fn gtk_file_chooser_dialog_new(title: ?[*:0]const u8, parent: ?*anyopaque, action: c_int, first_button: ?*anyopaque) ?*anyopaque;
    pub extern fn gtk_dialog_add_button(dialog: ?*anyopaque, button_text: [*:0]const u8, response_id: c_int) ?*anyopaque;
    pub extern fn gtk_dialog_run(dialog: ?*anyopaque) c_int;
    pub extern fn gtk_widget_destroy(widget: ?*anyopaque) void;
    pub extern fn gtk_file_chooser_get_filename(chooser: ?*anyopaque) ?[*:0]const u8;
    pub extern fn gtk_file_chooser_set_current_name(chooser: ?*anyopaque, name: [*:0]const u8) void;
    pub extern fn gtk_file_chooser_set_select_multiple(chooser: ?*anyopaque, select_multiple: c_int) void;
    pub extern fn gtk_file_chooser_set_current_folder(chooser: ?*anyopaque, filename: [*:0]const u8) c_int;
    pub extern fn g_free(mem: ?*anyopaque) void;

    pub const GSList = extern struct {
        data: ?*anyopaque,
        next: ?*GSList,
    };
    pub extern fn gtk_file_chooser_get_filenames(chooser: ?*anyopaque) ?*GSList;
    pub extern fn g_slist_free(list: ?*GSList) void;

    // Message Dialog
    pub extern fn gtk_message_dialog_new(parent: ?*anyopaque, flags: c_int, msg_type: c_int, buttons: c_int, message_format: ?*anyopaque) ?*anyopaque;
    pub extern fn gtk_message_dialog_set_markup(message_dialog: ?*anyopaque, str: [*:0]const u8) void;
    pub extern fn gtk_window_set_title(window: ?*anyopaque, title: [*:0]const u8) void;

    // System libc invocation for desktop notification
    pub extern fn system(cmd: [*:0]const u8) c_int;
} else struct {};

pub fn setDecorations(window: ?*anyopaque, decorated: bool) void {
    if (builtin.os.tag == .linux) {
        if (window) |win| {
            linux.gtk_window_set_decorated(win, if (decorated) 1 else 0);
        }
    }
}

pub fn applyBorder(color: []const u8, width: c_int, radius: c_int) void {
    if (builtin.os.tag == .linux) {
        const provider = linux.gtk_css_provider_new() orelse return;
        defer linux.g_object_unref(provider);

        var css_buf: [512]u8 = undefined;
        const css = std.fmt.bufPrint(&css_buf, "window, .background {{ border: {d}px solid {s}; border-radius: {d}px; }}", .{
            width,
            color,
            radius,
        }) catch return;

        if (linux.gtk_css_provider_load_from_data(provider, css.ptr, @intCast(css.len), null) != 0) {
            const screen = linux.gdk_screen_get_default();
            if (screen != null) {
                // 600 = GTK_STYLE_PROVIDER_PRIORITY_APPLICATION
                linux.gtk_style_context_add_provider_for_screen(screen, provider, 600);
            }
        }
    }
}

pub fn startDrag(window: ?*anyopaque, root_x: c_int, root_y: c_int) void {
    if (builtin.os.tag == .linux) {
        if (window) |win| {
            linux.gtk_window_begin_move_drag(win, 1, root_x, root_y, 0);
        }
    }
}

pub fn openDialog(
    window: ?*anyopaque,
    title: []const u8,
    directory: bool,
    multiple: bool,
    default_path: ?[]const u8,
    out_buf: []u8,
) ?[:0]const u8 {
    if (builtin.os.tag == .linux) {
        var title_buf: [256:0]u8 = undefined;
        const title_z = std.fmt.bufPrintZ(&title_buf, "{s}", .{title}) catch "Open File";

        const action: c_int = if (directory) 2 else 0; // 2 = SELECT_FOLDER, 0 = OPEN
        const dialog = linux.gtk_file_chooser_dialog_new(title_z, window, action, null);
        if (dialog == null) return null;
        defer linux.gtk_widget_destroy(dialog);

        _ = linux.gtk_dialog_add_button(dialog, "_Cancel", -6); // GTK_RESPONSE_CANCEL
        _ = linux.gtk_dialog_add_button(dialog, "_Open", -3);   // GTK_RESPONSE_ACCEPT

        if (multiple) {
            linux.gtk_file_chooser_set_select_multiple(dialog, 1);
        }

        if (default_path) |def_path| {
            var def_buf: [512:0]u8 = undefined;
            if (std.fmt.bufPrintZ(&def_buf, "{s}", .{def_path})) |def_z| {
                _ = linux.gtk_file_chooser_set_current_folder(dialog, def_z);
            } else |_| {}
        }

        const response = linux.gtk_dialog_run(dialog);
        if (response != -3) return null; // Not GTK_RESPONSE_ACCEPT

        var bw = BufferWriter{ .buf = out_buf };
        if (multiple) {
            bw.writeByte('[');
            var list = linux.gtk_file_chooser_get_filenames(dialog);
            const orig_list = list;
            var first = true;
            while (list != null) {
                if (list.?.data) |d| {
                    const filename: [*:0]const u8 = @ptrCast(d);
                    const slice = std.mem.span(filename);
                    if (!first) {
                        bw.writeByte(',');
                    }
                    first = false;
                    bw.writeByte('"');
                    for (slice) |c| {
                        if (c == '"') bw.writeSlice("\\\"")
                        else if (c == '\\') bw.writeSlice("\\\\")
                        else bw.writeByte(c);
                    }
                    bw.writeByte('"');
                    linux.g_free(@ptrCast(@constCast(filename)));
                }
                list = list.?.next;
            }
            if (orig_list != null) {
                linux.g_slist_free(orig_list);
            }
            bw.writeByte(']');
        } else {
            if (linux.gtk_file_chooser_get_filename(dialog)) |filename| {
                defer linux.g_free(@ptrCast(@constCast(filename)));
                const slice = std.mem.span(filename);
                bw.writeByte('"');
                for (slice) |c| {
                    if (c == '"') bw.writeSlice("\\\"")
                    else if (c == '\\') bw.writeSlice("\\\\")
                    else bw.writeByte(c);
                }
                bw.writeByte('"');
            } else {
                return null;
            }
        }

        if (bw.idx < out_buf.len) {
            out_buf[bw.idx] = 0;
            return out_buf[0..bw.idx :0];
        }
    }
    return null;
}

pub fn saveDialog(
    window: ?*anyopaque,
    title: []const u8,
    default_name: ?[]const u8,
    default_path: ?[]const u8,
    out_buf: []u8,
) ?[:0]const u8 {
    if (builtin.os.tag == .linux) {
        var title_buf: [256:0]u8 = undefined;
        const title_z = std.fmt.bufPrintZ(&title_buf, "{s}", .{title}) catch "Save File";

        const dialog = linux.gtk_file_chooser_dialog_new(title_z, window, 1, null); // 1 = SAVE
        if (dialog == null) return null;
        defer linux.gtk_widget_destroy(dialog);

        _ = linux.gtk_dialog_add_button(dialog, "_Cancel", -6);
        _ = linux.gtk_dialog_add_button(dialog, "_Save", -3);

        if (default_name) |def_name| {
            var name_buf: [256:0]u8 = undefined;
            if (std.fmt.bufPrintZ(&name_buf, "{s}", .{def_name})) |name_z| {
                linux.gtk_file_chooser_set_current_name(dialog, name_z);
            } else |_| {}
        }

        if (default_path) |def_path| {
            var def_buf: [512:0]u8 = undefined;
            if (std.fmt.bufPrintZ(&def_buf, "{s}", .{def_path})) |def_z| {
                _ = linux.gtk_file_chooser_set_current_folder(dialog, def_z);
            } else |_| {}
        }

        const response = linux.gtk_dialog_run(dialog);
        if (response != -3) return null;

        if (linux.gtk_file_chooser_get_filename(dialog)) |filename| {
            defer linux.g_free(@ptrCast(@constCast(filename)));
            const slice = std.mem.span(filename);
            var bw = BufferWriter{ .buf = out_buf };
            bw.writeByte('"');
            for (slice) |c| {
                if (c == '"') bw.writeSlice("\\\"")
                else if (c == '\\') bw.writeSlice("\\\\")
                else bw.writeByte(c);
            }
            bw.writeByte('"');

            if (bw.idx < out_buf.len) {
                out_buf[bw.idx] = 0;
                return out_buf[0..bw.idx :0];
            }
        }
    }
    return null;
}

pub fn messageDialog(
    window: ?*anyopaque,
    title: ?[]const u8,
    message: []const u8,
    level: []const u8,
    buttons: []const u8,
) bool {
    if (builtin.os.tag == .linux) {
        var msg_buf: [2048]u8 = undefined;
        var bw = BufferWriter{ .buf = &msg_buf };
        var mi: usize = 0;
        while (mi < message.len) {
            if (std.mem.startsWith(u8, message[mi..], "<br></br>")) {
                bw.writeByte('\n');
                mi += 9;
            } else if (std.mem.startsWith(u8, message[mi..], "<br />")) {
                bw.writeByte('\n');
                mi += 6;
            } else if (std.mem.startsWith(u8, message[mi..], "<br/>")) {
                bw.writeByte('\n');
                mi += 5;
            } else if (std.mem.startsWith(u8, message[mi..], "<br>")) {
                bw.writeByte('\n');
                mi += 4;
            } else if (std.mem.startsWith(u8, message[mi..], "\\n")) {
                bw.writeByte('\n');
                mi += 2;
            } else {
                bw.writeByte(message[mi]);
                mi += 1;
            }
        }
        const normalized_msg = bw.getWritten();
        var final_msg_buf: [2048:0]u8 = undefined;
        const msg_z = std.fmt.bufPrintZ(&final_msg_buf, "{s}", .{normalized_msg}) catch "Message";

        const msg_type: c_int = if (std.mem.eql(u8, level, "warning")) 1
            else if (std.mem.eql(u8, level, "question")) 2
            else if (std.mem.eql(u8, level, "error")) 3
            else 0; // 0 = GTK_MESSAGE_INFO

        const btn_type: c_int = if (std.mem.eql(u8, buttons, "yesNo")) 4 // GTK_BUTTONS_YES_NO
            else if (std.mem.eql(u8, buttons, "okCancel")) 5 // GTK_BUTTONS_OK_CANCEL
            else 1; // GTK_BUTTONS_OK

        const dialog = linux.gtk_message_dialog_new(window, 1, msg_type, btn_type, null);
        if (dialog != null) {
            defer linux.gtk_widget_destroy(dialog);
            if (title) |title_str| {
                var title_buf: [256:0]u8 = undefined;
                if (std.fmt.bufPrintZ(&title_buf, "{s}", .{title_str})) |title_z| {
                    linux.gtk_window_set_title(dialog, title_z);
                } else |_| {}
            }
            linux.gtk_message_dialog_set_markup(dialog, msg_z);

            const response = linux.gtk_dialog_run(dialog);
            // GTK_RESPONSE_OK = -5, GTK_RESPONSE_YES = -8, GTK_RESPONSE_ACCEPT = -3
            return (response == -5 or response == -8 or response == -3);
        }
    }
    return false;
}

pub fn sendNotification(
    app_name: []const u8,
    title: []const u8,
    body: []const u8,
    urgency: []const u8,
    icon: []const u8,
) void {
    if (builtin.os.tag == .linux) {
        var cmd_buf: [2048]u8 = undefined;
        var bw = BufferWriter{ .buf = &cmd_buf };

        bw.writeSlice("notify-send");
        if (app_name.len > 0) {
            bw.writeSlice(" -a '");
            for (app_name) |c| {
                if (c == '\'') bw.writeSlice("'\\''")
                else bw.writeByte(c);
            }
            bw.writeSlice("'");
        }
        if (urgency.len > 0) {
            bw.writeSlice(" -u '");
            bw.writeSlice(urgency);
            bw.writeSlice("'");
        }
        if (icon.len > 0) {
            bw.writeSlice(" -i '");
            bw.writeSlice(icon);
            bw.writeSlice("'");
        }
        bw.writeSlice(" '");
        for (title) |c| {
            if (c == '\'') bw.writeSlice("'\\''")
            else bw.writeByte(c);
        }
        bw.writeSlice("'");

        if (body.len > 0) {
            bw.writeSlice(" '");
            for (body) |c| {
                if (c == '\'') bw.writeSlice("'\\''")
                else bw.writeByte(c);
            }
            bw.writeSlice("'");
        }

        const written = bw.getWritten();
        if (written.len < cmd_buf.len) {
            cmd_buf[written.len] = 0;
            const cmd_z: [*:0]const u8 = @ptrCast(cmd_buf[0..written.len]);
            _ = linux.system(cmd_z);
        }
    }
}

pub fn isNotificationSupported() bool {
    return builtin.os.tag == .linux;
}
