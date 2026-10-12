import { onCleanup, type ReadonlySignal, signal } from "../signals";

export type FileRejectionReason = "MAX_SIZE" | "INVALID_TYPE" | "MAX_FILES";

export interface FileRejection {
  file: File;
  reason: FileRejectionReason;
  message: string;
}

export interface CreateDropZoneOptions {
  /**
   * Accepted MIME types or extensions.
   * e.g., ["image/*", ".pdf", "audio/mp3"]
   */
  accept?: string[] | string;
  /**
   * Maximum file size in bytes.
   */
  maxSize?: number;
  /**
   * Minimum file size in bytes.
   */
  minSize?: number;
  /**
   * Whether multiple files are allowed.
   * Defaults to true.
   */
  multiple?: boolean;
  /**
   * Maximum number of files permitted.
   */
  maxFiles?: number;
  /**
   * Whether the dropzone is currently disabled.
   */
  disabled?: boolean | (() => boolean);
  /**
   * Callback invoked when valid files are accepted.
   */
  onDrop?: (files: File[]) => void;
  /**
   * Callback invoked when files are rejected.
   */
  onDropRejected?: (rejections: FileRejection[]) => void;
  /**
   * Callback invoked when drag enters the dropzone.
   */
  onDragEnter?: (e: DragEvent) => void;
  /**
   * Callback invoked when drag leaves the dropzone.
   */
  onDragLeave?: (e: DragEvent) => void;
  /**
   * Callback invoked on drag over.
   */
  onDragOver?: (e: DragEvent) => void;
}

export interface DropZoneReturn {
  /**
   * True while a drag interaction hovers over the dropzone.
   */
  isDraggingOver: ReadonlySignal<boolean>;
  /**
   * Last accepted files.
   */
  files: ReadonlySignal<File[]>;
  /**
   * Last rejected files and reasons.
   */
  rejectedFiles: ReadonlySignal<FileRejection[]>;
  /**
   * Clear current file state.
   */
  reset: () => void;
  /**
   * Event handlers to bind to a target element or dropzone container.
   */
  bind: () => {
    onDragEnter: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
}

/**
 * Check if a file matches accepted MIME patterns or file extensions.
 */
export function isFileAccepted(file: File, accept?: string[] | string): boolean {
  if (!accept || (Array.isArray(accept) && accept.length === 0)) return true;

  const acceptedList = Array.isArray(accept)
    ? accept.map((a) => a.trim().toLowerCase())
    : accept.split(",").map((a) => a.trim().toLowerCase());

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return acceptedList.some((pattern) => {
    // Extension match: .png, .pdf
    if (pattern.startsWith(".")) {
      return fileName.endsWith(pattern);
    }
    // Wildcard MIME match: image/*, audio/*
    if (pattern.endsWith("/*")) {
      const typeGroup = pattern.slice(0, -2);
      return fileType.startsWith(typeGroup);
    }
    // Exact MIME match: image/png, application/pdf
    return fileType === pattern;
  });
}

/**
 * Headless hook to manage fine-grained drag-and-drop file interactions.
 * Handles nested DOM dragenter/dragleave event counter flickering.
 */
export function createDropZone(
  target?: HTMLElement | (() => HTMLElement | null | undefined) | null,
  options: CreateDropZoneOptions = {}
): DropZoneReturn {
  const isDraggingOver = signal<boolean>(false);
  const files = signal<File[]>([]);
  const rejectedFiles = signal<FileRejection[]>([]);

  let dragCounter = 0;

  const isDisabled = () =>
    typeof options.disabled === "function" ? options.disabled() : Boolean(options.disabled);

  const reset = () => {
    files.set([]);
    rejectedFiles.set([]);
    isDraggingOver.set(false);
    dragCounter = 0;
  };

  const processFiles = (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    const accepted: File[] = [];
    const rejections: FileRejection[] = [];

    const isMultiple = options.multiple ?? true;
    const maxFiles = options.maxFiles ?? (isMultiple ? Infinity : 1);

    if (rawFiles.length > maxFiles) {
      const allowed = rawFiles.slice(0, maxFiles);
      const excess = rawFiles.slice(maxFiles);
      for (const f of excess) {
        rejections.push({
          file: f,
          reason: "MAX_FILES",
          message: `Maximum allowed files is ${maxFiles}.`
        });
      }
      for (const f of allowed) {
        validateFile(f, accepted, rejections);
      }
    } else {
      for (const f of rawFiles) {
        validateFile(f, accepted, rejections);
      }
    }

    files.set(accepted);
    rejectedFiles.set(rejections);

    if (accepted.length > 0 && options.onDrop) {
      options.onDrop(accepted);
    }
    if (rejections.length > 0 && options.onDropRejected) {
      options.onDropRejected(rejections);
    }
  };

  const validateFile = (file: File, accepted: File[], rejections: FileRejection[]) => {
    if (options.accept && !isFileAccepted(file, options.accept)) {
      rejections.push({
        file,
        reason: "INVALID_TYPE",
        message: `File type "${file.type || "unknown"}" is not accepted.`
      });
      return;
    }

    if (options.maxSize !== undefined && file.size > options.maxSize) {
      rejections.push({
        file,
        reason: "MAX_SIZE",
        message: `File size (${file.size} bytes) exceeds maximum limit (${options.maxSize} bytes).`
      });
      return;
    }

    accepted.push(file);
  };

  const onDragEnter = (e: DragEvent) => {
    if (isDisabled()) return;
    e.preventDefault();
    e.stopPropagation?.();

    dragCounter += 1;
    if (dragCounter === 1) {
      isDraggingOver.set(true);
      options.onDragEnter?.(e);
    }
  };

  const onDragLeave = (e: DragEvent) => {
    if (isDisabled()) return;
    e.preventDefault();
    e.stopPropagation?.();

    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) {
      isDraggingOver.set(false);
      options.onDragLeave?.(e);
    }
  };

  const onDragOver = (e: DragEvent) => {
    if (isDisabled()) return;
    e.preventDefault();
    e.stopPropagation?.();

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    options.onDragOver?.(e);
  };

  const onDrop = (e: DragEvent) => {
    if (isDisabled()) return;
    e.preventDefault();
    e.stopPropagation?.();

    dragCounter = 0;
    isDraggingOver.set(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // If a target element or element getter is provided, attach event listeners directly
  if (typeof document !== "undefined" && target) {
    const getEl = typeof target === "function" ? target : () => target;
    const el = getEl();

    if (el) {
      el.addEventListener("dragenter", onDragEnter as EventListener);
      el.addEventListener("dragleave", onDragLeave as EventListener);
      el.addEventListener("dragover", onDragOver as EventListener);
      el.addEventListener("drop", onDrop as EventListener);

      onCleanup(() => {
        el.removeEventListener("dragenter", onDragEnter as EventListener);
        el.removeEventListener("dragleave", onDragLeave as EventListener);
        el.removeEventListener("dragover", onDragOver as EventListener);
        el.removeEventListener("drop", onDrop as EventListener);
      });
    }
  }

  return {
    isDraggingOver,
    files,
    rejectedFiles,
    reset,
    bind: () => ({
      onDragEnter,
      onDragLeave,
      onDragOver,
      onDrop
    })
  };
}
