import type { Child } from "@dom";
import type { ReadonlySignal } from "@signals";

export interface LocationState {
  pathname: ReadonlySignal<string>;
  search: ReadonlySignal<string>;
  hash: ReadonlySignal<string>;
}

export interface NavigateOptions {
  replace?: boolean;
  viewTransition?: boolean;
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

export interface RouterProps {
  base?: string;
  mode?: "history" | "hash";
  viewTransitions?: boolean;
  prefetch?: boolean | "hover" | "render";
  children: Child;
}

export interface RouteProps {
  path: string;
  component?: (props: any) => Child;
  children?: Child;
}

export interface RoutesProps {
  children: Child;
  fallback?: Child;
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
