import type * as t from "@babel/types";

export interface CompilerOptions {
  filename?: string;
  importSource?: string;
  mode?: "client" | "ssr";
  plugins?: CompilerPlugin[];
  devtools?: boolean;
  autoImport?: boolean;
  delegateEvents?: boolean;
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

export interface CompilerContext {
  options: CompilerOptions;
  templateMap: Map<string, string>;
  templateCounter: number;
  importedHelpers: Set<string>;
  delegatedEvents: Set<string>;
  plugins: CompilerPlugin[];
  registerTemplate(html: string): string;
  requireHelper(name: string): void;
  requireDelegatedEvent(name: string): void;
}
