/**
 * Built-in lightweight schema validator & Standard Schema v1 (ArkType, Zod, Valibot) support
 */

export type IssuePath = string | (string | number)[];

export interface ValidationIssue {
  path: IssuePath;
  message: string;
}

export function normalizeIssuePath(path?: IssuePath): string {
  if (Array.isArray(path)) {
    return path.join(".");
  }
  return path ? String(path) : "";
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  issues?: ValidationIssue[];
}

export interface StandardSchemaV1<T = any> {
  "~standard": {
    version: 1;
    vendor: string;
    validate: (value: unknown) =>
      | { value: T }
      | {
          issues: ReadonlyArray<{
            path?: ReadonlyArray<string | number>;
            message: string;
          }>;
        };
  };
}

export type SchemaLike<T = any> =
  | Schema<T>
  | StandardSchemaV1<T>
  | ((value: unknown) => ValidationResult<T> | boolean | string | null | undefined);

export abstract class Schema<T = any> {
  declare readonly _type: T;
  abstract validate(value: unknown, path?: string): ValidationResult<T>;

  // Standard Schema v1 specification compatibility
  "~standard" = {
    version: 1 as const,
    vendor: "visage",
    validate: (val: unknown) => {
      const res = this.validate(val);
      if (res.success) {
        return { value: res.data as T };
      }
      return {
        issues: (res.issues || []).map((i) => ({
          path: Array.isArray(i.path) ? i.path : [i.path],
          message: i.message
        }))
      };
    }
  };
}

class StringSchema extends Schema<string> {
  private _min?: { val: number; msg?: string };
  private _max?: { val: number; msg?: string };
  private _emailMsg?: string;
  private _regex?: { pattern: RegExp; msg?: string };
  private _isOptional = false;

  min(length: number, message?: string): this {
    this._min = { val: length, msg: message };
    return this;
  }

  max(length: number, message?: string): this {
    this._max = { val: length, msg: message };
    return this;
  }

  email(message?: string): this {
    this._emailMsg = message ?? "Invalid email address";
    return this;
  }

  regex(pattern: RegExp, message?: string): this {
    this._regex = { pattern, msg: message };
    return this;
  }

  optional(): Schema<string | undefined> {
    this._isOptional = true;
    return this as any;
  }

  validate(value: unknown, path = ""): ValidationResult<string> {
    if (value === undefined || value === null || value === "") {
      if (this._isOptional) return { success: true, data: undefined };
      return { success: false, issues: [{ path, message: "This field is required" }] };
    }

    if (typeof value !== "string") {
      return { success: false, issues: [{ path, message: "Must be a string" }] };
    }

    if (this._min && value.length < this._min.val) {
      return {
        success: false,
        issues: [{ path, message: this._min.msg ?? `Must be at least ${this._min.val} characters` }]
      };
    }

    if (this._max && value.length > this._max.val) {
      return {
        success: false,
        issues: [{ path, message: this._max.msg ?? `Must be at most ${this._max.val} characters` }]
      };
    }

    if (this._emailMsg) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { success: false, issues: [{ path, message: this._emailMsg }] };
      }
    }

    if (this._regex && !this._regex.pattern.test(value)) {
      return {
        success: false,
        issues: [{ path, message: this._regex.msg ?? "Invalid format" }]
      };
    }

    return { success: true, data: value };
  }
}

class NumberSchema extends Schema<number> {
  private _min?: { val: number; msg?: string };
  private _max?: { val: number; msg?: string };
  private _integer?: { msg?: string };
  private _isOptional = false;

  min(value: number, message?: string): this {
    this._min = { val: value, msg: message };
    return this;
  }

  max(value: number, message?: string): this {
    this._max = { val: value, msg: message };
    return this;
  }

  integer(message?: string): this {
    this._integer = { msg: message };
    return this;
  }

  optional(): Schema<number | undefined> {
    this._isOptional = true;
    return this as any;
  }

