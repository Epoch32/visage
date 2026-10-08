// Minimal Zero-Dependency In-Memory DOM for headless test & benchmark environments

export class MockNode {
  static readonly TEXT_NODE = 3;
  static readonly ELEMENT_NODE = 1;
  static readonly DOCUMENT_NODE = 9;
  static readonly DOCUMENT_FRAGMENT_NODE = 11;
  static readonly COMMENT_NODE = 8;

  nodeType: number = MockNode.ELEMENT_NODE;
  parentNode: MockNode | null = null;
  childNodes: MockNode[] = [];

  get ownerDocument(): any {
    return (globalThis as any).document;
  }

  get firstChild(): MockNode | null {
    return this.childNodes[0] ?? null;
  }

  get firstElementChild(): MockElement | null {
    for (const child of this.childNodes) {
      if (child instanceof MockElement) return child;
    }
    return null;
  }

  get nextSibling(): MockNode | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    if (idx === -1 || idx === this.parentNode.childNodes.length - 1) return null;
    return this.parentNode.childNodes[idx + 1] ?? null;
  }

  appendChild(child: MockNode): MockNode {
    return this.insertBefore(child, null);
  }

  insertBefore(newNode: MockNode, referenceNode: MockNode | null): MockNode {
    if (newNode.nodeType === MockNode.DOCUMENT_FRAGMENT_NODE) {
      const children = [...newNode.childNodes];
      for (const child of children) {
        this.insertBefore(child, referenceNode);
      }
      newNode.childNodes = [];
      return newNode;
    }

    if (newNode.parentNode) {
      newNode.parentNode.removeChild(newNode);
    }

    newNode.parentNode = this;
    if (!referenceNode) {
      this.childNodes.push(newNode);
    } else {
      const idx = this.childNodes.indexOf(referenceNode);
      if (idx === -1) {
        this.childNodes.push(newNode);
      } else {
        this.childNodes.splice(idx, 0, newNode);
      }
    }
    return newNode;
  }

  removeChild(child: MockNode): MockNode {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  replaceChild(newChild: MockNode, oldChild: MockNode): MockNode {
    this.insertBefore(newChild, oldChild);
    this.removeChild(oldChild);
    return oldChild;
  }

  cloneNode(deep = false): MockNode {
    let clone: MockNode;
    if (this instanceof MockText) {
      clone = new MockText(this.data);
    } else if (this instanceof MockComment) {
      clone = new MockComment(this.data);
    } else if (this instanceof MockDocumentFragment) {
      clone = new MockDocumentFragment();
    } else if (this instanceof MockElement) {
      const el = new MockElement(this.tagName.toLowerCase());
      for (const [k, v] of this.attributes) el.setAttribute(k, v);
      clone = el;
    } else {
      clone = new MockNode();
    }

    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join("");
  }

  set textContent(text: string) {
    this.childNodes = [];
    this.insertBefore(new MockText(text), null);
  }
}

export class MockText extends MockNode {
  override nodeType = MockNode.TEXT_NODE;
  data: string;

  constructor(text: string) {
    super();
    this.data = String(text);
  }

  override get textContent(): string {
    return this.data;
  }

  override set textContent(text: string) {
    this.data = String(text);
  }
}

export class MockComment extends MockNode {
  override nodeType = MockNode.COMMENT_NODE;
  data: string;

  constructor(text: string) {
    super();
    this.data = String(text);
  }

  override get textContent(): string {
    return "";
  }
}

export class MockDocumentFragment extends MockNode {
  override nodeType = MockNode.DOCUMENT_FRAGMENT_NODE;
}

export class MockElement extends MockNode {
  tagName: string;
  attributes: Map<string, string> = new Map();
  style: Record<string, string> = {};
  listeners: Map<string, Set<(e: any) => void>> = new Map();
  scrollTop = 0;
  scrollLeft = 0;
  private _clientHeight?: number;
  private _clientWidth?: number;

  get clientHeight(): number {
    if (this._clientHeight !== undefined) return this._clientHeight;
    if (this.style.height) return Number.parseInt(this.style.height, 10) || 500;
    return 500;
  }

  set clientHeight(val: number) {
    this._clientHeight = val;
  }

  get clientWidth(): number {
    if (this._clientWidth !== undefined) return this._clientWidth;
    if (this.style.width) return Number.parseInt(this.style.width, 10) || 500;
    return 500;
  }

  set clientWidth(val: number) {
    this._clientWidth = val;
  }

  constructor(tagName: string) {
    super();
    this.tagName = tagName.toUpperCase();
  }

