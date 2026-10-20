/**
 * Native desktop application window, dialog, and notification primitives
 */
import { invoke } from "./ipc";

export interface WindowBorderOptions {
  color?: string;
  width?: number;
  radius?: number;
}

export interface DragOptions {
  button?: number;
  screenX?: number;
  screenY?: number;
}

export function closeWindow(): Promise<void> {
  return invoke("window:close");
}

export function minimizeWindow(): Promise<void> {
  return invoke("window:minimize");
}

export function maximizeWindow(): Promise<void> {
  return invoke("window:maximize");
}

export function setDecorations(decorated: boolean): Promise<void> {
  return invoke("window:setDecorations", { decorated });
}

export function setBorder(options: WindowBorderOptions): Promise<void> {
  return invoke("window:setBorder", options);
}

export function startDrag(options: DragOptions = {}): Promise<void> {
  return invoke("window:startDrag", {
    button: options.button ?? 1,
    screenX: options.screenX,
    screenY: options.screenY
  });
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  multiple?: boolean;
  directory?: boolean;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  defaultName?: string;
  filters?: FileFilter[];
}

export interface MessageDialogOptions {
  title?: string;
  message: string;
  level?: "info" | "warning" | "error" | "question";
  buttons?: "ok" | "okCancel" | "yesNo";
}

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  urgency?: "low" | "normal" | "critical";
}

export function openDialog(
  options: OpenDialogOptions & { multiple: true }
): Promise<string[] | null>;
export function openDialog(
  options?: OpenDialogOptions & { multiple?: false }
): Promise<string | null>;
export function openDialog(options: OpenDialogOptions = {}): Promise<string | string[] | null> {
  return invoke("dialog:open", options);
}

export function saveDialog(options: SaveDialogOptions = {}): Promise<string | null> {
  return invoke("dialog:save", options);
}

export function messageDialog(options: MessageDialogOptions): Promise<boolean> {
  return invoke("dialog:message", options);
}

export function sendNotification(options: NotificationOptions): Promise<void> {
  return invoke("notification:send", options);
}

export function isNotificationSupported(): Promise<boolean> {
  return invoke("notification:isSupported");
}

export const dialog = {
  open: openDialog,
  save: saveDialog,
  message: messageDialog
};

export const notification = {
  send: sendNotification,
  isSupported: isNotificationSupported
};
