import { computed, type ReadonlySignal, signal } from "@signals";

let idCounter = 0;

/**
 * Generate a unique, deterministic ID for ARIA attributes
 */
export function createId(prefix = "visage"): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Helper for components that support both controlled and uncontrolled signal/value patterns
 */
export function createControllableSignal<T>(options: {
  value?: () => T | undefined;
  defaultValue?: T;
  onChange?: (value: T) => void;
}): [ReadonlySignal<T>, (next: T | ((prev: T) => T)) => void] {
  const isControlled = typeof options.value === "function";
  const internal = signal<T>(options.defaultValue as T, { internal: true });

  const getter = computed<T>(
    () => {
      if (isControlled) {
        const externalVal = options.value!();
        if (externalVal !== undefined) return externalVal;
      }
      return internal();
    },
    { internal: true }
  );

  const setter = (next: T | ((prev: T) => T)) => {
    const currentVal = getter();
    const nextVal = typeof next === "function" ? (next as (prev: T) => T)(currentVal) : next;

    internal.set(nextVal);
    if (options.onChange && nextVal !== currentVal) {
      options.onChange(nextVal);
    }
  };

  return [getter, setter];
}

/**
 * Setup a focus trap inside a container element
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent) {
  if (event.key !== "Tab") return;

  const focusables = container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  if (focusables.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusables[0]!;
  const last = focusables[focusables.length - 1]!;

  if (event.shiftKey) {
    if (document.activeElement === first) {
      last.focus();
      event.preventDefault();
    }
  } else {
    if (document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  }
}

/**
 * Listen for click outside a target element
 */
export function onClickOutside(
  elements:
    | Array<HTMLElement | null | undefined>
    | HTMLElement
    | null
    | undefined
    | (() => Array<HTMLElement | null | undefined>),
  handler: (event: MouseEvent | TouchEvent) => void
): () => void {
  const listener = (event: MouseEvent | TouchEvent) => {
    const target = event.target as Node | null;
    if (!target) return;

    const raw = typeof elements === "function" ? elements() : elements;
    const list = Array.isArray(raw) ? raw : [raw];
    const isInside = list.some((el) => el?.contains(target));

    if (!isInside) {
      handler(event);
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("mousedown", listener, true);
    document.addEventListener("touchstart", listener, true);
  }

  return () => {
    if (typeof document !== "undefined") {
      document.removeEventListener("mousedown", listener, true);
      document.removeEventListener("touchstart", listener, true);
    }
  };
}
