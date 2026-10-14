import * as t from "@babel/types";
import type { CompilerContext } from "../types";

export function isComponentTag(name: string): boolean {
  return /^[A-Z]/.test(name) || name.includes(".");
}

export function getTagName(node: t.JSXElement): string {
  const nameNode = node.openingElement.name;
  if (t.isJSXIdentifier(nameNode)) {
    return nameNode.name;
  }
  if (t.isJSXMemberExpression(nameNode)) {
    let curr: t.JSXMemberExpression | t.JSXIdentifier = nameNode;
    const parts: string[] = [];
    while (t.isJSXMemberExpression(curr)) {
      parts.unshift(curr.property.name);
      curr = curr.object as any;
    }
    if (t.isJSXIdentifier(curr)) {
      parts.unshift(curr.name);
    }
    return parts.join(".");
  }
  return "div";
}

export function transformComponentElement(
  node: t.JSXElement,
  context: CompilerContext,
  transformNode: (n: t.JSXElement | t.JSXFragment) => t.Expression
): t.Expression {
  // Check plugins first
  for (const plugin of context.plugins) {
    if (plugin.transformComponent) {
      const res = plugin.transformComponent(node, context);
      if (res) return res;
    }
  }

  const tagName = getTagName(node);
  const tagIdentifier = tagName.includes(".")
    ? t.memberExpression(t.identifier(tagName.split(".")[0]!), t.identifier(tagName.split(".")[1]!))
    : t.identifier(tagName);

  const propsProperties: (t.ObjectProperty | t.SpreadElement)[] = [];

  for (const attr of node.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      propsProperties.push(t.spreadElement(attr.argument));
    } else if (t.isJSXAttribute(attr)) {
      const rawName = t.isJSXNamespacedName(attr.name)
        ? `${attr.name.namespace.name}:${attr.name.name.name}`
        : attr.name.name;
      const key = t.isValidIdentifier(rawName) ? t.identifier(rawName) : t.stringLiteral(rawName);

      let val: t.Expression;
      if (!attr.value) {
        val = t.booleanLiteral(true);
      } else if (t.isStringLiteral(attr.value)) {
        val = attr.value;
      } else if (t.isJSXExpressionContainer(attr.value)) {
        val = attr.value.expression as t.Expression;
      } else if (t.isJSXElement(attr.value)) {
        val = transformNode(attr.value);
      } else {
        val = t.nullLiteral();
      }

      propsProperties.push(t.objectProperty(key, val));
    }
  }

  // Handle children prop
  const childrenNodes = node.children
    .map((c) => {
      if (t.isJSXText(c)) {
        const txt = c.value.trim();
        return txt ? t.stringLiteral(txt) : null;
      }
      if (t.isJSXExpressionContainer(c)) {
        return t.isJSXEmptyExpression(c.expression) ? null : c.expression;
      }
      if (t.isJSXElement(c)) {
        return transformNode(c);
      }
      return null;
    })
    .filter(Boolean) as t.Expression[];

  if (childrenNodes.length === 1) {
    propsProperties.push(t.objectProperty(t.identifier("children"), childrenNodes[0]!));
  } else if (childrenNodes.length > 1) {
    propsProperties.push(
      t.objectProperty(t.identifier("children"), t.arrayExpression(childrenNodes))
    );
  }

  return t.callExpression(tagIdentifier, [t.objectExpression(propsProperties)]);
}
