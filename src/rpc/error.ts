import type { ValidationIssue } from "@form/schema";
import { HTTP_STATUS_TITLES, type ProblemDetails } from "@http";
import type { RPCErrorCode } from "./types";

export const ERROR_CODE_TO_STATUS: Record<RPCErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  TIMEOUT: 408,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
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
  413: "PAYLOAD_TOO_LARGE",
  422: "UNPROCESSABLE_CONTENT",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR"
};

export class RPCError extends Error {
  readonly code: RPCErrorCode;
  readonly status: number;
  readonly issues?: ValidationIssue[];
  readonly problem?: ProblemDetails;

  constructor(
    codeOrStatusOrOptions:
      | RPCErrorCode
      | number
      | {
          code: RPCErrorCode;
          message?: string;
          issues?: ValidationIssue[];
          cause?: unknown;
          problem?: ProblemDetails;
        },
    message?: string
  ) {
    if (typeof codeOrStatusOrOptions === "number") {
      const code = STATUS_TO_ERROR_CODE[codeOrStatusOrOptions] || "INTERNAL_SERVER_ERROR";
      super(message || code);
      this.name = "RPCError";
      this.code = code;
      this.status = codeOrStatusOrOptions;
    } else if (typeof codeOrStatusOrOptions === "string") {
      super(message || codeOrStatusOrOptions);
      this.name = "RPCError";
      this.code = codeOrStatusOrOptions;
      this.status = ERROR_CODE_TO_STATUS[codeOrStatusOrOptions] || 500;
    } else {
      super(codeOrStatusOrOptions.message ?? codeOrStatusOrOptions.code, {
        cause: codeOrStatusOrOptions.cause
      });
      this.name = "RPCError";
      this.code = codeOrStatusOrOptions.code;
      this.status = ERROR_CODE_TO_STATUS[codeOrStatusOrOptions.code] ?? 500;
      this.issues = codeOrStatusOrOptions.issues;
      this.problem = codeOrStatusOrOptions.problem;
    }
  }

  get statusCode(): number {
    return this.status;
  }

  /**
   * Convert error to an RFC 9457 Problem Details object
   */
  toProblemDetails(instance?: string): ProblemDetails {
    if (this.problem) {
      return {
        ...this.problem,
        ...(instance && !this.problem.instance ? { instance } : {})
      };
    }

    const invalidParams = this.issues?.map((issue) => {
      const path = Array.isArray(issue.path)
        ? issue.path
        : typeof issue.path === "string"
          ? [issue.path]
          : [];
      const name = Array.isArray(issue.path) ? issue.path.join(".") : String(issue.path || "");
      const reason = issue.message || String((issue as any).reason || "");
      return {
        name,
        reason,
        path
      };
    });

    return {
      type: "about:blank",
      title: HTTP_STATUS_TITLES[this.status] ?? this.code,
      status: this.status,
      detail: this.message,
      ...(instance ? { instance } : {}),
      code: this.code,
      ...(this.issues?.length ? { issues: this.issues } : {}),
      ...(invalidParams?.length ? { invalidParams } : {})
    };
  }

  /**
   * Construct an RPCError from an RFC 9457 Problem Details representation
   */
  static fromProblem(problem: ProblemDetails): RPCError {
    const status = problem.status ?? 500;
    const code =
      (problem.code as RPCErrorCode) || STATUS_TO_ERROR_CODE[status] || "INTERNAL_SERVER_ERROR";

    const issues =
      (problem.issues as ValidationIssue[]) ||
      (Array.isArray(problem.invalidParams)
        ? problem.invalidParams.map((p) => ({
            path: Array.isArray(p.path)
              ? p.path
              : typeof p.path === "string"
                ? p.path.split(".").filter(Boolean)
                : (p.name || "").split(".").filter(Boolean),
            message: p.reason || String(p.message || "")
          }))
        : undefined);

    return new RPCError({
      code,
      message: problem.detail || problem.title || code,
      issues,
      problem
    });
  }
}
