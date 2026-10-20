/**
 * Visage Native IPC Bridge & Desktop OS Primitives
 */
import {
  getDefaultIpcTimeout,
  getPendingCallCount,
  type InvokeOptions,
  invoke,
  isNativeApp,
  type NativeCallMessage,
  type NativeEventMessage,
  type NativeResponseMessage,
  on,
  setDefaultIpcTimeout
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
  InvokeOptions,
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
  getDefaultIpcTimeout,
  getPendingCallCount,
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
  setDefaultIpcTimeout,
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
  setDefaultIpcTimeout,
  getDefaultIpcTimeout,
  getPendingCallCount,
  window: windowControls,
  dialog,
  notification
};

export default native;
