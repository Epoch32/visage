import * as t from "@babel/types";
import { computeChildPath } from "../path-walker";
import { escapeHtml, escapeHtmlAttr, formatStaticElement } from "../template-builder";
import type { CompilerContext, DomNavStep, DynamicBinding } from "../types";
import { getTagName, isComponentTag, transformComponentElement } from "./components";
import {
  normalizeAttributeName,
  recordStaticOrigin,
  tryFormatStaticClass,
  tryFormatStaticStyle
} from "./element-static";
import { isEventAttribute } from "./events";
import {
  assertSafeClobberStatic,
  assertSafeEventValue,
  assertSafeHtmlStatic,
  assertSafeStaticUrl,
  isClobberAttribute,
  isClobberShieldActive,
  isEventShieldActive,
  isHtmlAttribute,
  isHtmlShieldActive,
  isRelShieldActive,
  isUrlAttribute,
  isUrlShieldActive,
  normalizeRel
} from "./security";

export { normalizeAttributeName } from "./element-static";
export { generateTemplateInstance } from "./template-instance";

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
  const sec = context.options.security;
  const checkUrlShield = isUrlShieldActive(sec);
  const checkRelShield = isRelShieldActive(sec);
  const checkEventShield = isEventShieldActive(sec);
  const checkClobberShield = isClobberShieldActive(sec);
  const checkHtmlShield = isHtmlShieldActive(sec);

  let targetBlankFound = false;
  let relAttrIndex = -1;
  let existingRelValue: string | undefined;

  for (const attr of element.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      dynamicAttrs.push(attr);
      continue;
    }

    if (t.isJSXAttribute(attr)) {
      const rawAttrName = t.isJSXNamespacedName(attr.name)
        ? `${attr.name.namespace.name}:${attr.name.name.name}`
        : attr.name.name;
      const attrName = normalizeAttributeName(rawAttrName);

      if (!attr.value) {
        staticAttrs.push(attrName);
      } else if (t.isStringLiteral(attr.value)) {
        const strVal = attr.value.value;
        if (checkEventShield && isEventAttribute(attrName)) {
          assertSafeEventValue(attrName, strVal);
        }
        if (checkUrlShield && isUrlAttribute(attrName)) {
          assertSafeStaticUrl(attrName, strVal);
        }
        if (checkClobberShield && isClobberAttribute(attrName)) {
          assertSafeClobberStatic(attrName, strVal);
        }
        if (checkHtmlShield && isHtmlAttribute(attrName)) {
          assertSafeHtmlStatic(attrName, strVal);
        }
        recordStaticOrigin(tagName, attrName, strVal, element, context);
        if (attrName === "target" && strVal === "_blank") {
          targetBlankFound = true;
        }
        if (attrName === "rel") {
          relAttrIndex = staticAttrs.length;
          existingRelValue = strVal;
        }
        staticAttrs.push(`${attrName}="${escapeHtmlAttr(strVal)}"`);
      } else if (t.isJSXExpressionContainer(attr.value)) {
        const expr = attr.value.expression;
        if (t.isStringLiteral(expr) || t.isNumericLiteral(expr)) {
          const strVal = String(expr.value);
          if (t.isStringLiteral(expr) && checkEventShield && isEventAttribute(attrName)) {
            assertSafeEventValue(attrName, expr.value);
          }
          if (t.isStringLiteral(expr) && checkUrlShield && isUrlAttribute(attrName)) {
            assertSafeStaticUrl(attrName, expr.value);
          }
          if (t.isStringLiteral(expr) && checkClobberShield && isClobberAttribute(attrName)) {
            assertSafeClobberStatic(attrName, expr.value);
          }
          if (t.isStringLiteral(expr) && checkHtmlShield && isHtmlAttribute(attrName)) {
            assertSafeHtmlStatic(attrName, expr.value);
          }
          if (t.isStringLiteral(expr)) {
            recordStaticOrigin(tagName, attrName, expr.value, element, context);
          }
          if (attrName === "target" && strVal === "_blank") {
            targetBlankFound = true;
          }
          if (attrName === "rel") {
            relAttrIndex = staticAttrs.length;
            existingRelValue = strVal;
          }
          staticAttrs.push(`${attrName}="${escapeHtmlAttr(strVal)}"`);
        } else if (t.isBooleanLiteral(expr)) {
          if (attrName.startsWith("aria-") || attrName.startsWith("data-")) {
            staticAttrs.push(`${attrName}="${expr.value}"`);
          } else if (expr.value) {
            staticAttrs.push(attrName);
          }
        } else if (attrName === "style" && t.isObjectExpression(expr)) {
          const staticStyle = tryFormatStaticStyle(expr);
          if (staticStyle !== null) {
            if (staticStyle) {
              staticAttrs.push(`style="${escapeHtmlAttr(staticStyle)}"`);
            }
          } else {
            dynamicAttrs.push(attr);
          }
        } else if (
          (attrName === "class" || attrName === "className") &&
          (t.isArrayExpression(expr) || t.isObjectExpression(expr))
        ) {
          const staticClass = tryFormatStaticClass(expr);
          if (staticClass !== null) {
            if (staticClass) {
              staticAttrs.push(`class="${escapeHtmlAttr(staticClass)}"`);
            }
          } else {
            dynamicAttrs.push(attr);
          }
        } else if (t.isNullLiteral(expr) || (t.isIdentifier(expr) && expr.name === "undefined")) {
          // Static null or undefined attribute: omit from template and dynamic attributes
        } else {
          if (checkEventShield && isEventAttribute(attrName) && t.isTemplateLiteral(expr)) {
            assertSafeEventValue(attrName, "[template literal]");
          }
          if (t.isTemplateLiteral(expr)) {
            const leading = expr.quasis[0]?.value?.raw;
            if (leading) {
              recordStaticOrigin(tagName, attrName, leading, element, context);
            }
          }
          dynamicAttrs.push(attr);
        }
      }
    }
  }

  // Ensure rel="noopener noreferrer" on <a target="_blank">
  if (checkRelShield && tagName.toLowerCase() === "a" && targetBlankFound) {
    const safeRel = normalizeRel(existingRelValue);
    if (relAttrIndex !== -1) {
      staticAttrs[relAttrIndex] = `rel="${escapeHtmlAttr(safeRel)}"`;
    } else {
      staticAttrs.push(`rel="${escapeHtmlAttr(safeRel)}"`);
    }
  }

  const dynamicChildren: DynamicBinding["children"] = [];
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
      expr: singleChild.expression as t.Expression,
      isSingleTextChild: true
    });
  } else {
    let lastChildWasText = false;
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i]!;

      if (t.isJSXText(child)) {
        if (/[\r\n]/.test(child.value) && child.value.trim() === "") {
          continue;
        }
        const trimmed = child.value.replace(/\s+/g, " ").trim();
        if (trimmed) {
          childrenHtml += escapeHtml(trimmed);
          if (!lastChildWasText) {
            childDomIndex++;
            lastChildWasText = true;
          }
        }
      } else if (t.isJSXElement(child)) {
        lastChildWasText = false;
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
            const staticText = String(expr.value);
            if (staticText) {
              childrenHtml += escapeHtml(staticText);
              if (!lastChildWasText) {
                childDomIndex++;
                lastChildWasText = true;
              }
            }
          } else {
            lastChildWasText = false;
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
