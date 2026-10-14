import * as t from "@babel/types";
import { buildNavExpression, computeChildPath } from "../path-walker";
import { escapeHtml, escapeHtmlAttr, formatStaticElement } from "../template-builder";
import type { CompilerContext, DomNavStep, DynamicBinding } from "../types";
import { transformAttribute } from "./attributes";
import { getTagName, isComponentTag, transformComponentElement } from "./components";

export function processElement(
  element: t.JSXElement,
  currentPath: DomNavStep[],
  bindings: DynamicBinding[],
  context: CompilerContext,
  transformNode: (n: t.JSXElement | t.JSXFragment) => t.Expression
): string {
  const tagName = getTagName(element);

  // If this is a component, it cannot be rendered as static HTML
  if (isComponentTag(tagName)) {
    return "<!--component-->";
  }

  const staticAttrs: string[] = [];
  const dynamicAttrs: (t.JSXAttribute | t.JSXSpreadAttribute)[] = [];

  for (const attr of element.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      dynamicAttrs.push(attr);
      continue;
    }

    if (t.isJSXAttribute(attr)) {
      const attrName = t.isJSXNamespacedName(attr.name)
        ? `${attr.name.namespace.name}:${attr.name.name.name}`
        : attr.name.name;

      if (!attr.value) {
        staticAttrs.push(attrName);
      } else if (t.isStringLiteral(attr.value)) {
        staticAttrs.push(`${attrName}="${escapeHtmlAttr(attr.value.value)}"`);
      } else if (t.isJSXExpressionContainer(attr.value)) {
        const expr = attr.value.expression;
        if (t.isStringLiteral(expr) || t.isNumericLiteral(expr)) {
          staticAttrs.push(`${attrName}="${String(expr.value)}"`);
        } else if (t.isBooleanLiteral(expr)) {
          if (expr.value) {
            staticAttrs.push(attrName);
          }
        } else {
          dynamicAttrs.push(attr);
        }
      }
    }
  }

  const dynamicChildren: { index: number; expr: t.Expression }[] = [];
  let childrenHtml = "";
  let childDomIndex = 0;

  // Optimization: If an element contains only a single dynamic expression child,
  // we emit a pre-cloned text node (" ") in the template string so that the browser's
  // native C++ cloneNode instantiates the Text node ahead of time.
  const meaningfulChildren = element.children.filter((child) => {
    if (t.isJSXText(child) && /[\r\n]/.test(child.value) && child.value.trim() === "") {
      return false;
    }
    if (t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) {
      return false;
    }
    return true;
  });

  const singleChild = meaningfulChildren.length === 1 ? meaningfulChildren[0] : null;
  const isSingleDynamicChild =
    singleChild !== null &&
    t.isJSXExpressionContainer(singleChild) &&
    !t.isJSXEmptyExpression(singleChild.expression) &&
    !t.isStringLiteral(singleChild.expression) &&
    !t.isNumericLiteral(singleChild.expression) &&
    !t.isJSXElement(singleChild.expression) &&
    !t.isJSXFragment(singleChild.expression);

  if (isSingleDynamicChild && singleChild && t.isJSXExpressionContainer(singleChild)) {
    childrenHtml = " ";
    dynamicChildren.push({
      index: 0,
      expr: singleChild.expression as t.Expression
    });
  } else {
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i]!;

      if (t.isJSXText(child)) {
        if (/[\r\n]/.test(child.value) && child.value.trim() === "") {
          continue;
        }
        const trimmed = child.value.replace(/\s+/g, " ");
        if (trimmed) {
          childrenHtml += escapeHtml(trimmed.trim());
          childDomIndex++;
        }
      } else if (t.isJSXElement(child)) {
        const childTag = getTagName(child);
        if (isComponentTag(childTag)) {
          childrenHtml += "<!--visage-c-->";
          dynamicChildren.push({
            index: childDomIndex,
            expr: transformComponentElement(child, context, transformNode)
          });
          childDomIndex++;
        } else {
          const childPath = computeChildPath(currentPath, childDomIndex);
          childrenHtml += processElement(child, childPath, bindings, context, transformNode);
          childDomIndex++;
        }
      } else if (t.isJSXExpressionContainer(child)) {
        if (!t.isJSXEmptyExpression(child.expression)) {
          const expr = child.expression as t.Expression;
          if (t.isStringLiteral(expr) || t.isNumericLiteral(expr)) {
            childrenHtml += escapeHtml(String(expr.value));
            childDomIndex++;
          } else {
            childrenHtml += "<!--visage-b-->";
            dynamicChildren.push({
              index: childDomIndex,
              expr
            });
            childDomIndex++;
          }
        }
      }
    }
  }

  if (dynamicAttrs.length > 0 || dynamicChildren.length > 0) {
    bindings.push({
      path: currentPath,
      attributes: dynamicAttrs,
      children: dynamicChildren
    });
  }

  return formatStaticElement(tagName, staticAttrs.join(" "), childrenHtml);
}