  validate(value: unknown, path = ""): ValidationResult<number> {
    if (value === undefined || value === null || value === "") {
      if (this._isOptional) return { success: true, data: undefined };
      return { success: false, issues: [{ path, message: "This field is required" }] };
    }

    const num = Number(value);
    if (Number.isNaN(num) || typeof value === "boolean") {
      return { success: false, issues: [{ path, message: "Must be a valid number" }] };
    }

    if (this._integer && !Number.isInteger(num)) {
      return {
        success: false,
        issues: [{ path, message: this._integer.msg ?? "Must be an integer" }]
      };
    }

    if (this._min && num < this._min.val) {
      return {
        success: false,
        issues: [{ path, message: this._min.msg ?? `Must be at least ${this._min.val}` }]
      };
    }

    if (this._max && num > this._max.val) {
      return {
        success: false,
        issues: [{ path, message: this._max.msg ?? `Must be at most ${this._max.val}` }]
      };
    }

    return { success: true, data: num };
  }
}

class BooleanSchema extends Schema<boolean> {
  validate(value: unknown, _path = ""): ValidationResult<boolean> {
    return { success: true, data: Boolean(value) };
  }
}

export type InferSchemaType<S> =
  S extends Schema<infer T>
    ? T
    : S extends StandardSchemaV1<infer T>
      ? T
      : S extends (val: any) => ValidationResult<infer T>
        ? T
        : any;

export type InferObjectShape<S extends Record<string, SchemaLike<any>>> = {
  [K in keyof S]: InferSchemaType<S[K]>;
};

export class ObjectSchema<T extends Record<string, any>> extends Schema<T> {
  private _isOptional = false;

  constructor(public shape: { [K in keyof T]: SchemaLike<T[K]> }) {
    super();
  }

  optional(): Schema<T | undefined> {
    this._isOptional = true;
    return this as any;
  }

  validate(value: unknown, basePath = ""): ValidationResult<T> {
    if (value === undefined || value === null) {
      if (this._isOptional) return { success: true, data: undefined };
      return { success: false, issues: [{ path: basePath, message: "This field is required" }] };
    }

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { success: false, issues: [{ path: basePath, message: "Must be an object" }] };
    }

    const issues: ValidationIssue[] = [];
    const data: Record<string, any> = {};

    for (const key in this.shape) {
      const fieldSchema = this.shape[key]!;
      const fieldVal = (value as any)[key];
      const fieldPath = basePath ? `${basePath}.${key}` : key;

      const res = validateWithSchema(fieldSchema, fieldVal, fieldPath);
      if (res.success) {
        data[key] = res.data;
      } else if (res.issues) {
        issues.push(...res.issues);
      }
    }

    if (issues.length > 0) {
      return { success: false, issues };
    }

    return { success: true, data: data as T };
  }
}

class RecordSchema extends Schema<Record<string, any>> {
  private _isOptional = false;

  optional(): Schema<Record<string, any> | undefined> {
    this._isOptional = true;
    return this as any;
  }

  validate(value: unknown, path = ""): ValidationResult<Record<string, any>> {
    if (value === undefined || value === null) {
      if (this._isOptional) return { success: true, data: undefined };
      return { success: false, issues: [{ path, message: "This field is required" }] };
    }

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { success: false, issues: [{ path, message: "Must be an object" }] };
    }

    return { success: true, data: value as Record<string, any> };
  }
}

class AnySchema extends Schema<any> {
  private _isOptional = false;

  optional(): Schema<any> {
    this._isOptional = true;
    return this as any;
  }

  validate(value: unknown, path = ""): ValidationResult<any> {
    if (value === undefined || value === null) {
      if (this._isOptional) return { success: true, data: undefined };
      return { success: false, issues: [{ path, message: "This field is required" }] };
    }
    return { success: true, data: value };
  }
}

export interface FileValidationOptions {
  maxSize?: number;
  minSize?: number;
  type?: string | string[];
}

function isFileLike(val: unknown): val is File {
  if (typeof File !== "undefined" && val instanceof File) return true;
  return (
    typeof val === "object" &&
    val !== null &&
    "name" in val &&
    "size" in val &&
    typeof (val as any).arrayBuffer === "function"
  );
}

