import * as t from "@babel/types";
import type { DomNavStep } from "./types";

export function buildNavExpression(rootIdentifier: t.Identifier, path: DomNavStep[]): t.Expression {
  let expr: t.Expression = rootIdentifier;
  for (const step of path) {
    expr = t.memberExpression(expr, t.identifier(step));
  }
  return expr;
}

export function computeChildPath(currentPath: DomNavStep[], childIndex: number): DomNavStep[] {
  const childPath: DomNavStep[] = [...currentPath];
  if (childIndex === 0) {
    childPath.push("firstChild");
  } else {
    childPath.push("firstChild");
    for (let s = 0; s < childIndex; s++) {
      childPath.push("nextSibling");
    }
  }
  return childPath;
}
