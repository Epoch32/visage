import { effect, isSignal } from "@signals";

/**
 * Handle two-way form bindings (bind:value, bind:checked, bind)
 * Returns true if the key was handled as a two-way binding.
 */
export function applyTwoWayBinding(
  el: HTMLElement | SVGElement,
  key: string,
  value: any,
  applyProp: (el: HTMLElement | SVGElement, key: string, value: any) => void
): boolean {
  if (
    (key !== "bind:value" && key !== "bind:checked" && key !== "bind") ||
    value === null ||
    value === undefined
  ) {
    return false;
  }

  let get: () => any;
  let set: (val: any) => void;

  if (isSignal(value) && typeof (value as any).set === "function") {
    get = () => (value as any)();
    set = (v: any) => (value as any).set(v);
  } else if (
    Array.isArray(value) &&
    typeof value[0] === "function" &&
    typeof value[1] === "function"
  ) {
    get = value[0];
    set = value[1];
  } else if (
    typeof value === "object" &&
    typeof value.get === "function" &&
    typeof value.set === "function"
  ) {
    get = value.get;
    set = value.set;
  } else {
    return false;
  }

  const isCheckbox = (el as any).type === "checkbox";
  const isRadio = (el as any).type === "radio";
  const bindChecked = key === "bind:checked" || (key === "bind" && (isCheckbox || isRadio));

  if (bindChecked) {
    effect(() => {
      const checkedVal = Boolean(get());
      if ((el as any).checked !== checkedVal) {
        (el as any).checked = checkedVal;
      }
    });
    el.addEventListener("change", (e: any) => {
      const val = e?.target ? e.target.checked : (el as any).checked;
      set(val);
    });
  } else {
    effect(() => {
      const val = get();
      applyProp(el, "value", val);
    });
    const updateValue = (e: any) => {
      const val = e?.target ? e.target.value : (el as any).value;
      set(val);
    };
    el.addEventListener("input", updateValue);
    el.addEventListener("change", updateValue);
  }

  return true;
}
