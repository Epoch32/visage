export interface ScopeOptions {
  scopeId: string;
  passToChildren?: boolean;
}

/**
 * Scope a single CSS selector string with the given scope identifier
 */
export function scopeSelector(selector: string, options: ScopeOptions): string {
  const { scopeId, passToChildren = false } = options;
  const scopeAttr = `[data-${scopeId}]`;

  // Split by comma for multiple selectors (e.g. "h1, h2, .title")
  const parts = splitSelectorList(selector);

  return parts
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return "";

      // 1. Check for :global() wrapper
      if (trimmed.includes(":global(") || trimmed.includes("::v-global(")) {
        return trimmed
          .replace(
            /(.*?)(?:::v-global|:global)\(([^)]+)\)(.*)/g,
            (_match, before, globalTarget, after) => {
              const prefix = before.trim();
              const scopedPrefix = prefix ? scopeCompoundSelector(prefix, scopeAttr) : "";
              if (scopedPrefix) {
                return `${scopedPrefix} ${globalTarget.trim()}${after}`;
              }
              return `${globalTarget.trim()}${after}`;
            }
          )
          .trim();
      }

      // 2. Check for :deep() / ::v-deep() wrapper
      if (trimmed.includes(":deep(") || trimmed.includes("::v-deep(")) {
        // e.g. ".parent :deep(.child)" -> ".parent[data-v-xyz] .child" or "[data-v-xyz] .child"
        return trimmed
          .replace(
            /(.*?)(?:::v-deep|:deep)\(([^)]+)\)(.*)/g,
            (_match, before, deepTarget, after) => {
              const prefix = before.trim();
              const scopedPrefix = prefix ? scopeCompoundSelector(prefix, scopeAttr) : scopeAttr;
              return `${scopedPrefix} ${deepTarget.trim()}${after}`;
            }
          )
          .trim();
      }

      // 3. Standard scoped selector
      if (passToChildren) {
        const compound = scopeCompoundSelector(trimmed, scopeAttr);
        return `${scopeAttr} ${trimmed}, ${compound}`;
      }

      return scopeCompoundSelector(trimmed, scopeAttr);
    })
    .filter(Boolean)
    .join(", ");
}

/**
 * Scope a compound selector (e.g. ".card > .title.active:hover")
 */
function scopeCompoundSelector(selector: string, scopeAttr: string): string {
  // Combinators: space, >, +, ~
  const combinatorRegex = /([ >+~]+)/;
  const tokens = selector.split(combinatorRegex);

  const scopedTokens = tokens.map((token, index) => {
    // If it's a combinator (odd index), leave as is
    if (index % 2 === 1) return token;

    const piece = token.trim();
    if (!piece || piece === "*") return piece ? `${piece}${scopeAttr}` : "";

    // If pseudo-element exists (e.g. ::before, ::after), insert before it
    const pseudoElemIdx = piece.indexOf("::");
    if (pseudoElemIdx !== -1) {
      const base = piece.slice(0, pseudoElemIdx);
      const pseudo = piece.slice(pseudoElemIdx);
      return `${base}${scopeAttr}${pseudo}`;
    }

    // If pseudo-class exists (e.g. :hover, :focus, :nth-child(2)), insert before first pseudo-class
    const pseudoClassIdx = piece.indexOf(":");
    if (pseudoClassIdx !== -1) {
      const base = piece.slice(0, pseudoClassIdx);
      const pseudo = piece.slice(pseudoClassIdx);
      return `${base}${scopeAttr}${pseudo}`;
    }

    return `${piece}${scopeAttr}`;
  });

  return scopedTokens.join("");
}

/**
 * Split selector by commas while respecting parentheses (e.g. :is(.a, .b))
 */
