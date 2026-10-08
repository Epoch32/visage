/** @jsxImportSource visage */
import { type Child, createResource, Show, Suspense } from "../dom";
import {
  computed,
  createContext,
  onCleanup,
  type ReadonlySignal,
  signal,
  useContext,
  type WritableSignal
} from "../signals";

export interface LocationState {
  pathname: ReadonlySignal<string>;
  search: ReadonlySignal<string>;
  hash: ReadonlySignal<string>;
}

export interface RouterContextValue {
  location: LocationState;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  params: ReadonlySignal<Record<string, string>>;
  base: string;
  matchedRoute: ReadonlySignal<MatchedRoute | null>;
  routes: RouteDefinition[];
  registerRoute: (route: RouteDefinition) => void;
}

export interface MatchedRoute {
  path: string;
  params: Record<string, string>;
  component?: (props?: any) => Child;
  children?: Child;
}

export interface RouteDefinition {
  path: string;
  component?: (props?: any) => Child;
  children?: Child;
  matcher: RegExp;
  paramNames: string[];
}

const RouterContext = createContext<RouterContextValue | null>(null);

function compilePath(path: string): { matcher: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const normalized = path.replace(/\/+$/, "") || "/";

  const regexStr = normalized
    .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    })
    .replace(/\*/g, "(.*)");

  const matcher = new RegExp(`^${regexStr}(?:/)?$`);
  return { matcher, paramNames };
}

function matchRoute(routes: RouteDefinition[], pathname: string, base = ""): MatchedRoute | null {
  const cleanPath =
    base && pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;

  for (const route of routes) {
    const match = cleanPath.match(route.matcher);
    if (match) {
      const params: Record<string, string> = {};
      const captures = match.slice(1);
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(captures[i] ?? "");
      });

      return {
        path: route.path,
        params,
        component: route.component,
        children: route.children
      };
    }
  }

  return null;
}

export interface RouterProps {
  base?: string;
  mode?: "history" | "hash";
  children: Child;
}

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
    routes.push(route);
    registeredRoutes.set([...routes]);
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

  const navigate = (to: string, options?: { replace?: boolean }) => {
    if (typeof window === "undefined" || !window.history) {
      pathname.set(to);
      return;
    }

    const target = base ? `${base.replace(/\/$/, "")}/${to.replace(/^\//, "")}` : to;

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

  const matchedRoute = computed(() => {
    const currentPath = pathname();
    const routeList = registeredRoutes();
    return matchRoute(routeList, currentPath, base);
  });

  const params = computed(() => matchedRoute()?.params ?? {});

  const routerValue: RouterContextValue = {
    location: { pathname, search, hash },
    navigate,
    params,
    base,
    matchedRoute,
    routes,
    registerRoute
  };

  return RouterContext.Provider({
    value: routerValue,
    children: props.children
  });
}

export interface RouteProps {
  path: string;
  component?: (props: any) => Child;
  children?: Child;
}

/**
 * Route declaration registering URL path pattern and view component
 */
export function Route(props: RouteProps): Child {
  const router = useContext(RouterContext);
  if (!router) {
    throw new Error("<Route> must be rendered inside a <Router>");
  }

  const { matcher, paramNames } = compilePath(props.path);
  router.registerRoute({
    path: props.path,
    component: props.component,
    children: props.children,
    matcher,
    paramNames
  });

  return null;
}

export interface RoutesProps {
  children: Child;
  fallback?: Child;
}

/**
 * Routes outlet matching the current URL to registered Route definitions
 */
export function Routes(props: RoutesProps): Child {
  const router = useContext(RouterContext);
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

export interface LinkProps {
  href: string;
  class?: string | (() => string);
  activeClass?: string;
  replace?: boolean;
  children: Child;
  [key: string]: any;
}

/**
 * Accessible client-side navigation Link with active state highlighting
 */
export function Link(props: LinkProps): Child {
  const router = useContext(RouterContext);
  const { href, class: className, activeClass = "active", replace, children, ...rest } = props;

  const handleClick = (e: MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) {
      return;
    }

    e.preventDefault();
    if (router) {
      router.navigate(href, { replace });
    } else if (typeof window !== "undefined") {
      window.location.href = href;
    }
  };

  const isActive = computed(() => {
    if (!router) return false;
    const current = router.location.pathname();
    return current === href || (href !== "/" && current.startsWith(href));
  });

  const computedClass = computed(() => {
    const baseCls = typeof className === "function" ? className() : (className ?? "");
    if (activeClass && isActive()) {
      return baseCls ? `${baseCls} ${activeClass}` : activeClass;
    }
    return baseCls;
  });

  return (
    <a href={href} class={computedClass} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

/**
 * Access the active router location state signals
 */
export function useLocation(): LocationState {
  const router = useContext(RouterContext);
  if (!router) throw new Error("useLocation must be used within a <Router>");
  return router.location;
}

/**
 * Access the imperative navigate function
 */
export function useNavigate(): (to: string, options?: { replace?: boolean }) => void {
  const router = useContext(RouterContext);
  if (!router) throw new Error("useNavigate must be used within a <Router>");
  return router.navigate;
}

/**
 * Access reactive URL parameter signals
 */
export function useParams<T extends Record<string, string> = Record<string, string>>(): () => T {
  const router = useContext(RouterContext);
  if (!router) throw new Error("useParams must be used within a <Router>");
  return () => router.params() as T;
}

/**
 * Access and manipulate URL query search parameters reactively
 */
export function useSearchParams(): [
  () => URLSearchParams,
  (params: Record<string, string> | URLSearchParams) => void
] {
  const router = useContext(RouterContext);
  if (!router) throw new Error("useSearchParams must be used within a <Router>");

  const params = computed(() => new URLSearchParams(router.location.search()));

  const setSearchParams = (next: Record<string, string> | URLSearchParams) => {
    const sp = next instanceof URLSearchParams ? next : new URLSearchParams(next);
    const queryString = sp.toString();
    const newUrl = `${router.location.pathname()}${queryString ? `?${queryString}` : ""}${router.location.hash()}`;
    router.navigate(newUrl);
  };

  return [params, setSearchParams];
}

/**
 * Code-splitting lazy component loader wrapped in Suspense
 */
export function lazy<T extends (props: any) => Child>(
  loader: () => Promise<{ default: T }>
): (props: any) => Child {
  let loadedComponent: T | null = null;

  return (props: any) => {
    if (loadedComponent) {
      return loadedComponent(props);
    }

    const resource = createResource(async () => {
      const mod = await loader();
      loadedComponent = mod.default;
      return mod.default;
    });

    return Suspense({
      fallback: document.createTextNode("Loading..."),
      children: () => {
        const Comp = resource();
        return Comp ? Comp(props) : null;
      }
    });
  };
}
