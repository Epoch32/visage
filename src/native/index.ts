/**
 * Visage Native IPC Bridge
 *
 * Provides a unified, type-safe communication channel between the Visage UI
 * and the native Zig platform host (WebView2, WKWebView, WebKitGTK).
 */

export interface NativeCallMessage {
  id: string;
  command: string;
  payload?: any;
}

export interface NativeResponseMessage {
  id: string;
  result?: any;
  error?: string;
}

export interface NativeEventMessage {
  event: string;
  payload?: any;
}

declare const process: any;

declare global {
  interface Window {
    __visage_native?: boolean;
    __visage_native_call?: (id: string, command: string, payload?: any) => void;
    __visage_native_response?: (response: NativeResponseMessage) => void;
    __visage_native_event?: (event: NativeEventMessage) => void;
    chrome?: {
      webview?: {
        postMessage: (message: any) => void;
      };
    };
    webkit?: {
      messageHandlers?: {
        visage?: {
          postMessage: (message: any) => void;
        };
      };
    };
  }
}

// In-flight call resolution map
const pendingCalls = new Map<
  string,
  {
    resolve: (val: any) => void;
    reject: (err: any) => void;
  }
>();

// Event listeners map
const eventListeners = new Map<string, Set<(payload: any) => void>>();

function ensureInitialized() {
  if (typeof window === "undefined" || typeof window.__visage_native_response === "function") {
    return;
  }

  // Global handler invoked by the native host when a response is ready
  window.__visage_native_response = (res: NativeResponseMessage) => {
    const pending = pendingCalls.get(res.id);
    if (!pending) return;
    pendingCalls.delete(res.id);

    if (res.error) {
      pending.reject(new Error(res.error));
    } else {
      pending.resolve(res.result);
    }
  };

  // Global handler invoked by the native host when an asynchronous event fires
  window.__visage_native_event = (msg: NativeEventMessage) => {
    const listeners = eventListeners.get(msg.event);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(msg.payload);
        } catch (err) {
          console.error(`[visage:native] Error in event listener for "${msg.event}":`, err);
        }
      }
    }
  };
}

/**
 * Check whether the current application is running inside a native Visage host.
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.__visage_native ||
      window.chrome?.webview ||
      window.webkit?.messageHandlers?.visage ||
      typeof (window as any).ipcRenderer !== "undefined"
  );
}

/**
 * Invoke a native command on the Zig platform host.
 *
 * @param command - The identifier of the native action (e.g., "getSystemInfo", "readDirectory")
 * @param payload - Optional JSON-serializable argument payload
 * @returns Promise resolving with the host's returned data
 */
export function invoke<T = any>(command: string, payload?: any): Promise<T> {
  ensureInitialized();

  return new Promise<T>((resolve, reject) => {
    const id = `native_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    pendingCalls.set(id, { resolve, reject });

    const message: NativeCallMessage = { id, command, payload };

    // 1. Host has injected direct custom dispatch function
    if (typeof window.__visage_native_call === "function") {
      try {
        const ret = (window as any).__visage_native_call(id, command, payload);
        if (ret && typeof ret.then === "function") {
          ret
            .then((val: any) => {
              if (pendingCalls.has(id)) {
                pendingCalls.delete(id);
                resolve(val);
              }
            })
            .catch((err: any) => {
              if (pendingCalls.has(id)) {
                pendingCalls.delete(id);
                reject(err);
              }
            });
          return;
        }
        return;
      } catch (err) {
        pendingCalls.delete(id);
        reject(err);
        return;
      }
    }

    // 2. Windows WebView2
    if (window.chrome?.webview?.postMessage) {
      try {
        window.chrome.webview.postMessage(message);
        return;
      } catch (err) {
        pendingCalls.delete(id);
        reject(err);
        return;
      }
    }

    // 3. macOS WKWebView / Linux WebKitGTK
    if (window.webkit?.messageHandlers?.visage?.postMessage) {
      try {
        window.webkit.messageHandlers.visage.postMessage(message);
        return;
      } catch (err) {
        pendingCalls.delete(id);
        reject(err);
        return;
      }
    }

    // 4. Fallback in standard browser dev mode
    pendingCalls.delete(id);
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
      console.warn(
        `[visage:native] Running in standard browser mode. Mocking native command: "${command}"`
      );
    }
    resolve({ ok: true, mock: true, command } as unknown as T);
  });
}

/**
 * Subscribe to native events dispatched from the Zig host.
 *
 * @param event - The name of the event to listen for
 * @param callback - Function invoked when the host emits the event
 * @returns Unsubscribe function
 */
export function on(event: string, callback: (payload: any) => void): () => void {
  ensureInitialized();

  let listeners = eventListeners.get(event);
  if (!listeners) {
    listeners = new Set();
    eventListeners.set(event, listeners);
  }
  listeners.add(callback);

  return () => {
    listeners?.delete(callback);
    if (listeners && listeners.size === 0) {
      eventListeners.delete(event);
    }
  };
}

/**
 * Request the native host to close the application window.
 */
export function closeWindow(): Promise<void> {
  return invoke("window:close");
}

/**
 * Request the native host to minimize the application window.
 */
export function minimizeWindow(): Promise<void> {
  return invoke("window:minimize");
}

/**
 * Request the native host to maximize or restore the application window.
 */
export function maximizeWindow(): Promise<void> {
  return invoke("window:maximize");
}

/**
 * Default native namespace export
 */
export const native = {
  invoke,
  on,
  isNativeApp,
  close: closeWindow,
  minimize: minimizeWindow,
  maximize: maximizeWindow
};

export default native;
