import type { Child } from "@dom";
import { computed, onCleanup, signal, type WritableSignal } from "@signals";
import { RouterContext } from "./context";
import { matchRoute } from "./matcher";
import type { NavigateOptions, RouteDefinition, RouterContextValue, RouterProps } from "./types";

/**
 * Root Router provider managing browser location state and URL synchronization
 */
export function Router(props: RouterProps): Child {
  const base = props.base ?? "";
  const mode = props.mode ?? "history";

  const getPathname = () => {
    if (typeof window === "undefined" || !window.location) return "/";
    if (mode === "hash") {
      const hash = window.location.hash.slice(1) || "/";
      return hash.split("?")[0] || "/";
    }
    return window.location.pathname || "/";
  };

  const getSearch = () => {
    if (typeof window === "undefined" || !window.location) return "";
    if (mode === "hash") {
      const hash = window.location.hash.slice(1);
      const queryIdx = hash.indexOf("?");
      return queryIdx !== -1 ? hash.slice(queryIdx) : "";
    }
    return window.location.search || "";
  };

  const getHash = () => {
    if (typeof window === "undefined" || !window.location) return "";
    return window.location.hash || "";
  };

  const pathname: WritableSignal<string> = signal(getPathname());
  const search: WritableSignal<string> = signal(getSearch());
  const hash: WritableSignal<string> = signal(getHash());

  const routes: RouteDefinition[] = [];
  const registeredRoutes = signal<RouteDefinition[]>([]);

  const registerRoute = (route: RouteDefinition) => {
    if (routes.includes(route)) return;
    routes.push(route);
    registeredRoutes.set([...routes]);
  };

  const unregisterRoute = (route: RouteDefinition) => {
    const idx = routes.indexOf(route);
    if (idx !== -1) {
      routes.splice(idx, 1);
      registeredRoutes.set([...routes]);
    }
  };

  const syncLocation = () => {
    pathname.set(getPathname());
    search.set(getSearch());
    hash.set(getHash());
  };

  if (typeof window !== "undefined") {
    const eventName = mode === "hash" ? "hashchange" : "popstate";
    window.addEventListener(eventName, syncLocation);
    onCleanup(() => window.removeEventListener(eventName, syncLocation));
  }

  const navigate = (to: string, options?: NavigateOptions) => {
    const normalizedBase = base ? base.replace(/\/$/, "") : "";
    let cleanTo = to;
    if (
      normalizedBase &&
      (cleanTo === normalizedBase ||
        cleanTo.startsWith(`${normalizedBase}/`) ||
        cleanTo.startsWith(`${normalizedBase}?`))
    ) {
      cleanTo = cleanTo.slice(normalizedBase.length) || "/";
    }
    const target = normalizedBase ? `${normalizedBase}/${cleanTo.replace(/^\//, "")}` : to;

    const performNavigation = () => {
      if (typeof window === "undefined" || !window.history) {
        pathname.set(to);
        return;
      }

      if (mode === "hash") {
        if (options?.replace) {
          window.location.replace(`#${to}`);
        } else {
          window.location.hash = `#${to}`;
        }
      } else {
        if (options?.replace) {
          window.history.replaceState(null, "", target);
        } else {
          window.history.pushState(null, "", target);
        }
      }
      syncLocation();
    };

    const useTransition = options?.viewTransition ?? props.viewTransitions ?? false;
    const doc = typeof document !== "undefined" ? (document as any) : null;

    if (useTransition && doc && typeof doc.startViewTransition === "function") {
      doc.startViewTransition(() => {
        performNavigation();
      });
    } else {
      performNavigation();
    }
  };

  const matchedRoute = computed(() => {
    const currentPath = pathname();
    const routeList = registeredRoutes();
    return matchRoute(routeList, currentPath, base);
  });

  const params = computed(() => matchedRoute()?.params ?? {});

  const routerValue: RouterContextValue = {
    location: { pathname, search, hash },
    navigate,
    prefetchDefault: props.prefetch,
    params,
    base,
    matchedRoute,
    routes,
    registerRoute,
    unregisterRoute
  };

  return RouterContext.Provider({
    value: routerValue,
    children: props.children
  });
}

export { lazy } from "@dom";
export { RouterContext, useRouterContext } from "./context";
export {
  useLocation,
  useNavigate,
  useParams,
  usePrefetch,
  useSearchParams
} from "./hooks";
export { Link } from "./link";
export { compilePath, matchRoute } from "./matcher";
export { clearPrefetchCache, prefetch } from "./prefetch";
export { Route, Routes } from "./routes";
export type {
  LinkProps,
  LocationState,
  MatchedRoute,
  NavigateOptions,
  RouteDefinition,
  RouteProps,
  RouterContextValue,
  RouterProps,
  RoutesProps
} from "./types";
