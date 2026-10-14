import * as t from "@babel/types";
import { DELEGATED_EVENTS } from "../../../dom/events";
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
