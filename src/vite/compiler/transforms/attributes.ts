import * as t from "@babel/types";
import type {
  AttributeTransformContext,
  AttributeTransformResult,
  CompilerContext
} from "../types";
import { isTwoWayBindingAttribute, transformTwoWayBinding } from "./bindings";
import { isEventAttribute, transformEventAttribute } from "./events";
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
  isUrlAttribute,
  isUrlShieldActive
} from "./security";

export function transformAttribute(
  attrName: string,
  valueExpr: t.Expression,
  targetVar: t.Identifier,
  context: CompilerContext
): AttributeTransformResult {
  const ctx: AttributeTransformContext = {
    attrName,
    valueExpr,
    targetVar,
    context
  };

  // 1. Check custom compiler plugins
  for (const plugin of context.plugins) {
    if (plugin.transformAttribute) {
      const res = plugin.transformAttribute(ctx);
      if (res) return res;
    }
  }

  // 2. Two-way bindings (bind:value / bind:checked)
  if (isTwoWayBindingAttribute(attrName)) {
    return transformTwoWayBinding(ctx);
  }

  // 3. Event listeners (onClick, onInput, etc.)
  if (isEventAttribute(attrName)) {
    if (isEventShieldActive(context.options.security)) {
      if (t.isStringLiteral(valueExpr)) {
        assertSafeEventValue(attrName, valueExpr.value);
      } else if (t.isTemplateLiteral(valueExpr)) {
        assertSafeEventValue(attrName, "[template literal]");
      }
    }
    return transformEventAttribute(ctx);
  }

  // 4. Ref callback
  if (attrName === "ref") {
    return {
      statements: [t.expressionStatement(t.callExpression(valueExpr, [targetVar]))]
    };
  }

  // 5. textContent direct property binding
  if (attrName === "textContent" || attrName === "prop:textContent") {
    if (t.isArrowFunctionExpression(valueExpr) || t.isFunctionExpression(valueExpr)) {
      context.requireHelper("effect");
      return {
        statements: [
          t.expressionStatement(
            t.callExpression(t.identifier("effect"), [
              t.arrowFunctionExpression(
                [],
                t.assignmentExpression(
                  "=",
                  t.memberExpression(targetVar, t.identifier("textContent")),
                  t.callExpression(valueExpr, [])
                )
              )
            ])
          )
        ]
      };
    }
    return {
      statements: [
        t.expressionStatement(
          t.assignmentExpression(
            "=",
            t.memberExpression(targetVar, t.identifier("textContent")),
            valueExpr
          )
        )
      ]
    };
  }

  // 6. Generic prop: prefix
  if (attrName.startsWith("prop:")) {
    const propName = attrName.slice(5);
    return {
      statements: [
        t.expressionStatement(
          t.assignmentExpression(
            "=",
            t.memberExpression(targetVar, t.identifier(propName)),
            valueExpr
          )
        )
      ]
    };
  }

  // 5. Reactive class / className
  if (attrName === "class" || attrName === "className") {
    context.requireHelper("effect");

    let classExpr: t.Expression;
    if (
      t.isArrowFunctionExpression(valueExpr) &&
      valueExpr.params.length === 0 &&
      t.isExpression(valueExpr.body)
    ) {
      classExpr = t.logicalExpression("||", valueExpr.body, t.stringLiteral(""));
    } else {
      classExpr = t.logicalExpression(
        "||",
        t.conditionalExpression(
          t.binaryExpression(
            "===",
            t.unaryExpression("typeof", valueExpr),
            t.stringLiteral("function")
          ),
          t.callExpression(valueExpr, []),
          valueExpr
        ),
        t.stringLiteral("")
      );
    }

    return {
      statements: [
        t.expressionStatement(
          t.callExpression(t.identifier("effect"), [
            t.arrowFunctionExpression(
              [],
              t.assignmentExpression(
                "=",
                t.memberExpression(targetVar, t.identifier("className")),
                classExpr
              )
            )
          ])
        )
      ]
    };
  }

  // 6. Generic attribute / property via setAttribute helper
  context.requireHelper("setAttribute");

  let finalValueExpr = valueExpr;
  const sec = context.options.security;
  if (isUrlShieldActive(sec) && isUrlAttribute(attrName)) {
    if (t.isStringLiteral(valueExpr)) {
      assertSafeStaticUrl(attrName, valueExpr.value);
    } else {
      context.requireSecurityHelper("_safeUrl");
      finalValueExpr = t.callExpression(t.identifier("_safeUrl"), [valueExpr]);
    }
  } else if (isClobberShieldActive(sec) && isClobberAttribute(attrName)) {
    if (t.isStringLiteral(valueExpr)) {
      assertSafeClobberStatic(attrName, valueExpr.value);
    } else {
      context.requireSecurityHelper("_safeName");
      finalValueExpr = t.callExpression(t.identifier("_safeName"), [valueExpr]);
    }
  } else if (isHtmlShieldActive(sec) && isHtmlAttribute(attrName)) {
    if (t.isStringLiteral(valueExpr)) {
      assertSafeHtmlStatic(attrName, valueExpr.value);
    } else {
      context.requireSecurityHelper("_safeHtml");
      finalValueExpr = t.callExpression(t.identifier("_safeHtml"), [valueExpr]);
    }
  }

  return {
    statements: [
      t.expressionStatement(
        t.callExpression(t.identifier("setAttribute"), [
          targetVar,
          t.stringLiteral(attrName),
          finalValueExpr
        ])
      )
    ]
  };
}