export function generateTemplateInstance(
  html: string,
  bindings: DynamicBinding[],
  context: CompilerContext
): t.Expression {
  context.requireHelper("template");
  const tmplId = context.registerTemplate(html);

  if (bindings.length === 0) {
    return t.callExpression(t.identifier(tmplId), []);
  }

  const statements: t.Statement[] = [];
  statements.push(
    t.variableDeclaration("const", [
      t.variableDeclarator(t.identifier("_el$"), t.callExpression(t.identifier(tmplId), []))
    ])
  );

  let targetVarIndex = 0;
  const declaredPaths = new Map<string, t.Identifier>();
  declaredPaths.set("", t.identifier("_el$"));

  for (const b of bindings) {
    const targetVar =
      b.path.length === 0 ? t.identifier("_el$") : t.identifier(`_node$${++targetVarIndex}`);

    if (b.path.length > 0) {
      let bestPrefixLength = 0;
      let baseVar: t.Identifier = t.identifier("_el$");

      for (let len = b.path.length - 1; len >= 1; len--) {
        const prefixKey = b.path.slice(0, len).join(".");
        const match = declaredPaths.get(prefixKey);
        if (match) {
          bestPrefixLength = len;
          baseVar = match;
          break;
        }
      }

      const remainingSteps = b.path.slice(bestPrefixLength);
      const targetNavExpr = buildNavExpression(baseVar, remainingSteps);
      statements.push(
        t.variableDeclaration("const", [t.variableDeclarator(targetVar, targetNavExpr)])
      );
      declaredPaths.set(b.path.join("."), targetVar);
    }

    // Process dynamic attributes
    for (const attr of b.attributes) {
      if (t.isJSXSpreadAttribute(attr)) {
        context.requireHelper("setAttribute");
        statements.push(
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.callExpression(
                  t.memberExpression(t.identifier("Object"), t.identifier("entries")),
                  [attr.argument]
                ),
                t.identifier("forEach")
              ),
              [
                t.arrowFunctionExpression(
                  [t.arrayPattern([t.identifier("_k"), t.identifier("_v")])],
                  t.callExpression(t.identifier("setAttribute"), [
                    targetVar,
                    t.identifier("_k"),
                    t.identifier("_v")
                  ])
                )
              ]
            )
          )
        );
        continue;
      }

      const attrName = t.isJSXNamespacedName(attr.name)
        ? `${attr.name.namespace.name}:${attr.name.name.name}`
        : attr.name.name;

      const valExpr = (attr.value as t.JSXExpressionContainer).expression as t.Expression;
      const res = transformAttribute(attrName, valExpr, targetVar, context);
      statements.push(...res.statements);
    }

    // Process dynamic children
    for (const ch of b.children) {
      context.requireHelper("insertChild");
      statements.push(
        t.expressionStatement(t.callExpression(t.identifier("insertChild"), [targetVar, ch.expr]))
      );
    }
  }

  statements.push(t.returnStatement(t.identifier("_el$")));

  return t.callExpression(t.arrowFunctionExpression([], t.blockStatement(statements)), []);
}
