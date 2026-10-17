//! Visage Native Utilities
const std = @import("std");

pub const BufferWriter = struct {
    buf: []u8,
    idx: usize = 0,

    pub fn writeByte(self: *BufferWriter, b: u8) void {
        if (self.idx < self.buf.len) {
            self.buf[self.idx] = b;
            self.idx += 1;
        }
    }

    pub fn writeSlice(self: *BufferWriter, s: []const u8) void {
        for (s) |b| {
            self.writeByte(b);
        }
    }

    pub fn getWritten(self: *const BufferWriter) []const u8 {
        return self.buf[0..self.idx];
    }
};

pub fn getJsonStringField(req: []const u8, key: []const u8) ?[]const u8 {
    var search_buf: [64]u8 = undefined;
    const search_key = std.fmt.bufPrint(&search_buf, "\"{s}\":", .{key}) catch return null;
    const idx = std.mem.indexOf(u8, req, search_key) orelse return null;
    const rest = req[idx + search_key.len ..];
    const start_quote = std.mem.indexOf(u8, rest, "\"") orelse return null;
    const val_rest = rest[start_quote + 1 ..];
    const end_quote = std.mem.indexOf(u8, val_rest, "\"") orelse return null;
    return val_rest[0..end_quote];
}

pub fn getJsonBoolField(req: []const u8, key: []const u8) bool {
    var search_buf: [64]u8 = undefined;
    const search_key = std.fmt.bufPrint(&search_buf, "\"{s}\":", .{key}) catch return false;
    const idx = std.mem.indexOf(u8, req, search_key) orelse return false;
    const rest = req[idx + search_key.len ..];
    var i: usize = 0;
    while (i < rest.len and (rest[i] == ' ' or rest[i] == '\t')) : (i += 1) {}
    if (i + 4 <= rest.len and std.mem.eql(u8, rest[i .. i + 4], "true")) {
        return true;
    }
    return false;
}

pub fn getJsonIntField(req: []const u8, key: []const u8) ?c_int {
    var search_buf: [64]u8 = undefined;
    const search_key = std.fmt.bufPrint(&search_buf, "\"{s}\":", .{key}) catch return null;
    const idx = std.mem.indexOf(u8, req, search_key) orelse return null;
    const rest = req[idx + search_key.len ..];
    var i: usize = 0;
    while (i < rest.len and (rest[i] == ' ' or rest[i] == '\t')) : (i += 1) {}
    const val_rest = rest[i..];
    var end: usize = 0;
    if (val_rest.len > 0 and val_rest[0] == '-') {
        end += 1;
    }
    while (end < val_rest.len and (val_rest[end] >= '0' and val_rest[end] <= '9')) : (end += 1) {}
    if (end > 0 and !(end == 1 and val_rest[0] == '-')) {
        return std.fmt.parseInt(c_int, val_rest[0..end], 10) catch null;
    }
    return null;
}
