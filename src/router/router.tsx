import { type Child, Show } from "@dom";
import {
  computed,
  createContext,
  onCleanup,
  type ReadonlySignal,
  signal,
  useContext,
  type WritableSignal
} from "@signals";

export interface LocationState {
  pathname: ReadonlySignal<string>;
  search: ReadonlySignal<string>;
  hash: ReadonlySignal<string>;
}

export interface NavigateOptions {
  replace?: boolean;
  viewTransition?: boolean;
}

export interface RouterContextValue {
  location: LocationState;
  navigate: (to: string, options?: NavigateOptions) => void;
  prefetchDefault?: boolean | "hover" | "render";
  params: ReadonlySignal<Record<string, string>>;
  base: string;
  matchedRoute: ReadonlySignal<MatchedRoute | null>;
  routes: RouteDefinition[];
  registerRoute: (route: RouteDefinition) => void;
  unregisterRoute: (route: RouteDefinition) => void;
}

const prefetchedUrls = new Set<string>();

/**
 * Clear the internal prefetch URL cache (primarily for testing)
 */
export function clearPrefetchCache(): void {
  prefetchedUrls.clear();
}

/**
 * Speculatively prefetch a URL using the Speculation Rules API when supported,
 * falling back to <link rel="prefetch">.
 */
export function prefetch(url: string): void {
  if (typeof document === "undefined" || !url || prefetchedUrls.has(url)) return;
  if (
    url.startsWith("#") ||
    url.startsWith("javascript:") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:")
  ) {
    return;
  }
  prefetchedUrls.add(url);

  if (
    typeof HTMLScriptElement !== "undefined" &&
    typeof (HTMLScriptElement as any).supports === "function" &&
    (HTMLScriptElement as any).supports("speculationrules")
  ) {
    const script = document.createElement("script");
    script.type = "speculationrules";
    script.textContent = JSON.stringify({
      prefetch: [
        {
          source: "list",
          urls: [url]
        }
      ]
    });
    document.head.appendChild(script);
  } else if (typeof document.createElement === "function") {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    document.head.appendChild(link);
  }
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

const pathCache = new Map<string, { matcher: RegExp; paramNames: string[] }>();

function compilePath(path: string): { matcher: RegExp; paramNames: string[] } {
  const cached = pathCache.get(path);
  if (cached) return cached;

  const paramNames: string[] = [];
  const normalized = path.replace(/\/+$/, "") || "/";

  // Escape special regex characters except : and *
  const escaped = normalized.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

  const regexStr = escaped
    .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    })
    .replace(/\*/g, "(.*)");

  const matcher = new RegExp(`^${regexStr}(?:/)?$`);
  const result = { matcher, paramNames };
  pathCache.set(path, result);
  return result;
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
  viewTransitions?: boolean;
  prefetch?: boolean | "hover" | "render";
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
    const target = base ? `${base.replace(/\/$/, "")}/${to.replace(/^\//, "")}` : to;

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
  className?: string | (() => string);
  activeClass?: string;
  replace?: boolean;
  viewTransition?: boolean;
  prefetch?: boolean | "hover" | "render";
  onClick?: (e: MouseEvent) => void;
  children: Child;
  [key: string]: any;
}

/**
 * Accessible client-side navigation Link with active state highlighting and speculative prefetching
 */
export function Link(props: LinkProps): Child {
  const router = useContext(RouterContext);
  const {
    href,
    class: classProp,
    className: classNameProp,
    activeClass = "active",
    replace,
    viewTransition,
    prefetch: prefetchProp,
    onPointerEnter,
    onFocus,
    onClick,
    children,
    ...rest
  } = props;
  const rawClass = classProp ?? classNameProp;

  const prefetchMode = prefetchProp ?? router?.prefetchDefault;
  if (prefetchMode === "render") {
    prefetch(href);
  }

  const handlePointerEnter = (e: any) => {
    if (prefetchMode === true || prefetchMode === "hover") {
      prefetch(href);
    }
    if (typeof onPointerEnter === "function") {
      onPointerEnter(e);
    }
  };

  const handleFocus = (e: any) => {
    if (prefetchMode === true || prefetchMode === "hover") {
      prefetch(href);
    }
    if (typeof onFocus === "function") {
      onFocus(e);
    }
  };

  const handleClick = (e: MouseEvent) => {
    if (typeof onClick === "function") {
      onClick(e);
    }

    if (e.defaultPrevented) return;

    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) {
      return;
    }

    e.preventDefault();
    if (router) {
      router.navigate(href, { replace, viewTransition });
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
    const baseCls = typeof rawClass === "function" ? rawClass() : (rawClass ?? "");
    if (activeClass && isActive()) {
      return baseCls ? `${baseCls} ${activeClass}` : activeClass;
    }
    return baseCls;
  });

  return (
    <a
      href={href}
      class={computedClass}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onFocus={handleFocus}
      {...rest}
    >
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
export function useNavigate(): (to: string, options?: NavigateOptions) => void {
  const router = useContext(RouterContext);
  if (!router) throw new Error("useNavigate must be used within a <Router>");
  return router.navigate;
}

/**
 * Imperatively trigger speculative prefetching of URLs
 */
export function usePrefetch(): (url: string) => void {
  return prefetch;
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

export { lazy } from "@dom";
