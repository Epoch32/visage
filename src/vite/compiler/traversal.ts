import * as t from "@babel/types";
import { getTagName, isComponentTag, transformComponentElement } from "./transforms/components";
import { generateTemplateInstance, processElement } from "./transforms/elements";
import type { CompilerContext, DynamicBinding } from "./types";

export function transformJsxNode(
  node: t.JSXElement | t.JSXFragment,
  context: CompilerContext
): t.Expression {
  if (t.isJSXFragment(node)) {
    const children = node.children
      .map((c) => {
        if (t.isJSXElement(c) || t.isJSXFragment(c)) return transformJsxNode(c, context);
        if (t.isJSXExpressionContainer(c) && !t.isJSXEmptyExpression(c.expression)) {
          return c.expression as t.Expression;
        }
        return null;
      })
      .filter(Boolean) as t.Expression[];
    return t.arrayExpression(children);
  }

  const tagName = getTagName(node);
  if (isComponentTag(tagName)) {
    return transformComponentElement(node, context, (n) => transformJsxNode(n, context));
  }

  // Check custom element plugins
  for (const plugin of context.plugins) {
    if (plugin.transformElement) {
      const res = plugin.transformElement(node, context);
      if (res) return res;
    }
  }

  // Host element: serialize to template and bindings
  const bindings: DynamicBinding[] = [];
  const html = processElement(node, [], bindings, context, (n) => transformJsxNode(n, context));

  return generateTemplateInstance(html, bindings, context);
}