function isBlobLike(val: unknown): val is Blob {
  if (typeof Blob !== "undefined" && val instanceof Blob) return true;
  return (
    typeof val === "object" &&
    val !== null &&
    "size" in val &&
    typeof (val as any).arrayBuffer === "function"
  );
}

function isFormDataLike(val: unknown): val is FormData {
  if (typeof FormData !== "undefined" && val instanceof FormData) return true;
  return (
    typeof val === "object" &&
    val !== null &&
    (typeof (val as any).get === "function" || "__formData" in val)
  );
}

function matchesFileType(name: string, type: string, patterns: string | string[]): boolean {
  const patternList = Array.isArray(patterns)
    ? patterns.map((p) => p.trim().toLowerCase())
    : patterns.split(",").map((p) => p.trim().toLowerCase());

  const lowerName = name.toLowerCase();
  const lowerType = type.toLowerCase();

  return patternList.some((pat) => {
    if (pat.startsWith(".")) {
      return lowerName.endsWith(pat);
    }
    if (pat.endsWith("/*")) {
      const prefix = pat.slice(0, -2);
      return lowerType.startsWith(prefix);
    }
    return lowerType === pat;
  });
}

export class FileSchema extends Schema<File> {
  private _isOptional = false;
  private _maxSize?: { val: number; msg?: string };
  private _minSize?: { val: number; msg?: string };
  private _allowedTypes?: { patterns: string | string[]; msg?: string };

  constructor(options: FileValidationOptions = {}) {
    super();
    if (options.maxSize !== undefined) this._maxSize = { val: options.maxSize };
    if (options.minSize !== undefined) this._minSize = { val: options.minSize };
    if (options.type !== undefined) this._allowedTypes = { patterns: options.type };
  }

  optional(): Schema<File | undefined> {
    this._isOptional = true;
    return this as any;
  }

  max(size: number, msg?: string): this {
    this._maxSize = { val: size, msg };
    return this;
  }

  min(size: number, msg?: string): this {
    this._minSize = { val: size, msg };
    return this;
  }

  type(types: string | string[], msg?: string): this {
    this._allowedTypes = { patterns: types, msg };
    return this;
  }

  validate(value: unknown, path = ""): ValidationResult<File> {
    if (value === undefined || value === null) {
      if (this._isOptional) return { success: true, data: undefined as any };
      return { success: false, issues: [{ path, message: "File is required" }] };
    }

    if (!isFileLike(value)) {
      return { success: false, issues: [{ path, message: "Expected a File object" }] };
    }

    if (this._maxSize && value.size > this._maxSize.val) {
      return {
        success: false,
        issues: [
          {
            path,
            message:
              this._maxSize.msg ||
              `File size (${value.size}B) exceeds maximum allowed (${this._maxSize.val}B)`
          }
        ]
      };
    }

    if (this._minSize && value.size < this._minSize.val) {
      return {
        success: false,
        issues: [
          {
            path,
            message:
              this._minSize.msg ||
              `File size (${value.size}B) is below minimum required (${this._minSize.val}B)`
          }
        ]
      };
    }

    if (
      this._allowedTypes &&
      !matchesFileType(value.name, value.type, this._allowedTypes.patterns)
    ) {
      return {
        success: false,
        issues: [
          {
            path,
            message:
              this._allowedTypes.msg ||
              `File type "${value.type || value.name}" does not match allowed patterns: ${Array.isArray(this._allowedTypes.patterns) ? this._allowedTypes.patterns.join(", ") : this._allowedTypes.patterns}`
          }
        ]
      };
    }

    return { success: true, data: value };
  }
}

export class BlobSchema extends Schema<Blob> {
  private _isOptional = false;
  private _maxSize?: { val: number; msg?: string };
  private _minSize?: { val: number; msg?: string };
  private _allowedTypes?: { patterns: string | string[]; msg?: string };

  constructor(options: FileValidationOptions = {}) {
    super();
    if (options.maxSize !== undefined) this._maxSize = { val: options.maxSize };
    if (options.minSize !== undefined) this._minSize = { val: options.minSize };
    if (options.type !== undefined) this._allowedTypes = { patterns: options.type };
  }

