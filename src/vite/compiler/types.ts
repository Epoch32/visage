import type * as t from "@babel/types";
import type { CSPOptions, SecureTransformsOptions } from "../types";

export type { CSPOptions, SecureTransformsOptions };

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
  logger?: import("../logger").VisageLogger;
}

export type DomNavStep = "firstChild" | "nextSibling";

export interface DynamicBinding {
  path: DomNavStep[];
  attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[];
  children: {
    index: number;
    expr: t.Expression;
    isSingleTextChild?: boolean;
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
