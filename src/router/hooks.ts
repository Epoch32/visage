import { computed } from "@signals";
import { useRouterContext } from "./context";
import { prefetch } from "./prefetch";
import type { LocationState, NavigateOptions } from "./types";

/**
 * Access the active router location state signals
 */
export function useLocation(): LocationState {
  const router = useRouterContext();
  if (!router) throw new Error("useLocation must be used within a <Router>");
  return router.location;
}

/**
 * Access the imperative navigate function
 */
export function useNavigate(): (to: string, options?: NavigateOptions) => void {
  const router = useRouterContext();
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
  const router = useRouterContext();
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
  const router = useRouterContext();
  if (!router) throw new Error("useSearchParams must be used within a <Router>");

  const params = computed(() => new URLSearchParams(router.location.search()));

  const setSearchParams = (next: Record<string, string> | URLSearchParams) => {
    const sp = next instanceof URLSearchParams ? next : new URLSearchParams(next);
    const queryString = sp.toString();
    let currentPath = router.location.pathname();
    if (router.base) {
      const normalizedBase = router.base.replace(/\/$/, "");
      if (
        normalizedBase &&
        (currentPath === normalizedBase || currentPath.startsWith(`${normalizedBase}/`))
      ) {
        currentPath = currentPath.slice(normalizedBase.length) || "/";
      }
    }
    const newUrl = `${currentPath}${queryString ? `?${queryString}` : ""}${router.location.hash()}`;
    router.navigate(newUrl);
  };

  return [params, setSearchParams];
}
