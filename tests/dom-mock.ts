import { GlobalWindow } from "happy-dom";

export function setupDOM() {
  const g = globalThis as any;
  if (!g.document) {
    const window = new GlobalWindow({ url: "http://localhost:3000" });
    const doc = window.document;

    // Bind standard WHATWG DOM globals to globalThis
    g.window = window;
    g.document = doc;
    g.Node = window.Node;
    g.HTMLElement = window.HTMLElement;
    g.HTMLInputElement = window.HTMLInputElement;
    g.HTMLTextAreaElement = window.HTMLTextAreaElement;
    g.HTMLSelectElement = window.HTMLSelectElement;
    g.HTMLIFrameElement = window.HTMLIFrameElement;
    g.HTMLScriptElement = window.HTMLScriptElement;
    g.HTMLLinkElement = window.HTMLLinkElement;
    g.HTMLAnchorElement = window.HTMLAnchorElement;
    g.SVGElement = window.SVGElement;
    g.Text = window.Text;
    g.Comment = window.Comment;
    g.DocumentFragment = window.DocumentFragment;
    g.Event = window.Event;
    g.CustomEvent = window.CustomEvent;
    g.MouseEvent = window.MouseEvent;
    g.KeyboardEvent = window.KeyboardEvent;
    g.FocusEvent = window.FocusEvent;
    g.InputEvent = (window as any).InputEvent || window.Event;
    g.DragEvent = (window as any).DragEvent || window.Event;
    g.location = window.location;
    g.history = window.history;
    g.requestAnimationFrame = window.requestAnimationFrame.bind(window);
    g.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

    // Provide standard HTML Popover API stubs on HTMLElement prototype
    const elementProto = (window as any).HTMLElement?.prototype;
    if (elementProto && !elementProto.showPopover) {
      elementProto.showPopover = function () {
        const wasOpen = this.__popoverOpen === true;
        this.__popoverOpen = true;
        const ev = new (window as any).Event("toggle");
        (ev as any).oldState = wasOpen ? "open" : "closed";
        (ev as any).newState = "open";
        this.dispatchEvent(ev);
      };
      elementProto.hidePopover = function () {
        const wasOpen = this.__popoverOpen === true;
        this.__popoverOpen = false;
        const ev = new (window as any).Event("toggle");
        (ev as any).oldState = wasOpen ? "open" : "closed";
        (ev as any).newState = "closed";
        this.dispatchEvent(ev);
      };
    }

    // Teach happy-dom's CSS parser about modern dynamic viewport units (dvh, dvw, lvh, svh)
    const styleProto = (window as any).CSSStyleDeclaration?.prototype;
    if (styleProto) {
      const origSetProperty = styleProto.setProperty;
      styleProto.setProperty = function (property: string, value: string, priority?: string) {
        if (typeof value === "string") {
          (this as any)[`__unit_${property}`] = value;
        }
        return origSetProperty.call(this, property, value, priority);
      };
      for (const prop of ["height", "width", "minHeight", "maxHeight", "minWidth", "maxWidth"]) {
        Object.defineProperty(styleProto, prop, {
          get() {
            return (this as any)[`__unit_${prop}`] || this.getPropertyValue(prop);
          },
          set(val: string) {
            this.setProperty(prop, val);
          },
          configurable: true,
          enumerable: true
        });
      }
    }
  }
}

export const setupDom = setupDOM;
