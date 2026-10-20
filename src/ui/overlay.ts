import { effect, onCleanup } from "@signals";
import { onClickOutside, trapFocus } from "./utils";

export interface UseDismissOptions {
  /**
   * Whether dismiss listeners are active.
   * Defaults to true.
   */
  enabled?: boolean | (() => boolean);
  /**
   * Callback fired when dismissal is requested (Escape, click outside, or close button).
   */
  onDismiss: () => void;
  /**
   * Close on 'Escape' key press.
   * Defaults to true.
   */
  escapeKey?: boolean;
  /**
   * Close on pointer interaction outside the target element(s).
   * Defaults to true.
   */
  outsidePointer?: boolean;
  /**
   * Additional element(s) to exclude from outside click detection (e.g. trigger button).
   */
  outsideIgnore?:
    | Array<HTMLElement | null | undefined>
    | HTMLElement
    | null
    | undefined
    | (() => Array<HTMLElement | null | undefined>);
  /**
   * Trap keyboard focus inside the container when Tab / Shift+Tab is pressed.
   * Defaults to false.
   */
  trapFocus?: boolean;
  /**
   * Close selector for click events bubbling inside the container (e.g. '[data-dialog-close]').
   */
  closeSelector?: string;
  /**
   * Callback fired when an outside pointer interaction occurs.
   */
  onOutsidePointer?: (event: MouseEvent | TouchEvent) => void;
  /**
   * Callback fired when an Escape keydown occurs.
   */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}

/**
 * Headless hook to manage overlay dismissal:
 * - Outside pointer dismissal (click outside)
 * - Escape key dismissal
 * - Keyboard focus trapping (Tab cycle)
 * - Close button selector dismissal delegation
 */
export function useDismiss(
  element: () => HTMLElement | null | undefined,
  options: UseDismissOptions
): {
  handleKeyDown: (e: KeyboardEvent) => void;
  handleClick: (e: MouseEvent) => void;
} {
  const isEnabled = () => {
    if (typeof options.enabled === "function") return options.enabled();
    return options.enabled ?? true;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isEnabled() || e.defaultPrevented) return;

    if (e.key === "Escape" && (options.escapeKey ?? true)) {
      if (options.onEscapeKeyDown) {
        options.onEscapeKeyDown(e);
      }
      if (!e.defaultPrevented) {
        options.onDismiss();
        e.stopPropagation();
      }
    } else if (e.key === "Tab" && options.trapFocus) {
      const el = element();
      if (el) {
        trapFocus(el, e);
      }
    }
  };

  const handleClick = (e: MouseEvent) => {
    if (!isEnabled() || e.defaultPrevented) return;
    if (options.closeSelector) {
      const target = e.target as HTMLElement | null;
      if (target?.closest(options.closeSelector)) {
        options.onDismiss();
      }
    }
  };

  // Setup outside pointer listener and global escape key listener reactively only when enabled
  if (typeof document !== "undefined") {
    effect(() => {
      if (!isEnabled()) return;

      const unbindPointer = onClickOutside(
        () => {
          const el = element();
          const rawIgnores =
            typeof options.outsideIgnore === "function"
              ? options.outsideIgnore()
              : options.outsideIgnore;
          const ignores = Array.isArray(rawIgnores) ? rawIgnores : rawIgnores ? [rawIgnores] : [];
          return [el, ...ignores];
        },
        (event) => {
          if (options.outsidePointer === false) return;
          if (options.onOutsidePointer) {
            options.onOutsidePointer(event);
          }
          if (!event.defaultPrevented) {
            options.onDismiss();
          }
        }
      );

      const onGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.defaultPrevented) return;
        if (e.key === "Escape" && (options.escapeKey ?? true)) {
          if (options.onEscapeKeyDown) {
            options.onEscapeKeyDown(e);
          }
          if (!e.defaultPrevented) {
            options.onDismiss();
            e.stopPropagation();
          }
        } else if (e.key === "Tab" && options.trapFocus) {
          const el = element();
          if (el) {
            trapFocus(el, e);
          }
        }
      };

      const targetWindow = typeof window !== "undefined" ? window : document;
      targetWindow.addEventListener("keydown", onGlobalKeyDown as any);

      onCleanup(() => {
        unbindPointer();
        targetWindow.removeEventListener("keydown", onGlobalKeyDown as any);
      });
    });
  }

  return {
    handleKeyDown,
    handleClick
  };
}
