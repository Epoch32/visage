/**
 * Options for the Visage File-System MPA Pages Router
 */
export interface PagesOptions {
  /**
   * Root directory to scan for page components
   * @default "src/pages" (or "pages" if src/pages does not exist)
   */
  dir?: string;

  /**
   * Global page title or title template
   * @default "Visage App"
   */
  title?: string;

  /**
   * Additional HTML tags or styles injected into the document <head>
   */
  headTags?: string;

  /**
   * Enable Static Site Generation (SSG) at build time
   * Pre-renders discovered pages and outputs physical static HTML files into dist/
   * @default true
   */
  ssg?: boolean;

  /**
   * Custom root layout component path (defaults to `_layout.tsx` in pages dir if present)
   */
  layout?: string;

  /**
   * Custom document shell component or template path (defaults to `_document.tsx` if present)
   */
  document?: string;

  /**
   * Custom 404 / NotFound component path (defaults to `404.tsx` if present)
   */
  notFound?: string;

  /**
   * Target DOM container id where the client page is mounted
   * @default "visage-root"
   */
  rootId?: string;

  /**
   * Base URL path prefix
   * @default "/"
   */
  base?: string;

  /**
   * Enable seamless soft navigation and View Transitions across MPA pages.
   * Intercepts internal link clicks, swaps page DOM in place, and animates transitions.
   * @default true
   */
  viewTransitions?: boolean;
}

/**
 * Metadata representation of a single discovered page route
 */
export interface PageRoute {
  /**
   * URL route path, e.g. "/", "/about", "/blog/:slug", "/docs/*"
   */
  path: string;

  /**
   * Compiled regular expression for matching URL paths
   */
  pattern: RegExp;

  /**
   * Extracted parameter names for dynamic routes
   */
  paramNames: string[];

  /**
   * Absolute file system path to the page component
   */
  filePath: string;

  /**
   * Relative path from the pages root directory
   */
  relativePath: string;

  /**
   * Whether this route contains dynamic parameters like [slug]
   */
  isDynamic: boolean;

  /**
   * Whether this route is a catch-all route like [...all]
   */
  isCatchAll: boolean;

  /**
   * Whether this route is an index route (/ or /folder/)
   */
  isIndex: boolean;
}

/**
 * Result of matching a request URL against discovered page routes
 */
export interface RouteMatch {
  route: PageRoute;
  params: Record<string, string>;
}

/**
 * Discovered special layout and document shell files
 */
export interface PageSpecialFiles {
  layout?: string;
  document?: string;
  notFound?: string;
}
