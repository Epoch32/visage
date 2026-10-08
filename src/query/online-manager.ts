export type OnlineListener = (online: boolean) => void;

export class OnlineManager {
  private _online?: boolean;
  private _listeners = new Set<OnlineListener>();
  private _cleanup?: () => void;

  constructor() {
    this.setupEventListener();
  }

  private setupEventListener() {
    if (typeof window === "undefined" || typeof window.addEventListener === "undefined") {
      return;
    }

    const onlineListener = () => this.notify(true);
    const offlineListener = () => this.notify(false);

    window.addEventListener("online", onlineListener, false);
    window.addEventListener("offline", offlineListener, false);

    this._cleanup = () => {
      window.removeEventListener("online", onlineListener);
      window.removeEventListener("offline", offlineListener);
    };
  }

  setOnline(online?: boolean) {
    this._online = online;
    this.notify(this.isOnline());
  }

  isOnline(): boolean {
    if (typeof this._online === "boolean") {
      return this._online;
    }
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return navigator.onLine;
    }
    return true;
  }

  subscribe(listener: OnlineListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private notify(online: boolean) {
    for (const listener of this._listeners) {
      try {
        listener(online);
      } catch (err) {
        console.error("Error in online listener:", err);
      }
    }
  }

  cleanup() {
    this._cleanup?.();
    this._listeners.clear();
  }
}

export const onlineManager = new OnlineManager();
