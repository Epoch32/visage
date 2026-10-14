import * as t from "@babel/types";
import type { AttributeTransformContext, AttributeTransformResult } from "../types";

export function isTwoWayBindingAttribute(name: string): boolean {
  return name === "bind:value" || name === "bind:checked" || name === "bind";
}

export function transformTwoWayBinding(ctx: AttributeTransformContext): AttributeTransformResult {
  const { attrName, valueExpr, targetVar, context } = ctx;
  context.requireHelper("effect");

  const isChecked = attrName === "bind:checked";
  const propName = isChecked ? "checked" : "value";
  const eventName = isChecked ? "change" : "input";

  // effect(() => { targetVar.prop = valueExpr(); });
  const effectStatement = t.expressionStatement(
    t.callExpression(t.identifier("effect"), [
      t.arrowFunctionExpression(
        [],
        t.assignmentExpression(
          "=",
          t.memberExpression(targetVar, t.identifier(propName)),
          t.callExpression(valueExpr, [])
        )
      )
    ])
  );

  // targetVar.addEventListener("input", (e) => { valueExpr.set(e.target.value); });
  const listenerStatement = t.expressionStatement(
    t.callExpression(t.memberExpression(targetVar, t.identifier("addEventListener")), [
      t.stringLiteral(eventName),
      t.arrowFunctionExpression(
        [t.identifier("e")],
        t.callExpression(t.memberExpression(valueExpr, t.identifier("set")), [
          t.memberExpression(
            t.memberExpression(t.identifier("e"), t.identifier("target")),
            t.identifier(propName)
          )
        ])
      )
    ])
  );

  return { statements: [effectStatement, listenerStatement] };
}
