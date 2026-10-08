import { type Child, insertChild } from "../dom/render";
import { Scope, getActiveScope, runInScope } from "./signal";

export interface Context<T> {
  id: symbol;
  defaultValue: T;
  Provider: (props: { value: T; children: Child }) => any;
}

// Extend Scope with context registry
declare module "./signal" {
  interface Scope {
    context?: Map<symbol, any>;
  }
}

/**
 * Create a reactive Context for dependency injection across the component tree
 */
export function createContext<T>(defaultValue: T): Context<T>;
export function createContext<T>(): Context<T | undefined>;
export function createContext<T>(defaultValue?: T): Context<T | undefined> {
  const id = Symbol("visage.context");

  const context: Context<T | undefined> = {
    id,
    defaultValue,
    Provider: (props: { value: T | undefined; children: Child }): any => {
      const parentScope = getActiveScope();
      const scope = new Scope(parentScope);

      if (!scope.context) {
        scope.context = new Map(parentScope?.context);
      }
      scope.context.set(id, props.value);

      return runInScope(scope, () => {
        if (typeof document !== "undefined") {
          const frag = document.createDocumentFragment();
          insertChild(frag, props.children);
          return frag;
        }
        if (typeof props.children === "function") {
          return (props.children as (...args: any[]) => any)();
        }
        return props.children;
      });
    }
  };

  return context;
}

/**
 * Consume a Context value from the nearest ancestor Provider
 */
export function useContext<T>(context: Context<T>): T {
  let scope = getActiveScope();

  while (scope) {
    if (scope.context?.has(context.id)) {
      return scope.context.get(context.id);
    }
    scope = scope.parent;
  }

  return context.defaultValue;
}
