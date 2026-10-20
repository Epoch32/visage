import { type Child, Show } from "@dom";
import { onCleanup } from "@signals";
import { useRouterContext } from "./context";
import { compilePath } from "./matcher";
import type { RouteDefinition, RouteProps, RoutesProps } from "./types";

/**
 * Route declaration registering URL path pattern and view component
 */
export function Route(props: RouteProps): Child {
  const router = useRouterContext();
  if (!router) {
    throw new Error("<Route> must be rendered inside a <Router>");
  }

  const { matcher, paramNames } = compilePath(props.path);
  const route: RouteDefinition = {
    path: props.path,
    component: props.component,
    children: props.children,
    matcher,
    paramNames
  };
  router.registerRoute(route);
  onCleanup(() => {
    router.unregisterRoute(route);
  });

  return null;
}

/**
 * Routes outlet matching the current URL to registered Route definitions
 */
export function Routes(props: RoutesProps): Child {
  const router = useRouterContext();
  if (!router) {
    throw new Error("<Routes> must be rendered inside a <Router>");
  }

  const _ =
    typeof props.children === "function" ? (props.children as () => Child)() : props.children;

  return Show({
    when: () => router.matchedRoute() !== null,
    fallback: props.fallback ?? (() => document.createTextNode("404 Not Found")),
    children: () => {
      const match = router.matchedRoute();
      if (!match) return null;

      if (match.component) {
        return match.component({ params: match.params });
      }
      return match.children ?? null;
    }
  });
}
