import type { Child } from "@dom/render";
import { effect, onCleanup } from "@signals";
import { objectToCSS, type StyleDefinition } from "./create-style";
import { getScopeId } from "./hash";
import { styleManager } from "./manager";
import { scopeCSS } from "./parser";

export interface StyleProps {
  children?: string | StyleDefinition | (() => string | StyleDefinition);
  classes?: StyleDefinition | (() => StyleDefinition);
  passToChildren?: boolean;
  id?: string;
}

/**
 * Scoped Component Style Block
 *
 * Automatically hashes and scopes CSS rules to the parent component/container,
 * preventing style leaks and collisions. Supports CSS strings or JavaScript style objects.
 *
 * Examples:
 *
 * 1. Object syntax:
 * ```tsx
 * export function Card(props) {
 *   return (
 *     <div class="card">
 *       <h2>{props.title}</h2>
 *       <Style classes={{
 *         card: { background: "var(--card-bg)", padding: "20px", borderRadius: "8px" },
 *         "& h2": { fontSize: "1.2rem", color: "var(--text)" }
 *       }} />
 *     </div>
 *   );
 * }
 * ```
 *
 * 2. Component Scoped CSS string:
 * ```tsx
 * export function StepItem(props) {
 *   return (
 *     <div class="step-node">
 *       <span class="step-num">{props.step}</span>
 *       <span>{props.title}</span>
 *
 *       <Style>{`
 *         .step-node { display: flex; align-items: center; gap: 8px; }
 *         .step-num { font-weight: 600; color: var(--primary); }
 *       `}</Style>
 *     </div>
 *   );
 * }
 * ```
 */
export function Style(props: StyleProps): Child {
  const getRawCSS = (): string => {
    if (props.classes) {
      const cls = typeof props.classes === "function" ? props.classes() : props.classes;
      return objectToCSS(cls);
    }
    if (props.children) {
      const ch = typeof props.children === "function" ? props.children() : props.children;
      return typeof ch === "object" ? objectToCSS(ch) : ch;
    }
    return "";
  };

  const rawCSS = getRawCSS();
  const scopeId = props.id ?? getScopeId(rawCSS);
  const scopeAttr = `data-${scopeId}`;

  // In browser, create a marker node to locate parent element and tag it
  if (typeof document !== "undefined") {
    const marker = document.createTextNode("");
    let unsubscribe: (() => void) | null = null;

    effect(() => {
      const currentCSS = getRawCSS();
      const currentScopeId = props.id ?? getScopeId(currentCSS);
      const scoped = scopeCSS(currentCSS, {
        scopeId: currentScopeId,
        passToChildren: props.passToChildren ?? true
      });

      if (unsubscribe) {
        unsubscribe();
      }
      unsubscribe = styleManager.inject(currentScopeId, scoped);

      // Attach data-v-xyz attribute to parent container
      const attachScope = () => {
        const parent = (marker.parentElement || marker.parentNode) as HTMLElement | null;
        if (parent && typeof parent.setAttribute === "function") {
          parent.setAttribute(`data-${currentScopeId}`, "");
        }
      };
      attachScope();
      queueMicrotask(attachScope);
    });

    onCleanup(() => {
      if (unsubscribe) {
        unsubscribe();
      }
      const parent = (marker.parentElement || marker.parentNode) as HTMLElement | null;
      if (parent && typeof parent.removeAttribute === "function") {
        parent.removeAttribute(scopeAttr);
      }
    });

    return marker;
  }

  // SSR environment: inject CSS into SSR registry
  const scoped = scopeCSS(rawCSS, {
    scopeId,
    passToChildren: props.passToChildren ?? true
  });
  styleManager.inject(scopeId, scoped);

  return null;
}
