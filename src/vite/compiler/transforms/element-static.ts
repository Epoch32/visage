import * as t from "@babel/types";
import { formatStyleProp } from "../../../style/scale";
import type { CompilerContext } from "../types";

export function recordStaticOrigin(
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

export function tryFormatStaticStyle(expr: t.ObjectExpression): string | null {
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

export function tryFormatStaticClass(expr: t.Expression): string | null {
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
