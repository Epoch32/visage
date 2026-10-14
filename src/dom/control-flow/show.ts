import { effect, getActiveScope, onCleanup, runInScope, Scope, untrack } from "../../signals";
import { type Child, insertChild, type ReactiveValue, resolveValue } from "../render";

export interface ShowProps<T> {
  when: ReactiveValue<T | false | null | undefined>;
  fallback?: Child;
  children: Child | ((item: () => T) => Child);
}

/**
 * Conditionally renders JSX children when the `when` condition evaluates to truthy,
 * with fine-grained reactive scope lifecycle management and automatic fallback rendering.
 *
 * @example
 * ```tsx
 * const loggedIn = signal(false);
 *
 * <Show when={loggedIn} fallback={<div>Please log in</div>}>
 *   <Dashboard />
 * </Show>
 * ```
 */
export function Show<T>(props: ShowProps<T>): any {
  if (typeof document === "undefined") {
    const condition = resolveValue(props.when);
    if (condition) {
      return typeof props.children === "function" && props.children.length > 0
        ? (props.children as (item: () => T) => Child)(() => resolveValue(props.when) as T)
        : typeof props.children === "function"
          ? (props.children as () => Child)()
          : props.children;
    }
    return props.fallback ?? null;
  }

  const marker = document.createComment("visage-show");
  const initialFrag = document.createDocumentFragment();
  initialFrag.appendChild(marker);

  let currentScope: Scope | null = null;
  let currentContent: Node[] = [];

  effect(() => {
    const condition = resolveValue(props.when);

    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }

    // Clean up old nodes from DOM
    for (const node of currentContent) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    currentContent = [];

    const frag = document.createDocumentFragment();

    if (condition) {
      currentScope = new Scope(getActiveScope());
      untrack(() => {
        runInScope(currentScope, () => {
          const childRes =
            typeof props.children === "function" && props.children.length > 0
              ? (props.children as (item: () => T) => Child)(() => resolveValue(props.when) as T)
              : typeof props.children === "function"
                ? (props.children as () => Child)()
                : props.children;

          insertChild(frag, childRes);
        });
      });
    } else if (props.fallback !== undefined) {
      currentScope = new Scope(getActiveScope());
      untrack(() => {
        runInScope(currentScope, () => {
          const fallbackRes =
            typeof props.fallback === "function"
              ? (props.fallback as () => Child)()
              : props.fallback;
          insertChild(frag, fallbackRes);
        });
      });
    }

    currentContent = Array.from(frag.childNodes);

    const parent = marker.parentNode;
    if (parent) {
      parent.insertBefore(frag, marker);
    }
  });

  onCleanup(() => {
    if (currentScope) {
      currentScope.dispose();
    }
    for (const node of currentContent) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    if (marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  });

  return initialFrag;
}
