import {
  effect,
  getActiveScope,
  isSignal,
  onCleanup,
  type ReadonlySignal,
  runInScope,
  Scope
} from "@signals";
import { isHydrating } from "./hydration";

export type ReactiveValue<T> = T | ReadonlySignal<T> | (() => T);
export type Child =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlySignal<any>
  | (() => any)
  | Child[];

/**
 * Check if a property is a reactive getter or signal
 */
export function isReactive<T>(value: unknown): value is ReadonlySignal<T> | (() => T) {
  return isSignal(value) || typeof value === "function";
}

/**
 * Extract current value whether static, signal, or getter
 */
export function resolveValue<T>(val: ReactiveValue<T>): T {
  if (typeof val === "function") {
    return (val as () => T)();
  }
  return val;
}

/**
 * Detach an array or collection of DOM nodes from their parent containers
 */
export function removeNodes(nodes: ArrayLike<Node>): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node?.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
}

function getSinglePlaceholderWhitespaceNode(parent: Node, before: Node | null): Text | null {
  if (
    before === null &&
    parent.firstChild !== null &&
    parent.firstChild === parent.lastChild &&
    parent.firstChild.nodeType === Node.TEXT_NODE &&
    (parent.firstChild as Text).data === " "
  ) {
    return parent.firstChild as Text;
  }
  return null;
}

/**
 * Insert a child node into a parent container with reactive fine-grained updates
 */
export function insertChild(parent: Node, child: Child, before: Node | null = null): Node | null {
  const placeholderText = getSinglePlaceholderWhitespaceNode(parent, before);

  if (child === null || child === undefined || child === false || child === true) {
    if (placeholderText !== null) {
      placeholderText.data = "";
    }
    return null;
  }

  if (typeof child === "string" || typeof child === "number") {
    if (placeholderText !== null) {
      placeholderText.data = String(child);
      return placeholderText;
    }
    const node = document.createTextNode(String(child));
    if (before === null) {
      parent.appendChild(node);
    } else {
      parent.insertBefore(node, before);
    }
    return node;
  }

  if (placeholderText !== null) {
    parent.removeChild(placeholderText);
  }

  if (child instanceof Node) {
    parent.insertBefore(child, before);
    return child;
  }

  if (Array.isArray(child)) {
    const fragment = document.createDocumentFragment();
    for (const item of child) {
      insertChild(fragment, item);
    }
    parent.insertBefore(fragment, before);
    return fragment;
  }

  if (isReactive(child)) {
    // Ultra-fast path for primitive string/number signals
    if (isSignal(child)) {
      const initial = typeof (child as any).peek === "function" ? (child as any).peek() : undefined;
      if (typeof initial === "string" || typeof initial === "number") {
        let textNode: Text;
        if (
          before === null &&
          parent.firstChild !== null &&
          parent.firstChild === parent.lastChild &&
          parent.firstChild.nodeType === Node.TEXT_NODE &&
          (isHydrating() || (parent.firstChild as Text).data === " ")
        ) {
          textNode = parent.firstChild as Text;
        } else {
          textNode = document.createTextNode("");
          if (before === null) {
            parent.appendChild(textNode);
          } else {
            parent.insertBefore(textNode, before);
          }
        }
        effect(() => {
          const val = (child as any)();
          textNode.data = typeof val === "string" ? val : val == null ? "" : String(val);
        });
        return textNode;
      }
    }

    // Dynamic / polymorphic reactive binding
    const marker = document.createTextNode("");
    parent.insertBefore(marker, before);

    let childScope: Scope | null = null;
    let currentNodes: Node[] = [];

    effect(() => {
      const resolved = resolveValue(child as ReactiveValue<any>);

      // Ultra-fast path: mutate existing single text node without recreating DOM
      if (
        (typeof resolved === "string" || typeof resolved === "number") &&
        currentNodes.length === 1 &&
        currentNodes[0]!.nodeType === Node.TEXT_NODE
      ) {
        (currentNodes[0] as Text).data = String(resolved);
        return;
      }

      if (childScope) {
        childScope.dispose();
      }
      childScope = new Scope(getActiveScope());

      runInScope(childScope, () => {
        // Clean up previous rendered nodes from DOM
        removeNodes(currentNodes);
        currentNodes = [];

        if (resolved === null || resolved === undefined || resolved === false) {
          return;
        }

        const frag = document.createDocumentFragment();
        if (
          typeof resolved === "string" ||
          typeof resolved === "number" ||
          typeof resolved === "boolean"
        ) {
          frag.appendChild(document.createTextNode(String(resolved)));
        } else {
          insertChild(frag, resolved);
        }

        currentNodes = Array.from(frag.childNodes);
        if (marker.parentNode) {
          marker.parentNode.insertBefore(frag, marker);
        }
      });
    });

    onCleanup(() => {
      if (childScope) {
        childScope.dispose();
      }
      removeNodes(currentNodes);
      if (marker.parentNode) {
        marker.parentNode.removeChild(marker);
      }
    });

    return marker;
  }

  // Primitive static child
  if (before === null && parent.firstChild === null) {
    parent.textContent = String(child);
    return parent.firstChild;
  }
  const textNode = document.createTextNode(String(child));
  parent.insertBefore(textNode, before);
  return textNode;
}