  get content(): MockDocumentFragment {
    const frag = new MockDocumentFragment();
    for (const child of this.childNodes) {
      frag.appendChild(child.cloneNode(true));
    }
    return frag;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  addEventListener(event: string, handler: (e: any) => void) {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  removeEventListener(event: string, handler: (e: any) => void) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  dispatchEvent(event: { type: string }) {
    const set = this.listeners.get(event.type);
    if (set) {
      for (const h of set) {
        h(event);
      }
    }
  }

  click() {
    this.dispatchEvent({ type: "click" });
  }

  querySelector(selector: string): MockElement | null {
    const all = this.querySelectorAll(selector);
    return all[0] ?? null;
  }

  querySelectorAll(selector: string): MockElement[] {
    const matches: MockElement[] = [];

    const traverse = (node: MockNode) => {
      if (node instanceof MockElement) {
        if (
          selector.startsWith(".") &&
          node.getAttribute("class")?.split(/\s+/).includes(selector.slice(1))
        ) {
          matches.push(node);
        } else if (selector.startsWith("#") && node.getAttribute("id") === selector.slice(1)) {
          matches.push(node);
        } else if (selector.startsWith("[") && selector.endsWith("]")) {
          const attrMatch = selector.slice(1, -1).split("=");
          if (attrMatch.length === 2) {
            const attrKey = attrMatch[0]!;
            const attrVal = attrMatch[1]!.replace(/^["']|["']$/g, "");
            if (node.getAttribute(attrKey) === attrVal) {
              matches.push(node);
            }
          }
        } else if (node.tagName.toLowerCase() === selector.toLowerCase()) {
          matches.push(node);
        }
      }
      for (const child of node.childNodes) {
        traverse(child);
      }
    };

    for (const child of this.childNodes) {
      traverse(child);
    }
    return matches;
  }

  get innerHTML(): string {
    return this.textContent;
  }

  set innerHTML(htmlStr: string) {
    this.childNodes = [];
    if (!htmlStr) return;

    const tagRegex =
      /<!--([\s\S]*?)-->|<([a-zA-Z0-9_-]+)([^>]*)>([\s\S]*?)<\/\2>|<([a-zA-Z0-9_-]+)([^>]*)\/>|([^<]+)/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(htmlStr)) !== null) {
      if (match[1] !== undefined) {
        this.appendChild(new MockComment(match[1]));
      } else if (match[2] !== undefined) {
        const el = new MockElement(match[2]);
        const attrs = match[3] || "";
        const inner = match[4] || "";

        const attrRegex = /([a-zA-Z0-9_-]+)=["']([^"']*)["']/g;
        let attrMatch: RegExpExecArray | null;
        while ((attrMatch = attrRegex.exec(attrs)) !== null) {
          el.setAttribute(attrMatch[1]!, attrMatch[2]!);
        }

        if (inner) {
          el.innerHTML = inner;
        }
        this.appendChild(el);
      } else if (match[5] !== undefined) {
        const el = new MockElement(match[5]);
        const attrs = match[6] || "";
        const attrRegex = /([a-zA-Z0-9_-]+)=["']([^"']*)["']/g;
        let attrMatch: RegExpExecArray | null;
        while ((attrMatch = attrRegex.exec(attrs)) !== null) {
          el.setAttribute(attrMatch[1]!, attrMatch[2]!);
        }
        this.appendChild(el);
      } else if (match[7]?.trim()) {
        this.appendChild(new MockText(match[7]));
      }
    }
  }
}

export function setupDOM() {
  const g = globalThis as any;
  if (!g.document) {
    const listeners = new Map<string, Set<any>>();
    const body = new MockElement("body");

    const location: any = {
      pathname: "/",
      search: "",
      hash: "",
      href: "http://localhost/"
    };

    const history: any = {
      pushState: (_data: any, _unused: string, url: string) => {
        location.pathname = url.split("?")[0] || "/";
        const qIdx = url.indexOf("?");
        location.search = qIdx !== -1 ? url.slice(qIdx) : "";
      },
      replaceState: (_data: any, _unused: string, url: string) => {
        location.pathname = url.split("?")[0] || "/";
        const qIdx = url.indexOf("?");
        location.search = qIdx !== -1 ? url.slice(qIdx) : "";
      }
    };

    const doc: any = {
      nodeType: MockNode.DOCUMENT_NODE,
      body,
      documentElement: body,
      activeElement: body,
      createElement: (tag: string) => new MockElement(tag),
      createElementNS: (_ns: string, tag: string) => new MockElement(tag),
      createTextNode: (text: string) => new MockText(text),
      createDocumentFragment: () => new MockDocumentFragment(),
      createComment: (text: string) => new MockComment(text),
      addEventListener: (evt: string, fn: any) => {
        let set = listeners.get(evt);
        if (!set) {
          set = new Set();
          listeners.set(evt, set);
        }
        set.add(fn);
      },
      removeEventListener: (evt: string, fn: any) => {
        listeners.get(evt)?.delete(fn);
      }
    };

    const win: any = {
      document: doc,
      location,
      history,
      Node: MockNode,
      HTMLElement: MockElement,
      HTMLIFrameElement: MockElement,
      SVGElement: MockElement,
      Text: MockText,
      Comment: MockComment,
      DocumentFragment: MockDocumentFragment,
      addEventListener: doc.addEventListener,
      removeEventListener: doc.removeEventListener
    };

    doc.defaultView = win;

    g.Node = MockNode;
    g.HTMLElement = MockElement;
    g.HTMLIFrameElement = MockElement;
    g.SVGElement = MockElement;
    g.Text = MockText;
    g.Comment = MockComment;
    g.DocumentFragment = MockDocumentFragment;
    g.document = doc;
    g.window = win;
    g.location = location;
    g.history = history;
  }
}
