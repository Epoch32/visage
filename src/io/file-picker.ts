import { onCleanup } from "../signals";

export interface CreateFilePickerOptions {
  /**
   * Accepted MIME types or file extensions.
   * e.g., ["image/*", ".pdf"]
   */
  accept?: string[] | string;
  /**
   * Whether to allow multiple file selection.
   * Defaults to false.
   */
  multiple?: boolean;
  /**
   * Capture camera or microphone on mobile devices.
   */
  capture?: string;
}

export interface FilePickerReturn {
  /**
   * Imperatively open the native file picker dialog.
   * Returns a promise resolving with the user's selected files.
   */
  open: () => Promise<File[]>;
}

/**
 * Headless imperative file picker dialog launcher.
 * Automatically spawns, cleans up, and captures files without lingering hidden DOM inputs.
 */
export function createFilePicker(options: CreateFilePickerOptions = {}): FilePickerReturn {
  const open = (): Promise<File[]> => {
    return new Promise((resolve) => {
      if (typeof document === "undefined") {
        resolve([]);
        return;
      }

      const input = document.createElement("input");
      input.type = "file";
      input.style.position = "fixed";
      input.style.left = "-9999px";
      input.style.top = "-9999px";
      input.style.opacity = "0";

      if (options.multiple) {
        input.multiple = true;
      }

      if (options.accept) {
        input.accept = Array.isArray(options.accept) ? options.accept.join(",") : options.accept;
      }

      if (options.capture) {
        input.capture = options.capture;
      }

      const handleChange = () => {
        const files = input.files ? Array.from(input.files) : [];
        cleanup();
        resolve(files);
      };

      const handleCancel = () => {
        cleanup();
        resolve([]);
      };

      const cleanup = () => {
        input.removeEventListener("change", handleChange);
        input.removeEventListener("cancel", handleCancel);
        window.removeEventListener("focus", handleWindowFocus);
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
      };

      // Fallback for browsers that don't emit 'cancel' on native picker abort
      const handleWindowFocus = () => {
        setTimeout(() => {
          if (input.parentNode && (!input.files || input.files.length === 0)) {
            cleanup();
            resolve([]);
          }
        }, 300);
      };

      input.addEventListener("change", handleChange);
      input.addEventListener("cancel", handleCancel);
      window.addEventListener("focus", handleWindowFocus, { once: true });

      document.body.appendChild(input);
      input.click();
    });
  };

  return { open };
}

/**
 * Helper to generate object preview URLs for image/media files with automatic lifecycle cleanup.
 */
export function createMediaUrl(file: File | Blob | null | undefined): string {
  if (typeof URL === "undefined" || !file) return "";
  const url = URL.createObjectURL(file);
  onCleanup(() => {
    URL.revokeObjectURL(url);
  });
  return url;
}