function splitSelectorList(selectorList: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = "";

  for (let i = 0; i < selectorList.length; i++) {
    const char = selectorList[i];
    if (char === "(") {
      depth++;
      current += char;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if (char === "," && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) result.push(current.trim());
  return result;
}

/**
 * Full CSS block scoping transformer
 */
export function scopeCSS(css: string, options: ScopeOptions): string {
  const { scopeId } = options;
  const keyframeNames = new Set<string>();

  // 1. Identify and extract @keyframes names
  const keyframeRegex = /@(?:-webkit-)?keyframes\s+([a-zA-Z0-9_-]+)/g;
  let kMatch: RegExpExecArray | null = keyframeRegex.exec(css);
  while (kMatch !== null) {
    if (kMatch[1]) {
      keyframeNames.add(kMatch[1]);
    }
    kMatch = keyframeRegex.exec(css);
  }

  // 2. Tokenize and parse rules
  let processed = css;

  // Rename @keyframes definitions
  for (const name of keyframeNames) {
    const scopedName = `${scopeId}-${name}`;
    const defRegex = new RegExp(`(@(?:-webkit-)?keyframes\\s+)${name}\\b`, "g");
    processed = processed.replace(defRegex, `$1${scopedName}`);
  }

  // Replace animation property references to keyframes
  if (keyframeNames.size > 0) {
    for (const name of keyframeNames) {
      const scopedName = `${scopeId}-${name}`;
      const animRegex = new RegExp(`(animation(?:-name)?\\s*:[^;}]*?)\\b${name}\\b([^;}]*)`, "g");
      processed = processed.replace(animRegex, `$1${scopedName}$2`);
    }
  }

  // 3. Parse and rewrite CSS rules and nested blocks
  return transformRules(processed, options);
}

function transformRules(css: string, options: ScopeOptions): string {
  let output = "";
  let i = 0;
  const len = css.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && /\s/.test(css[i] as string)) {
      output += css[i];
      i++;
    }
    if (i >= len) break;

    // Handle comments
    if (css[i] === "/" && css[i + 1] === "*") {
      const endComment = css.indexOf("*/", i + 2);
      if (endComment === -1) {
        output += css.slice(i);
        break;
      }
      output += css.slice(i, endComment + 2);
      i = endComment + 2;
      continue;
    }

    // Find next block opener '{' or ';'
    const openBrace = css.indexOf("{", i);
    if (openBrace === -1) {
      output += css.slice(i);
      break;
    }

    const header = css.slice(i, openBrace).trim();

    // Check if at-rule (like @media, @supports, @container, @keyframes)
    if (header.startsWith("@")) {
      if (
        header.startsWith("@media") ||
        header.startsWith("@supports") ||
        header.startsWith("@container")
      ) {
        // Find matching closing brace for nested at-rule
        const closeBrace = findMatchingBrace(css, openBrace);
        if (closeBrace === -1) {
          output += css.slice(i);
          break;
        }
        const innerContent = css.slice(openBrace + 1, closeBrace);
        const transformedInner = transformRules(innerContent, options);

        output += `${header} {\n${transformedInner}\n}`;
        i = closeBrace + 1;
        continue;
      }

      if (header.includes("keyframes") || header.startsWith("@font-face")) {
        // Keep keyframe and font-face blocks intact without selector scoping
        const closeBrace = findMatchingBrace(css, openBrace);
        if (closeBrace === -1) {
          output += css.slice(i);
          break;
        }
        output += css.slice(i, closeBrace + 1);
        i = closeBrace + 1;
        continue;
      }
    }

    // Standard rule selector
    const closeBrace = findMatchingBrace(css, openBrace);
    if (closeBrace === -1) {
      output += css.slice(i);
      break;
    }

    const body = css.slice(openBrace + 1, closeBrace);
    const scopedSelector = scopeSelector(header, options);

    output += `${scopedSelector} {${body}}`;
    i = closeBrace + 1;
  }

  return output;
}

function findMatchingBrace(str: string, openIndex: number): number {
  let depth = 0;
  let inString: string | null = null;
  let inComment = false;

  for (let i = openIndex; i < str.length; i++) {
    const char = str[i];
    const prev = i > 0 ? str[i - 1] : "";

    if (inComment) {
      if (char === "/" && prev === "*") {
        inComment = false;
      }
      continue;
    }

    if (inString) {
      if (char === inString && prev !== "\\") {
        inString = null;
      }
      continue;
    }

    if (char === "/" && str[i + 1] === "*") {
      inComment = true;
      i++;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
