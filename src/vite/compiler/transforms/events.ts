import * as t from "@babel/types";
import { DELEGATED_EVENTS } from "@dom/events";
import type { AttributeTransformContext, AttributeTransformResult } from "../types";

export function isEventAttribute(name: string): boolean {
  return name.startsWith("on") && name.length > 2;
}

export function transformEventAttribute(ctx: AttributeTransformContext): AttributeTransformResult {
  const { attrName, valueExpr, targetVar, context } = ctx;
  const isCapture = attrName.startsWith("onCapture");
  const rawEventName = isCapture ? attrName.slice(9) : attrName.slice(2);
  const eventName = rawEventName.toLowerCase();

  // If event delegation is enabled (default) and event is a delegable bubbling event
  if (context.options.delegateEvents !== false && !isCapture && DELEGATED_EVENTS.has(eventName)) {
    context.requireDelegatedEvent(eventName);

    let unwrapExpr: t.Expression = valueExpr;
    while (
      t.isTSAsExpression(unwrapExpr) ||
      t.isTSTypeAssertion(unwrapExpr) ||
      t.isTSNonNullExpression(unwrapExpr)
    ) {
      unwrapExpr = unwrapExpr.expression;
    }

    // Zero-allocation tuple optimization: [handler, data] -> target.__click = handler; target.__clickData = data
    if (
      t.isArrayExpression(unwrapExpr) &&
      unwrapExpr.elements.length === 2 &&
      unwrapExpr.elements[0] &&
      unwrapExpr.elements[1] &&
      !t.isSpreadElement(unwrapExpr.elements[0]) &&
      !t.isSpreadElement(unwrapExpr.elements[1])
    ) {
      const propIdentifier = t.identifier(`__${eventName}`);
      const dataPropIdentifier = t.identifier(`__${eventName}Data`);
      return {
        statements: [
          t.expressionStatement(
            t.assignmentExpression(
              "=",
              t.memberExpression(targetVar, propIdentifier),
              unwrapExpr.elements[0] as t.Expression
            )
          ),
          t.expressionStatement(
            t.assignmentExpression(
              "=",
              t.memberExpression(targetVar, dataPropIdentifier),
              unwrapExpr.elements[1] as t.Expression
            )
          )
        ]
      };
    }

    const propIdentifier = t.identifier(`__${eventName}`);
    const assignment = t.expressionStatement(
      t.assignmentExpression("=", t.memberExpression(targetVar, propIdentifier), valueExpr)
    );
    return { statements: [assignment] };
  }

  // Non-delegated event or capture listener: use native addEventListener
  const args: t.Expression[] = [t.stringLiteral(eventName), valueExpr];
  if (isCapture) {
    args.push(t.booleanLiteral(true));
  }

  const statement = t.expressionStatement(
    t.callExpression(t.memberExpression(targetVar, t.identifier("addEventListener")), args)
  );

  return { statements: [statement] };
}
