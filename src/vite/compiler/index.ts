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

  function handleRootJsx(path: any) {
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
    } else if (
      path.parentPath.isReturnStatement() &&
      path.parentPath.parentPath?.isBlockStatement() &&
      t.isCallExpression(res) &&
      t.isArrowFunctionExpression(res.callee) &&
      res.arguments.length === 0 &&
      t.isBlockStatement((res.callee as t.ArrowFunctionExpression).body)
    ) {
      const block = (res.callee as t.ArrowFunctionExpression).body as t.BlockStatement;
      path.parentPath.replaceWithMultiple(block.body);
    } else {
      path.replaceWith(res);
    }
  }

  babelTraverse(ast, {
    JSXElement: handleRootJsx,
    JSXFragment: handleRootJsx
  });

  const result = generateCode(ast as any, context);
  if (options.logger && context.templateMap.size > 0) {
    options.logger.debug(
      "visage:compiler",
      `Compiled ${context.templateMap.size} hoisted template${context.templateMap.size > 1 ? "s" : ""}${options.filename ? ` in ${options.filename}` : ""}`
    );
  }
  return result;
}

export default compileJsx;
