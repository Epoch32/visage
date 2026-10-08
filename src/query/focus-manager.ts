export type FocusListener = (focused: boolean) => void;

export class FocusManager {
  private _focused?: boolean;
  private _listeners = new Set<FocusListener>();
  private _cleanup?: () => void;

  constructor() {
    this.setupEventListener();
  }

  private setupEventListener() {
    if (typeof window === "undefined" || typeof window.addEventListener === "undefined") {
      return;
    }

    const listener = () => {
      this.notify(this.isFocused());
    };

    window.addEventListener("visibilitychange", listener, false);
    window.addEventListener("focus", listener, false);

    this._cleanup = () => {
      window.removeEventListener("visibilitychange", listener);
      window.removeEventListener("focus", listener);
    };
  }

  setFocused(focused?: boolean) {
    this._focused = focused;
    this.notify(this.isFocused());
  }

  isFocused(): boolean {
    if (typeof this._focused === "boolean") {
      return this._focused;
    }
    if (typeof document !== "undefined" && typeof document.visibilityState === "string") {
      return document.visibilityState !== "hidden";
    }
    return true;
  }

  subscribe(listener: FocusListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private notify(focused: boolean) {
    for (const listener of this._listeners) {
      try {
        listener(focused);
      } catch (err) {
        console.error("Error in focus listener:", err);
      }
    }
  }

  cleanup() {
    this._cleanup?.();
    this._listeners.clear();
  }
}

export const focusManager = new FocusManager();
