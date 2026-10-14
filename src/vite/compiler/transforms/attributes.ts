import * as t from "@babel/types";
import type {
  AttributeTransformContext,
  AttributeTransformResult,
  CompilerContext
} from "../types";
import { isTwoWayBindingAttribute, transformTwoWayBinding } from "./bindings";
import { isEventAttribute, transformEventAttribute } from "./events";

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
  return {
    statements: [
      t.expressionStatement(
        t.callExpression(t.identifier("setAttribute"), [
          targetVar,
          t.stringLiteral(attrName),
          valueExpr
        ])
      )
    ]
  };
}