  optional(): Schema<Blob | undefined> {
    this._isOptional = true;
    return this as any;
  }

  max(size: number, msg?: string): this {
    this._maxSize = { val: size, msg };
    return this;
  }

  min(size: number, msg?: string): this {
    this._minSize = { val: size, msg };
    return this;
  }

  type(types: string | string[], msg?: string): this {
    this._allowedTypes = { patterns: types, msg };
    return this;
  }

  validate(value: unknown, path = ""): ValidationResult<Blob> {
    if (value === undefined || value === null) {
      if (this._isOptional) return { success: true, data: undefined as any };
      return { success: false, issues: [{ path, message: "Blob is required" }] };
    }

    if (!isBlobLike(value)) {
      return { success: false, issues: [{ path, message: "Expected a Blob object" }] };
    }

    if (this._maxSize && value.size > this._maxSize.val) {
      return {
        success: false,
        issues: [
          {
            path,
            message:
              this._maxSize.msg ||
              `Blob size (${value.size}B) exceeds maximum allowed (${this._maxSize.val}B)`
          }
        ]
      };
    }

    if (this._minSize && value.size < this._minSize.val) {
      return {
        success: false,
        issues: [
          {
            path,
            message:
              this._minSize.msg ||
              `Blob size (${value.size}B) is below minimum required (${this._minSize.val}B)`
          }
        ]
      };
    }

    if (this._allowedTypes && !matchesFileType("", value.type, this._allowedTypes.patterns)) {
      return {
        success: false,
        issues: [
          {
            path,
            message:
              this._allowedTypes.msg ||
              `Blob type "${value.type}" does not match allowed patterns: ${Array.isArray(this._allowedTypes.patterns) ? this._allowedTypes.patterns.join(", ") : this._allowedTypes.patterns}`
          }
        ]
      };
    }

    return { success: true, data: value };
  }
}

export class FormDataSchema extends Schema<FormData> {
  private _isOptional = false;

  optional(): Schema<FormData | undefined> {
    this._isOptional = true;
    return this as any;
  }

  validate(value: unknown, path = ""): ValidationResult<FormData> {
    if (value === undefined || value === null) {
      if (this._isOptional) return { success: true, data: undefined as any };
      return { success: false, issues: [{ path, message: "FormData is required" }] };
    }

    if (value && typeof value === "object" && "__formData" in value) {
      return { success: true, data: (value as any).__formData };
    }

    if (!isFormDataLike(value)) {
      return { success: false, issues: [{ path, message: "Expected a FormData instance" }] };
    }

    return { success: true, data: value as FormData };
  }
}

export function validateWithSchema<T>(
  schema: SchemaLike<T>,
  value: unknown,
  path = ""
): ValidationResult<T> {
  if (!schema) return { success: true, data: value as T };

  if (schema instanceof Schema) {
    return schema.validate(value, path);
  }

  if (typeof schema === "object" && "~standard" in schema) {
    const res = schema["~standard"].validate(value);
    if ("value" in res) {
      return { success: true, data: res.value };
    }
    return {
      success: false,
      issues: res.issues.map((i) => ({
        path: i.path ? i.path.join(".") : path,
        message: i.message
      }))
    };
  }

  if (typeof schema === "function") {
    const res = schema(value);
    if (res === true || res === null || res === undefined) {
      return { success: true, data: value as T };
    }
    if (typeof res === "string") {
      return { success: false, issues: [{ path, message: res }] };
    }
    if (typeof res === "object") {
      return res as ValidationResult<T>;
    }
  }

  return { success: true, data: value as T };
}

/**
 * Built-in schema definition library
 */
export const v = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  record: () => new RecordSchema(),
  any: () => new AnySchema(),
  file: (options?: FileValidationOptions) => new FileSchema(options),
  blob: (options?: FileValidationOptions) => new BlobSchema(options),
  formData: () => new FormDataSchema(),
  object: <S extends Record<string, SchemaLike<any>>>(
    shape: S
  ): ObjectSchema<{ [K in keyof S]: InferSchemaType<S[K]> }> => new ObjectSchema(shape as any)
};
