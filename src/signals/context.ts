import { type Child, insertChild } from "../dom/render";
import { getActiveScope, runInScope, Scope } from "./scope";
import { untrack } from "./system";

export interface Context<T> {
  id: symbol;
  defaultValue: T;
  Provider: (props: { value: T; children: Child }) => any;
}

/**
 * Create a reactive Context for dependency injection across the component tree.
 *
 * Context allows passing state and utilities down the component tree without
 * manually drilling props through every intermediate component.
 *
 * @example
 * ```tsx
 * const ThemeContext = createContext<"light" | "dark">("light");
 *
 * // Provide value in parent
 * function App() {
 *   return (
 *     <ThemeContext.Provider value="dark">
 *       <Header />
 *     </ThemeContext.Provider>
 *   );
 * }
 *
 * // Consume value in descendant
 * function Header() {
 *   const theme = useContext(ThemeContext);
 *   return <div>Current theme: {theme}</div>;
 * }
 * ```
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
        const content =
          typeof props.children === "function"
            ? (props.children as (...args: any[]) => any)()
            : props.children;
        if (typeof document !== "undefined") {
          const frag = document.createDocumentFragment();
          insertChild(frag, content);
          return frag;
        }
        return content;
      });
    }
  };

  return context;
}

/**
 * Consume a Context value from the nearest ancestor Provider, falling back to defaultValue.
 *
 * @param context - The Context object returned from `createContext`
 * @returns The current context value
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
