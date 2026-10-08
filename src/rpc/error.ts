import type { ValidationIssue } from "../form/schema";
import type { RPCErrorCode } from "./types";

export const ERROR_CODE_TO_STATUS: Record<RPCErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  TIMEOUT: 408,
  CONFLICT: 409,
  UNPROCESSABLE_CONTENT: 422,
  INTERNAL_SERVER_ERROR: 500
};

export const STATUS_TO_ERROR_CODE: Record<number, RPCErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  408: "TIMEOUT",
  409: "CONFLICT",
  422: "UNPROCESSABLE_CONTENT",
  500: "INTERNAL_SERVER_ERROR"
};

export class RPCError extends Error {
  readonly code: RPCErrorCode;
  readonly status: number;
  readonly issues?: ValidationIssue[];

  constructor(options: {
    code: RPCErrorCode;
    message?: string;
    issues?: ValidationIssue[];
    cause?: unknown;
  }) {
    super(options.message ?? options.code, { cause: options.cause });
    this.name = "RPCError";
    this.code = options.code;
    this.status = ERROR_CODE_TO_STATUS[options.code] ?? 500;
    this.issues = options.issues;
  }
}
