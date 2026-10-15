import generator from "@babel/generator";
import * as t from "@babel/types";
import {
  CLEAN_SPREAD_HELPER_AST,
  SAFE_HTML_HELPER_AST,
  SAFE_NAME_HELPER_AST,
  SAFE_URL_HELPER_AST
} from "./transforms/security";
import type { CompilerContext } from "./types";

const babelGenerator = (generator as any).default || generator;

export interface GenerateResult {
  code: string;
  ast: t.File;
  detectedOrigins: import("./types").DetectedOrigins;
}

export function generateCode(ast: t.File, context: CompilerContext): GenerateResult {
  // 1. Prepare hoisted template declarations
  const templateDeclarations: t.Statement[] = [];
  for (const [html, id] of context.templateMap) {
    templateDeclarations.push(
      t.variableDeclaration("const", [
        t.variableDeclarator(
          t.identifier(id),
          t.callExpression(t.identifier("template"), [t.stringLiteral(html)])
        )
      ])
    );
  }

  // 2. Prepare security helpers and delegated events registration call
  const initStatements: t.Statement[] = [];
  if (context.securityHelpers.has("_safeUrl")) {
    initStatements.push(t.cloneNode(SAFE_URL_HELPER_AST));
  }
  if (context.securityHelpers.has("_safeName")) {
    initStatements.push(t.cloneNode(SAFE_NAME_HELPER_AST));
  }
  if (context.securityHelpers.has("_safeHtml")) {
    initStatements.push(t.cloneNode(SAFE_HTML_HELPER_AST));
  }
  if (context.securityHelpers.has("_cleanSpread")) {
    initStatements.push(t.cloneNode(CLEAN_SPREAD_HELPER_AST));
  }
  if (context.delegatedEvents.size > 0) {
    initStatements.push(
      t.expressionStatement(
        t.callExpression(t.identifier("delegateEvents"), [
          t.arrayExpression(Array.from(context.delegatedEvents).map((e) => t.stringLiteral(e)))
        ])
      )
    );
  }
  initStatements.push(...templateDeclarations);

  // 3. Inject helper imports if autoImport !== false and helpers were required
  const autoImport = context.options.autoImport !== false;
  const importSource = context.options.importSource ?? "visage";

  if (autoImport && context.importedHelpers.size > 0) {
    let existingImport: t.ImportDeclaration | undefined;
    for (const stmt of ast.program.body) {
      if (t.isImportDeclaration(stmt) && stmt.source.value === importSource) {
        existingImport = stmt;
        break;
      }
    }

    const neededHelpers = new Set(context.importedHelpers);

    if (existingImport) {
      for (const spec of existingImport.specifiers) {
        if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
          neededHelpers.delete(spec.imported.name);
        }
      }
      for (const helper of neededHelpers) {
        existingImport.specifiers.push(
          t.importSpecifier(t.identifier(helper), t.identifier(helper))
        );
      }
    } else {
      const specifiers: t.ImportSpecifier[] = [];
      for (const helper of neededHelpers) {
        specifiers.push(t.importSpecifier(t.identifier(helper), t.identifier(helper)));
      }
      if (specifiers.length > 0) {
        const importDecl = t.importDeclaration(specifiers, t.stringLiteral(importSource));
        ast.program.body.unshift(importDecl);
      }
    }
  }

  // 4. Insert top-level initializations (delegateEvents & templates) after imports
  if (initStatements.length > 0) {
    let insertIndex = 0;
    while (
      insertIndex < ast.program.body.length &&
      t.isImportDeclaration(ast.program.body[insertIndex])
    ) {
      insertIndex++;
    }
    ast.program.body.splice(insertIndex, 0, ...initStatements);
  }

  const generated = babelGenerator(ast, {
    retainLines: false,
    compact: false,
    filename: context.options.filename
  });

  return {
    code: generated.code,
    ast,
    detectedOrigins: context.detectedOrigins
  };
}
