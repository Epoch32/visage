/**
 * Global Delegated Event System for Visage
 *
 * Attaches a single event listener per delegable event type to document,
 * routing events to element __${eventName} handlers via event bubbling.
 * This completely eliminates per-element addEventListener overhead.
 */

export const DELEGATED_EVENTS = new Set([
  "click",
  "dblclick",
  "contextmenu",
  "focusin",
  "focusout",
  "input",
  "change",
  "keydown",
  "keyup",
  "keypress",
  "mousedown",
  "mouseup",
  "pointerdown",
  "pointerup",
  "touchstart",
  "touchend",
  "touchcancel"
]);

const registeredEventsForDoc = new WeakMap<Document, Set<string>>();

/**
 * Register global delegated event listeners on the document
 */
export function delegateEvents(eventNames: string[], doc?: Document): void {
  const targetDoc = doc || (typeof document !== "undefined" ? document : null);
  if (!targetDoc) return;

  let docEvents = registeredEventsForDoc.get(targetDoc);
  if (!docEvents) {
    docEvents = new Set<string>();
    registeredEventsForDoc.set(targetDoc, docEvents);
  }

  for (const name of eventNames) {
    if (docEvents.has(name)) continue;
    docEvents.add(name);

    targetDoc.addEventListener(name, (event: Event) => {
      let node: any = event.target;
      const propKey = `__${name}`;

      while (node && node !== targetDoc) {
        const handler = node[propKey];
        if (handler) {
          if (typeof handler === "function") {
            handler(event);
          } else if (Array.isArray(handler) && typeof handler[0] === "function") {
            handler[0](handler[1], event);
          }
          if (event.cancelBubble) break;
        }
        node = node.parentNode;
      }
    });
  }
}
