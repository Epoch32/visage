import type { Child } from "@dom";
import { computed } from "@signals";
import { useRouterContext } from "./context";
import { prefetch } from "./prefetch";
import type { LinkProps } from "./types";

/**
 * Accessible client-side navigation Link with active state highlighting and speculative prefetching
 */
export function Link(props: LinkProps): Child {
  const router = useRouterContext();
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
