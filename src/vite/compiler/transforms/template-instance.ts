import * as t from "@babel/types";
import { buildNavExpression, computeChildPath } from "../path-walker";
import type { CompilerContext, DynamicBinding } from "../types";
import { transformAttribute } from "./attributes";
import { normalizeAttributeName } from "./element-static";
import { isSpreadSanitizerActive } from "./security";

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
  let anchorVarIndex = 0;
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
                  [t.logicalExpression("||", spreadArg, t.objectExpression([]))]
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

    // Pre-declare anchors for placeholder-backed dynamic children so subsequent insertions don't shift DOM indices
    const childAnchors: (t.Identifier | null)[] = [];
    for (const ch of b.children) {
      if (ch.isSingleTextChild) {
        childAnchors.push(null);
      } else {
        const anchorVar = t.identifier(`_anchor$${++anchorVarIndex}`);
        const anchorPath = computeChildPath([], ch.index);
        const anchorNavExpr = buildNavExpression(targetVar, anchorPath);
        statements.push(
          t.variableDeclaration("const", [t.variableDeclarator(anchorVar, anchorNavExpr)])
        );
        childAnchors.push(anchorVar);
      }
    }

    // Process dynamic children
    for (let i = 0; i < b.children.length; i++) {
      const ch = b.children[i]!;
      const anchor = childAnchors[i];
      context.requireHelper("insertChild");
      const args: t.Expression[] = [targetVar, ch.expr];
      if (anchor) {
        args.push(anchor);
      }
      statements.push(t.expressionStatement(t.callExpression(t.identifier("insertChild"), args)));
    }
  }

  statements.push(t.returnStatement(t.identifier("_el$")));

  return t.callExpression(t.arrowFunctionExpression([], t.blockStatement(statements)), []);
}
