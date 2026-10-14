import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { createCompilerContext } from "./context";
import { type GenerateResult, generateCode } from "./generator";
import { transformJsxNode } from "./traversal";
import type { CompilerOptions } from "./types";

const babelTraverse = (traverse as any).default || traverse;

export { createCompilerContext } from "./context";
export { type GenerateResult, generateCode } from "./generator";
export { buildNavExpression, computeChildPath } from "./path-walker";
export {
  escapeHtml,
  escapeHtmlAttr,
  formatStaticElement,
  VOID_ELEMENTS
} from "./template-builder";
export { transformAttribute } from "./transforms/attributes";
export { isTwoWayBindingAttribute, transformTwoWayBinding } from "./transforms/bindings";
export { getTagName, isComponentTag, transformComponentElement } from "./transforms/components";
export { generateTemplateInstance, processElement } from "./transforms/elements";
export { isEventAttribute, transformEventAttribute } from "./transforms/events";
export { transformJsxNode } from "./traversal";
export * from "./types";

export interface VisageCompiler {
  compile(code: string, options?: CompilerOptions): GenerateResult;
}

export function createCompiler(baseOptions: CompilerOptions = {}): VisageCompiler {
  return {
    compile(code: string, options: CompilerOptions = {}) {
      return compileJsx(code, { ...baseOptions, ...options });
    }
  };
}

export function compileJsx(code: string, options: CompilerOptions = {}): GenerateResult {
  const context = createCompilerContext(options);

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });

  babelTraverse(ast, {
    JSXElement(path: any) {
      if (t.isJSXElement(path.parent) || t.isJSXFragment(path.parent)) {
        return;
      }
      const res = transformJsxNode(path.node, context);
      if (
        path.parentPath.isArrowFunctionExpression() &&
        path.parent.body === path.node &&
        t.isCallExpression(res) &&
        t.isArrowFunctionExpression(res.callee) &&
        res.arguments.length === 0
      ) {
        path.parentPath.get("body").replaceWith((res.callee as t.ArrowFunctionExpression).body);
      } else {
        path.replaceWith(res);
      }
    },
    JSXFragment(path: any) {
      if (t.isJSXElement(path.parent) || t.isJSXFragment(path.parent)) {
        return;
      }
      const res = transformJsxNode(path.node, context);
      if (
        path.parentPath.isArrowFunctionExpression() &&
        path.parent.body === path.node &&
        t.isCallExpression(res) &&
        t.isArrowFunctionExpression(res.callee) &&
        res.arguments.length === 0
      ) {
        path.parentPath.get("body").replaceWith((res.callee as t.ArrowFunctionExpression).body);
      } else {
        path.replaceWith(res);
      }
    }
  });

  return generateCode(ast as any, context);
}

export default compileJsx;
