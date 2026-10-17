import * as t from "@babel/types";
import { formatStyleProp } from "../../../style/scale";
import { buildNavExpression, computeChildPath } from "../path-walker";
import { escapeHtml, escapeHtmlAttr, formatStaticElement } from "../template-builder";
import type { CompilerContext, DomNavStep, DynamicBinding } from "../types";
import { transformAttribute } from "./attributes";
import { getTagName, isComponentTag, transformComponentElement } from "./components";
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
  isSpreadSanitizerActive,
  isUrlAttribute,
  isUrlShieldActive,
  normalizeRel
} from "./security";

function recordStaticOrigin(
  tagName: string,
  attrName: string,
  strVal: string,
  element: t.JSXElement,
  context: CompilerContext
): void {
  const csp = context.options.csp;
  if (!csp) return;
  if (typeof csp === "object" && csp.autoDetectOrigins === false) return;

  const tag = tagName.toLowerCase();
  const attr = attrName.toLowerCase();

  if (attr === "src") {
    if (tag === "img") {
      context.recordOrigin("img", strVal);
    } else if (tag === "video" || tag === "audio" || tag === "source" || tag === "track") {
      context.recordOrigin("media", strVal);
    } else if (tag === "iframe" || tag === "frame") {
      context.recordOrigin("frame", strVal);
    }
  } else if (attr === "poster" && tag === "video") {
    context.recordOrigin("img", strVal);
  } else if (attr === "srcset" && (tag === "img" || tag === "source")) {
    const candidates = strVal.split(",");
    for (const cand of candidates) {
      const url = cand.trim().split(/\s+/)[0];
      if (url) {
        context.recordOrigin("img", url);
      }
    }
  } else if (attr === "href" && tag === "link") {
    let relVal: string | undefined;
    let asVal: string | undefined;
    for (const a of element.openingElement.attributes) {
      if (t.isJSXAttribute(a) && t.isJSXIdentifier(a.name)) {
        const aName = a.name.name.toLowerCase();
        if (aName === "rel") {
          if (t.isStringLiteral(a.value)) {
            relVal = a.value.value.toLowerCase();
          } else if (t.isJSXExpressionContainer(a.value) && t.isStringLiteral(a.value.expression)) {
            relVal = a.value.expression.value.toLowerCase();
          }
        } else if (aName === "as") {
          if (t.isStringLiteral(a.value)) {
            asVal = a.value.value.toLowerCase();
          } else if (t.isJSXExpressionContainer(a.value) && t.isStringLiteral(a.value.expression)) {
            asVal = a.value.expression.value.toLowerCase();
          }
        }
      }
    }
    if (relVal === "stylesheet" || asVal === "style" || /\.css($|\?)/i.test(strVal)) {
      context.recordOrigin("style", strVal);
    } else if (asVal === "font" || /\.(?:woff2?|ttf|otf|eot)($|\?)/i.test(strVal)) {
      context.recordOrigin("font", strVal);
    } else if (relVal === "icon" || relVal === "shortcut icon" || asVal === "image") {
      context.recordOrigin("img", strVal);
    } else if (asVal === "fetch") {
      context.recordOrigin("connect", strVal);
    }
  }
}

export function normalizeAttributeName(name: string): string {
  if (name === "className") return "class";
  if (name === "htmlFor") return "for";
  return name;
}

function tryFormatStaticStyle(expr: t.ObjectExpression): string | null {
  const styles: string[] = [];
  for (const prop of expr.properties) {
    if (!t.isObjectProperty(prop) || prop.computed) return null;
    let key: string;
    if (t.isIdentifier(prop.key)) {
      key = prop.key.name;
    } else if (t.isStringLiteral(prop.key)) {
      key = prop.key.value;
    } else {
      return null;
    }

    let val: string | number;
    if (t.isStringLiteral(prop.value)) {
      val = prop.value.value;
    } else if (t.isNumericLiteral(prop.value)) {
      val = prop.value.value;
    } else {
      return null;
    }

    const formattedVal = formatStyleProp(key, val);
    if (!formattedVal) continue;
    const kebab = key.startsWith("--") ? key : key.replace(/([A-Z])/g, "-$1").toLowerCase();
    styles.push(`${kebab}: ${formattedVal}`);
  }
  return styles.join("; ");
}

function tryFormatStaticClass(expr: t.Expression): string | null {
  if (t.isStringLiteral(expr)) {
    return expr.value;
  }
  if (t.isArrayExpression(expr)) {
    const classes: string[] = [];
    for (const el of expr.elements) {
      if (el === null || t.isNullLiteral(el)) continue;
      if (t.isBooleanLiteral(el) && !el.value) continue;
      if (t.isStringLiteral(el)) {
        if (el.value.trim()) classes.push(el.value.trim());
      } else if (t.isNumericLiteral(el)) {
        classes.push(String(el.value));
      } else if (t.isObjectExpression(el)) {
        const objClass = tryFormatStaticClass(el);
        if (objClass === null) return null;
        if (objClass) classes.push(objClass);
      } else {
        return null;
      }
    }
    return classes.join(" ");
  }
  if (t.isObjectExpression(expr)) {
    const classes: string[] = [];
    for (const prop of expr.properties) {
      if (!t.isObjectProperty(prop) || prop.computed) return null;
      let key: string;
      if (t.isIdentifier(prop.key)) {
        key = prop.key.name;
      } else if (t.isStringLiteral(prop.key)) {
        key = prop.key.value;
      } else {
        return null;
      }

      if (t.isBooleanLiteral(prop.value)) {
        if (prop.value.value) classes.push(key);
      } else if (t.isNullLiteral(prop.value)) {
        // falsy, skip
      } else if (t.isNumericLiteral(prop.value)) {
        if (prop.value.value !== 0) classes.push(key);
      } else {
        return null;
      }
    }
    return classes.join(" ");
  }
  return null;
}

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
        let spreadArg = attr.argument;
        if (isSpreadSanitizerActive(context.options.security)) {
          context.requireSecurityHelper("_cleanSpread");
          context.requireSecurityHelper("_safeUrl");
          context.requireSecurityHelper("_safeName");
          spreadArg = t.callExpression(t.identifier("_cleanSpread"), [attr.argument]);
        }
        statements.push(
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.callExpression(
                  t.memberExpression(t.identifier("Object"), t.identifier("entries")),
                  [spreadArg]
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

      const rawAttrName = t.isJSXNamespacedName(attr.name)
        ? `${attr.name.namespace.name}:${attr.name.name.name}`
        : attr.name.name;
      const attrName = normalizeAttributeName(rawAttrName);

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
