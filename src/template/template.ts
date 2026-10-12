import { insertChild, setAttribute } from "../dom/render";

const templateCache = new Map<string, HTMLTemplateElement>();

/**
 * Cache and clone pre-parsed HTML template strings with native browser cloneNode(true)
 */
export function template<T extends HTMLElement = HTMLElement>(htmlString: string): () => T {
  let templateEl = templateCache.get(htmlString);

  if (!templateEl && typeof document !== "undefined") {
    templateEl = document.createElement("template");
    templateEl.innerHTML = htmlString.trim();
    templateCache.set(htmlString, templateEl);
  }

  return () => {
    if (!templateEl) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = htmlString.trim();
      return wrapper.firstElementChild as T;
    }
    return templateEl.content.firstElementChild!.cloneNode(true) as T;
  };
}

/**
 * Tagged template literal for ultra-fast HTML string rendering with reactive signal bindings
 */
export function html(
  strings: TemplateStringsArray,
  ...values: any[]
): HTMLElement | DocumentFragment {
  const MARKER_PREFIX = "visage-bind-";
  let htmlString = "";
  const bindings: Array<{ id: string; value: any; isAttr: boolean; attrName?: string }> = [];

  for (let i = 0; i < strings.length; i++) {
    htmlString += strings[i];
    if (i < values.length) {
      const val = values[i];
      const markerId = `${MARKER_PREFIX}${i}`;

      const lastOpeningTag = htmlString.lastIndexOf("<");
      const lastClosingTag = htmlString.lastIndexOf(">");

      if (lastOpeningTag > lastClosingTag) {
        const match = htmlString.match(/([a-zA-Z0-9_-]+)=["']?$/);
        if (match?.[1]) {
          const attrName = match[1];
          bindings.push({ id: markerId, value: val, isAttr: true, attrName });
          htmlString += `${markerId}`;
        } else {
          bindings.push({ id: markerId, value: val, isAttr: true });
          htmlString += `data-visage-prop-${i}="${markerId}"`;
        }
      } else {
        bindings.push({ id: markerId, value: val, isAttr: false });
        htmlString += `<!--${markerId}-->`;
      }
    }
  }

  const clone = template(htmlString);
  const root = clone();

  for (const bind of bindings) {
    if (bind.isAttr && bind.attrName) {
      const targetEl = findElementWithAttributeValue(root as HTMLElement, bind.attrName, bind.id);
      if (targetEl) {
        targetEl.removeAttribute(bind.attrName);
        setAttribute(targetEl, bind.attrName, bind.value);
      }
    } else if (bind.isAttr && !bind.attrName) {
      const propAttr = `data-visage-prop-${bind.id.replace(MARKER_PREFIX, "")}`;
      const targetEl = findElementWithAttributeValue(root as HTMLElement, propAttr, bind.id);
      if (targetEl) {
        targetEl.removeAttribute(propAttr);
        if (typeof bind.value === "object" && bind.value !== null) {
          for (const key of Object.keys(bind.value)) {
            setAttribute(targetEl, key, bind.value[key]);
          }
        }
      }
    } else if (!bind.isAttr) {
      const commentNode = findCommentNode(root, bind.id);
      if (commentNode?.parentNode) {
        insertChild(commentNode.parentNode, bind.value, commentNode);
        commentNode.parentNode.removeChild(commentNode);
      }
    }
  }

  return root;
}

function findElementWithAttributeValue(
  root: HTMLElement,
  attrName: string,
  value: string
): HTMLElement | null {
  if (root.getAttribute(attrName) === value) {
    return root;
  }
  return root.querySelector(`[${attrName}="${value}"]`);
}

function findCommentNode(root: Node, text: string): Comment | null {
  const iterator =
    typeof document !== "undefined" && (document as any).createNodeIterator
      ? (document as any).createNodeIterator(root, 128 /* SHOW_COMMENT */)
      : null;

  if (iterator) {
    let node: Comment | null = iterator.nextNode();
    while (node) {
      if (node.nodeValue === text) {
        return node;
      }
      node = iterator.nextNode();
    }
    return null;
  }

  const traverse = (node: Node): Comment | null => {
    for (const child of node.childNodes || []) {
      if (child.nodeType === 8 /* COMMENT */ && (child as any).data === text) {
        return child as Comment;
      }
      const res = traverse(child);
      if (res) return res;
    }
    return null;
  };

  return traverse(root);
}
