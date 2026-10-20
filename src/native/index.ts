/**
 * Visage Native IPC Bridge & Desktop OS Primitives
 */
import {
  invoke,
  isNativeApp,
  type NativeCallMessage,
  type NativeEventMessage,
  type NativeResponseMessage,
  on
} from "./ipc";
import {
  closeWindow,
  type DragOptions,
  dialog,
  type FileFilter,
  isNotificationSupported,
  type MessageDialogOptions,
  maximizeWindow,
  messageDialog,
  minimizeWindow,
  type NotificationOptions,
  notification,
  type OpenDialogOptions,
  openDialog,
  type SaveDialogOptions,
  saveDialog,
  sendNotification,
  setBorder,
  setDecorations,
  startDrag,
  type WindowBorderOptions
} from "./native-apis";

export type {
  DragOptions,
  FileFilter,
  MessageDialogOptions,
  NativeCallMessage,
  NativeEventMessage,
  NativeResponseMessage,
  NotificationOptions,
  OpenDialogOptions,
  SaveDialogOptions,
  WindowBorderOptions
};

export {
  closeWindow,
  dialog,
  invoke,
  isNativeApp,
  isNotificationSupported,
  maximizeWindow,
  messageDialog,
  minimizeWindow,
  notification,
  on,
  openDialog,
  saveDialog,
  sendNotification,
  setBorder,
  setDecorations,
  startDrag
};

export const windowControls = {
  close: closeWindow,
  minimize: minimizeWindow,
  maximize: maximizeWindow,
  setDecorations,
  setBorder,
  startDrag
};

export const native = {
  invoke,
  on,
  isNativeApp,
  close: closeWindow,
  minimize: minimizeWindow,
  maximize: maximizeWindow,
  setDecorations,
  setBorder,
  startDrag,
  window: windowControls,
  dialog,
  notification
};

export default native;
