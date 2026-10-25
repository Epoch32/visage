import { onCleanup, type ReadonlySignal, signal } from "@signals";

export interface CreateClipboardOptions {
  /**
   * Duration in ms before the `copied` state automatically resets to false.
   * Defaults to 2000ms.
   */
  timeout?: number;
}

export interface ClipboardReturn {
  /**
   * Reactive signal indicating whether content was successfully copied recently.
   */
  copied: ReadonlySignal<boolean>;
  /**
   * Last copied or read clipboard text.
   */
  text: ReadonlySignal<string>;
  /**
   * Asynchronously copy text or Blob to the user's clipboard.
   */
  copy: (data: string | Blob) => Promise<boolean>;
  /**
   * Read plain text from the clipboard.
   */
  read: () => Promise<string>;
}

/**
 * Headless hook to manage fine-grained clipboard read/write operations with auto-resetting status.
 */
export function createClipboard(options: CreateClipboardOptions = {}): ClipboardReturn {
  const timeoutMs = options.timeout ?? 2000;
  const copied = signal<boolean>(false);
  const text = signal<string>("");

  let resetTimer: any = null;

  const clearTimer = () => {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
  };

  onCleanup(clearTimer);

  const copy = async (data: string | Blob): Promise<boolean> => {
    clearTimer();

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        if (typeof data === "string") {
          await navigator.clipboard.writeText(data);
          text.set(data);
        } else if (typeof ClipboardItem !== "undefined") {
          await navigator.clipboard.write([
            new ClipboardItem({
              [data.type]: data
            })
          ]);
        }
        copied.set(true);

        resetTimer = setTimeout(() => {
          copied.set(false);
        }, timeoutMs);

        return true;
      }

      // Legacy fallback for environments without Navigator.clipboard
      if (typeof document !== "undefined" && typeof data === "string") {
        const textarea = document.createElement("textarea");
        textarea.value = data;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (success) {
          text.set(data);
          copied.set(true);
          resetTimer = setTimeout(() => {
            copied.set(false);
          }, timeoutMs);
          return true;
        }
      }
    } catch {
      copied.set(false);
      return false;
    }

    copied.set(false);
    return false;
  };

  const read = async (): Promise<string> => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const content = await navigator.clipboard.readText();
        text.set(content);
        return content;
      }
    } catch {
      // Ignore permission denials or reading failures
    }
    return "";
  };

  return {
    copied,
    text,
    copy,
    read
  };
}

export interface OnPasteOptions {
  /**
   * Callback fired with extracted files (e.g., screenshots or dropped images).
   */
  onFiles?: (files: File[]) => void;
  /**
   * Callback fired with pasted plain text.
   */
  onText?: (text: string) => void;
  /**
   * Whether to prevent the browser's default paste handling.
   */
  preventDefault?: boolean;
}

/**
 * Listen for paste events on a target element or global window to capture pasted files & text.
 */
export function onPaste(
  targetOrOptions?:
    | HTMLElement
    | Window
    | (() => HTMLElement | Window | null | undefined)
    | OnPasteOptions,
  maybeOptions: OnPasteOptions = {}
): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  let target: HTMLElement | Window | (() => HTMLElement | Window | null | undefined);
  let options: OnPasteOptions;

  if (
    targetOrOptions &&
    typeof targetOrOptions === "object" &&
    !("addEventListener" in targetOrOptions)
  ) {
    target = typeof window !== "undefined" ? window : (null as any);
    options = targetOrOptions as OnPasteOptions;
  } else {
    target =
      (targetOrOptions as HTMLElement | Window | (() => HTMLElement | Window | null | undefined)) ??
      (typeof window !== "undefined" ? window : (null as any));
    options = maybeOptions;
  }

  const handler = (event: ClipboardEvent) => {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const files: File[] = [];
    if (clipboardData.files && clipboardData.files.length > 0) {
      files.push(...Array.from(clipboardData.files));
    } else if (clipboardData.items) {
      for (const item of Array.from(clipboardData.items)) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }

    const pastedText = clipboardData.getData("text/plain");

    if (files.length > 0 && options.onFiles) {
      if (options.preventDefault) event.preventDefault();
      options.onFiles(files);
    } else if (pastedText && options.onText) {
      if (options.preventDefault) event.preventDefault();
      options.onText(pastedText);
    }
  };

  const getTarget = typeof target === "function" ? target : () => target;
  const el = getTarget();

  if (el) {
    el.addEventListener("paste", handler as EventListener);
    const unbind = () => el.removeEventListener("paste", handler as EventListener);
    onCleanup(unbind);
    return unbind;
  }

  return () => {};
}
