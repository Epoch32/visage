import type * as t from "@babel/types";

export interface SecureTransformsOptions {
  /**
   * Shield href, src, action, and formAction against dangerous script execution protocols
   * @default true
   */
  urlShield?: boolean;

  /**
   * Automatically ensure rel="noopener noreferrer" on target="_blank" links
   * @default true
   */
  relShield?: boolean;

  /**
   * Disallow string literals or string expressions on event handlers
   * @default true
   */
  eventShield?: boolean;

  /**
   * Guard dynamic id and name attributes against DOM clobbering collisions
   * @default true
   */
  clobberShield?: boolean;

  /**
   * Guard innerHTML and dangerouslySetInnerHTML bindings against script injection
   * @default true
   */
  htmlShield?: boolean;

  /**
   * Clean props spread onto native HTML elements
   * @default true
   */
  spreadSanitizer?: boolean;
}

export type { CSPOptions } from "../types";

import type { CSPOptions } from "../types";

export interface CompilerOptions {
  filename?: string;
  importSource?: string;
  mode?: "client" | "ssr";
  plugins?: CompilerPlugin[];
  devtools?: boolean;
  autoImport?: boolean;
  delegateEvents?: boolean;
  security?: boolean | SecureTransformsOptions;
  csp?: boolean | CSPOptions;
  detectedOrigins?: DetectedOrigins;
}

export type DomNavStep = "firstChild" | "nextSibling";

export interface DynamicBinding {
  path: DomNavStep[];
  attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[];
  children: {
    index: number;
    expr: t.Expression;
  }[];
}

export interface AttributeTransformContext {
  attrName: string;
  valueExpr: t.Expression;
  targetVar: t.Identifier;
  context: CompilerContext;
}

export interface AttributeTransformResult {
  statements: t.Statement[];
}

export interface CompilerPlugin {
  name: string;
  transformAttribute?(ctx: AttributeTransformContext): AttributeTransformResult | void;
  transformElement?(element: t.JSXElement, context: CompilerContext): t.Expression | void;
  transformComponent?(element: t.JSXElement, context: CompilerContext): t.Expression | void;
}

export interface DetectedOrigins {
  connect: Set<string>;
  img: Set<string>;
  font: Set<string>;
  style: Set<string>;
  media: Set<string>;
  frame: Set<string>;
}

export interface CompilerContext {
  options: CompilerOptions;
  templateMap: Map<string, string>;
  templateCounter: number;
  importedHelpers: Set<string>;
  delegatedEvents: Set<string>;
  securityHelpers: Set<string>;
  detectedOrigins: DetectedOrigins;
  plugins: CompilerPlugin[];
  registerTemplate(html: string): string;
  requireHelper(name: string): void;
  requireSecurityHelper(name: string): void;
  requireDelegatedEvent(name: string): void;
  recordOrigin(category: keyof DetectedOrigins, url: string): void;
}
