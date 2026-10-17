/**
 * Visage Hydration Engine
 *
 * Adopts server-rendered DOM nodes without wiping or recreating the DOM tree,
 * preserving DOM identity, event handlers, and avoiding layout shifts.
 */

let hydrationActive = false;
let postOrderElements: Element[] = [];
let postOrderIndex = 0;
let templateElements: Element[] = [];
let templateIndex = 0;

export function isHydrating(): boolean {
  return hydrationActive;
}

export function getNextHydrationElement(tagName: string): Element | null {
  if (!hydrationActive) return null;
  const targetTag = tagName.toLowerCase();

  for (let i = postOrderIndex; i < postOrderElements.length; i++) {
    const el = postOrderElements[i];
    if (el && el.tagName.toLowerCase() === targetTag) {
      postOrderIndex = i + 1;
      return el;
    }
  }
  return null;
}

export function getNextTemplateHydrationElement(): Element | null {
  if (!hydrationActive) return null;
  if (templateIndex < templateElements.length) {
    const el = templateElements[templateIndex++];
    return el ?? null;
  }
  return null;
}

function collectPostOrderElements(root: Node): Element[] {
  const result: Element[] = [];
  function traverse(node: Node) {
    for (let child = node.firstChild; child !== null; child = child.nextSibling) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        traverse(child);
      }
    }
    if (node !== root && node.nodeType === Node.ELEMENT_NODE) {
      result.push(node as Element);
    }
  }
  traverse(root);
  return result;
}

export function runInHydration<T>(container: Node, fn: () => T): T {
  const prevActive = hydrationActive;
  const prevPostOrder = postOrderElements;
  const prevPostOrderIndex = postOrderIndex;
  const prevTemplateElements = templateElements;
  const prevTemplateIndex = templateIndex;

  hydrationActive = true;
  postOrderElements = collectPostOrderElements(container);
  postOrderIndex = 0;

  templateElements = [];
  for (let child = container.firstChild; child !== null; child = child.nextSibling) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      templateElements.push(child as Element);
    }
  }
  templateIndex = 0;

  try {
    return fn();
  } finally {
    hydrationActive = prevActive;
    postOrderElements = prevPostOrder;
    postOrderIndex = prevPostOrderIndex;
    templateElements = prevTemplateElements;
    templateIndex = prevTemplateIndex;
  }
}
