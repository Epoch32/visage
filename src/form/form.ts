import { type ReadonlySignal, type WritableSignal, batch, computed, signal } from "../signals";
import { type SchemaLike, validateWithSchema } from "./schema";

export interface FieldState<T> {
  value: WritableSignal<T>;
  error: ReadonlySignal<string | null>;
  touched: WritableSignal<boolean>;
  isDirty: ReadonlySignal<boolean>;
}

export type FormFields<T> = {
  [K in keyof T]-?: FieldState<T[K]>;
};

export interface FormOptions<T extends Record<string, any> = Record<string, any>> {
  initialValues: T;
  schema?: SchemaLike<any>;
  validateOn?: "change" | "blur" | "submit";
  onSubmit?: (values: T) => void | Promise<void>;
}

export interface Form<T> {
  fields: FormFields<T>;
  values: () => T;
  errors: ReadonlySignal<Partial<Record<keyof T, string>>>;
  isValid: ReadonlySignal<boolean>;
  isDirty: ReadonlySignal<boolean>;
  isSubmitting: ReadonlySignal<boolean>;
  submitCount: ReadonlySignal<number>;
  bind: (name: keyof T) => {
    name: string;
    value: WritableSignal<any>;
    onInput: (e: any) => void;
    onBlur: () => void;
  };
  handleSubmit: (e?: Event) => Promise<boolean>;
  reset: (values?: Partial<T>) => void;
  setFieldValue: <K extends keyof T>(name: K, value: T[K]) => void;
  setFieldError: (name: keyof T, error: string | null) => void;
  validate: () => boolean;
}

/**
 * Create a fine-grained reactive form with built-in schema validation (ArkType, Zod, Valibot, or native v)
 */
export function createForm<T extends Record<string, any> = Record<string, any>>(
  options: FormOptions<T>
): Form<T> {
  const initialValues = { ...options.initialValues } as T;
  const validateMode = options.validateOn ?? "change";

  const fields = {} as FormFields<T>;
  const isSubmitting = signal(false);
  const submitCount = signal(0);
  const customErrors = signal<Partial<Record<keyof T, string>>>({});

  for (const key in initialValues) {
    const initVal = initialValues[key];
    const valSignal = signal(initVal);
    const touchedSignal = signal(false);
    const isDirty = computed(() => !Object.is(valSignal(), initialValues[key]));

    (fields as any)[key] = {
      value: valSignal,
      touched: touchedSignal,
      isDirty,
      error: computed(() => {
        const custom = customErrors()[key];
        if (custom) return custom;

        if (validateMode === "blur" && !touchedSignal() && submitCount() === 0) {
          return null;
        }

        if (!options.schema) return null;

        const currentValues = getValues();
        const res = validateWithSchema(options.schema, currentValues);
        if (!res.success && res.issues) {
          const match = res.issues.find((i) => i.path === key || i.path === `${key}`);
          return match ? match.message : null;
        }
        return null;
      })
    };
  }

  const getValues = (): T => {
    const res: Record<string, any> = {};
    for (const key in fields) {
      res[key] = (fields as any)[key].value();
    }
    return res as T;
  };

  const errors = computed<Partial<Record<keyof T, string>>>(() => {
    const errMap: Partial<Record<keyof T, string>> = {};
    for (const key in fields) {
      const err = (fields as any)[key].error();
      if (err) {
        errMap[key] = err;
      }
    }
    return errMap;
  });

  const isValid = computed(() => {
    const errs = errors();
    return Object.keys(errs).length === 0;
  });

  const isDirty = computed(() => {
    for (const key in fields) {
      if ((fields as any)[key].isDirty()) return true;
    }
    return false;
  });

  const validate = (): boolean => {
    if (!options.schema) return true;
    const res = validateWithSchema(options.schema, getValues());
    return res.success;
  };

  const handleSubmit = async (e?: Event): Promise<boolean> => {
    if (e?.preventDefault) {
      e.preventDefault();
    }

    submitCount.update((c) => c + 1);

    batch(() => {
      for (const key in fields) {
        (fields as any)[key].touched.set(true);
      }
    });

    const valid = validate();
    if (!valid) {
      return false;
    }

    if (options.onSubmit) {
      isSubmitting.set(true);
      try {
        await options.onSubmit(getValues());
      } finally {
        isSubmitting.set(false);
      }
    }

    return true;
  };

  const bind = (name: keyof T) => {
    const field = (fields as any)[name];
    if (!field) {
      throw new Error(`Field '${String(name)}' not found in form`);
    }

    return {
      name: String(name),
      value: field.value,
      onInput: (e: any) => {
        const val =
          e?.target?.type === "checkbox"
            ? e.target.checked
            : e?.target?.value !== undefined
              ? e.target.value
              : e;
        field.value.set(val);
      },
      onBlur: () => {
        field.touched.set(true);
      }
    };
  };

  const reset = (newValues?: Partial<T>) => {
    const resetTarget = { ...initialValues, ...newValues } as Record<string, any>;
    batch(() => {
      for (const key in fields) {
        (fields as any)[key].value.set(resetTarget[key]);
        (fields as any)[key].touched.set(false);
      }
      customErrors.set({});
      submitCount.set(0);
      isSubmitting.set(false);
    });
  };

  const setFieldValue = <K extends keyof T>(name: K, value: T[K]) => {
    (fields as any)[name]?.value.set(value);
  };

  const setFieldError = (name: keyof T, error: string | null) => {
    customErrors.update((prev) => ({
      ...prev,
      [name]: error ?? undefined
    }));
  };

  return {
    fields,
    values: getValues,
    errors,
    isValid,
    isDirty,
    isSubmitting,
    submitCount,
    bind,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
    validate
  };
}
