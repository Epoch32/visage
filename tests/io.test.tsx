import { describe, expect, it } from "bun:test";
import { setupDOM } from "./dom-mock";

setupDOM();

import {
  createClipboard,
  createDropZone,
  createFilePicker,
  createMediaUrl,
  DropZone,
  isFileAccepted,
  onPaste
} from "../src/io";
import { createRoot } from "../src/signals";

describe("Visage IO Primitives (visage/io)", () => {
  describe("isFileAccepted", () => {
    it("accepts all files when accept list is empty", () => {
      const file = new File(["test"], "test.png", { type: "image/png" });
      expect(isFileAccepted(file)).toBe(true);
      expect(isFileAccepted(file, [])).toBe(true);
    });

    it("matches exact MIME types", () => {
      const png = new File(["test"], "test.png", { type: "image/png" });
      const jpg = new File(["test"], "test.jpg", { type: "image/jpeg" });

      expect(isFileAccepted(png, ["image/png"])).toBe(true);
      expect(isFileAccepted(jpg, ["image/png"])).toBe(false);
    });

    it("matches wildcard MIME types", () => {
      const png = new File(["test"], "test.png", { type: "image/png" });
      const pdf = new File(["test"], "test.pdf", { type: "application/pdf" });

      expect(isFileAccepted(png, ["image/*"])).toBe(true);
      expect(isFileAccepted(pdf, ["image/*"])).toBe(false);
    });

    it("matches file extensions", () => {
      const pdf = new File(["test"], "report.PDF", { type: "application/pdf" });
      const doc = new File(["test"], "report.docx", { type: "application/vnd.openxmlformats" });

      expect(isFileAccepted(pdf, [".pdf"])).toBe(true);
      expect(isFileAccepted(doc, [".pdf"])).toBe(false);
    });
  });

  describe("createDropZone", () => {
    it("tracks dragenter and dragleave state without flicker", () => {
      createRoot((dispose) => {
        const dropzone = createDropZone(null);
        const bind = dropzone.bind();

        expect(dropzone.isDraggingOver()).toBe(false);

        // Enter root
        bind.onDragEnter(new DragEvent("dragenter"));
        expect(dropzone.isDraggingOver()).toBe(true);

        // Enter child element (counter increments to 2)
        bind.onDragEnter(new DragEvent("dragenter"));
        expect(dropzone.isDraggingOver()).toBe(true);

        // Leave child element (counter decrements to 1)
        bind.onDragLeave(new DragEvent("dragleave"));
        expect(dropzone.isDraggingOver()).toBe(true);

        // Leave root (counter decrements to 0)
        bind.onDragLeave(new DragEvent("dragleave"));
        expect(dropzone.isDraggingOver()).toBe(false);

        dispose();
      });
    });

    it("validates files on drop with accept and maxSize filters", () => {
      createRoot((dispose) => {
        let acceptedResult: File[] = [];
        let rejectedResult: any[] = [];

        const dropzone = createDropZone(null, {
          accept: ["image/*"],
          maxSize: 1000,
          onDrop: (f) => {
            acceptedResult = f;
          },
          onDropRejected: (r) => {
            rejectedResult = r;
          }
        });

        const validImage = new File(["1234"], "valid.png", { type: "image/png" });
        const invalidType = new File(["1234"], "doc.pdf", { type: "application/pdf" });
        const oversized = new File([new Uint8Array(2000)], "huge.png", { type: "image/png" });

        const bind = dropzone.bind();
        const dropEvent = new DragEvent("drop");
        Object.defineProperty(dropEvent, "dataTransfer", {
          value: {
            files: [validImage, invalidType, oversized]
          }
        });

        bind.onDrop(dropEvent);

        expect(dropzone.files().length).toBe(1);
        expect(dropzone.files()[0]!.name).toBe("valid.png");
        expect(acceptedResult.length).toBe(1);

        expect(dropzone.rejectedFiles().length).toBe(2);
        expect(dropzone.rejectedFiles()[0]!.reason).toBe("INVALID_TYPE");
        expect(dropzone.rejectedFiles()[1]!.reason).toBe("MAX_SIZE");
        expect(rejectedResult.length).toBe(2);

        // Test reset
        dropzone.reset();
        expect(dropzone.files().length).toBe(0);
        expect(dropzone.rejectedFiles().length).toBe(0);

        dispose();
      });
    });

    it("enforces maxFiles limit", () => {
      createRoot((dispose) => {
        const dropzone = createDropZone(null, {
          maxFiles: 2
        });

        const f1 = new File(["a"], "a.txt", { type: "text/plain" });
        const f2 = new File(["b"], "b.txt", { type: "text/plain" });
        const f3 = new File(["c"], "c.txt", { type: "text/plain" });

        const bind = dropzone.bind();
        const dropEvent = new DragEvent("drop");
        Object.defineProperty(dropEvent, "dataTransfer", {
          value: {
            files: [f1, f2, f3]
          }
        });

        bind.onDrop(dropEvent);

        expect(dropzone.files().length).toBe(2);
        expect(dropzone.rejectedFiles().length).toBe(1);
        expect(dropzone.rejectedFiles()[0]!.reason).toBe("MAX_FILES");

        dispose();
      });
    });
  });

  describe("createClipboard", () => {
    it("copies text and manages copied signal state", async () => {
      // Mock navigator.clipboard
      let writtenText = "";
      (globalThis as any).navigator = {
        clipboard: {
          writeText: async (t: string) => {
            writtenText = t;
          },
          readText: async () => writtenText
        }
      };

      await createRoot(async (dispose) => {
        const clipboard = createClipboard({ timeout: 100 });
        expect(clipboard.copied()).toBe(false);

        const success = await clipboard.copy("Hello Visage!");
        expect(success).toBe(true);
        expect(writtenText).toBe("Hello Visage!");
        expect(clipboard.copied()).toBe(true);
        expect(clipboard.text()).toBe("Hello Visage!");

        const readContent = await clipboard.read();
        expect(readContent).toBe("Hello Visage!");

        // Wait for auto-reset
        await new Promise((resolve) => setTimeout(resolve, 150));
        expect(clipboard.copied()).toBe(false);

        dispose();
      });
    });
  });

  describe("onPaste", () => {
    it("extracts pasted text and files from clipboard event", () => {
      createRoot((dispose) => {
        let pastedFiles: File[] = [];
        let pastedText = "";

        const mockContainer = document.createElement("div");
        onPaste(mockContainer, {
          onFiles: (files) => {
            pastedFiles = files;
          },
          onText: (text) => {
            pastedText = text;
          }
        });

        const pasteEvent = new Event("paste") as any;
        pasteEvent.clipboardData = {
          files: [new File(["img"], "screenshot.png", { type: "image/png" })],
          getData: () => ""
        };

        mockContainer.dispatchEvent(pasteEvent);
        expect(pastedFiles.length).toBe(1);
        expect(pastedFiles[0]!.name).toBe("screenshot.png");

        const textPasteEvent = new Event("paste") as any;
        textPasteEvent.clipboardData = {
          files: [],
          getData: () => "Pasted string"
        };

        mockContainer.dispatchEvent(textPasteEvent);
        expect(pastedText).toBe("Pasted string");

        dispose();
      });
    });
  });

  describe("createFilePicker and createMediaUrl", () => {
    it("creates media preview URL and cleans up on unmount", () => {
      let createdUrl = "";
      let revokedUrl = "";

      (globalThis as any).URL = {
        createObjectURL: (blob: any) => {
          createdUrl = `blob:test/${blob.name || "file"}`;
          return createdUrl;
        },
        revokeObjectURL: (url: string) => {
          revokedUrl = url;
        }
      };

      createRoot((dispose) => {
        const file = new File(["data"], "avatar.png", { type: "image/png" });
        const url = createMediaUrl(file);

        expect(url).toBe("blob:test/avatar.png");
        expect(revokedUrl).toBe("");

        dispose();
        expect(revokedUrl).toBe("blob:test/avatar.png");
      });
    });

    it("spawns file picker and returns files on change", async () => {
      const picker = createFilePicker({ accept: ["image/*"], multiple: true });
      const openPromise = picker.open();

      // Find the injected input element
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.multiple).toBe(true);
      expect(input.accept).toBe("image/*");

      const testFile = new File(["content"], "upload.jpg", { type: "image/jpeg" });
      Object.defineProperty(input, "files", {
        value: [testFile]
      });

      input.dispatchEvent(new Event("change"));

      const selected = await openPromise;
      expect(selected.length).toBe(1);
      expect(selected[0]!.name).toBe("upload.jpg");
    });
  });

  describe("DropZone Component", () => {
    it("renders DropZone with data-drag-over attribute and render props", () => {
      createRoot((dispose) => {
        const dropzoneNode = DropZone({
          class: "test-dropzone",
          dragOverClass: "is-active",
          children: (zone) => <div>{() => (zone.isDraggingOver() ? "Drop here!" : "Idle")}</div>
        }) as HTMLElement;

        expect(dropzoneNode.className).toBe("test-dropzone");
        expect(dropzoneNode.getAttribute("data-drag-over")).toBeNull();

        dropzoneNode.dispatchEvent(new DragEvent("dragenter"));
        expect(dropzoneNode.getAttribute("data-drag-over")).toBe("true");

        dropzoneNode.dispatchEvent(new DragEvent("dragleave"));
        expect(dropzoneNode.getAttribute("data-drag-over")).toBeNull();

        dispose();
      });
    });
  });
});
