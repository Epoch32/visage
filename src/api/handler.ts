/**
 * Visage Web Standard API Fetch Handler & Request Dispatcher
 */
import { validateWithSchema } from "@form/schema";
import {
  createProblemResponse,
  formatCacheControl,
  formatValidationIssues,
  getHttpStatusTitle,
  handleConditionalResponse,
  type ProblemDetails,
  ProblemError
} from "@http";
import { ERROR_CODE_TO_STATUS, RPCError, STATUS_TO_ERROR_CODE } from "@rpc/error";
import type { RPCErrorCode } from "@rpc/types";
import { buildFileRouter } from "./file-router";
import { executeMiddlewareChain } from "./middleware";
import type { ApiProcedure, ApiRouterConfig, FileRouteModule, RouteMatch } from "./types";

/**
 * Determine if client or server configuration prefers RFC 9457 Problem Details
 */
function wantsProblemDetails(req: Request, config?: ApiRouterConfig): boolean {
  if (config?.problemDetails === true) return true;
  if (config?.problemDetails === false) return false;
  return Boolean(req.headers.get("Accept")?.includes("application/problem+json"));
}

/**
 * Helper to emit a response with RFC 9457 problem fields and backwards-compatible envelopes
 */
function formatErrorResponse(
  req: Request,
  config: ApiRouterConfig,
  problem: ProblemDetails,
  legacyPayload?: Record<string, unknown>
): Response {
  const isProblemNegotiated = wantsProblemDetails(req, config);
  const status = problem.status ?? 500;

  const combinedPayload = {
    ...problem,
    ...legacyPayload
  };

  if (isProblemNegotiated) {
    return createProblemResponse(combinedPayload, { status });
  }

  return new Response(JSON.stringify(combinedPayload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Check whether origin matches configured CORS policy and return allowed origin string or null
 */
function resolveAllowedOrigin(
  reqOrigin: string | null,
  configOrigin?: NonNullable<ApiRouterConfig["cors"]>["origin"],
  credentials?: boolean
): string | null {
  if (!configOrigin || configOrigin === "*") {
    // If credentials are enabled, wildcard or blind reflection is unsafe
    if (credentials) {
      return null;
    }
    return reqOrigin || "*";
  }
  if (!reqOrigin) {
    return null;
  }
  if (typeof configOrigin === "function") {
    return configOrigin(reqOrigin) ? reqOrigin : null;
  }
  if (Array.isArray(configOrigin)) {
    return configOrigin.includes(reqOrigin) ? reqOrigin : null;
  }
  if (configOrigin === reqOrigin) {
    return reqOrigin;
  }
  return null;
}

/**
 * Handle CORS preflight & headers
 */
function handleCors(req: Request, config?: ApiRouterConfig["cors"]): Response | null {
  if (!config) return null;

  const reqOrigin = req.headers.get("Origin");
  const allowedOrigin = resolveAllowedOrigin(reqOrigin, config.origin, config.credentials);

  if (req.method === "OPTIONS") {
    const headers = new Headers();
    if (allowedOrigin) {
      headers.set("Access-Control-Allow-Origin", allowedOrigin);
      if (config.credentials) {
        headers.set("Access-Control-Allow-Credentials", "true");
      }
      headers.append("Vary", "Origin");
    }
    headers.set(
      "Access-Control-Allow-Methods",
      (config.methods || ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]).join(", ")
    );
    headers.set(
      "Access-Control-Allow-Headers",
      (config.allowedHeaders || ["Content-Type", "Authorization", "x-visage-rpc"]).join(", ")
    );
    if (config.maxAge) {
      headers.set("Access-Control-Max-Age", config.maxAge.toString());
    }
    return new Response(null, { status: 204, headers });
  }

  return null;
}

function applyCorsHeaders(res: Response, req: Request, config?: ApiRouterConfig["cors"]): Response {
  if (!config) return res;
  const reqOrigin = req.headers.get("Origin");
  const allowedOrigin = resolveAllowedOrigin(reqOrigin, config.origin, config.credentials);

  if (allowedOrigin) {
    res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    if (config.credentials) {
      res.headers.set("Access-Control-Allow-Credentials", "true");
    }
    res.headers.append("Vary", "Origin");
  }
  return res;
}

/**
 * Create a standard Web Fetch API handler from compiled route manifests
 */
export function createApiHandler(
  routes: RouteMatch[],
  config: ApiRouterConfig = {}
): (req: Request) => Promise<Response> {
  const prefix = config.prefix ? `/${config.prefix.replace(/^\/+|\/+$/g, "")}` : "";

  return async (req: Request): Promise<Response> => {
    // 1. CORS Preflight Check
    const corsPreflight = handleCors(req, config.cors);
    if (corsPreflight) return corsPreflight;

    const url = new URL(req.url);
    let pathname = url.pathname;

    if (prefix && pathname.startsWith(prefix)) {
      pathname = pathname.slice(prefix.length) || "/";
    }

    // 2. Route Matching
    let matchedRoute: RouteMatch | null = null;
    const pathParams: Record<string, string> = Object.create(null);

    try {
      for (const route of routes) {
        const match = pathname.match(route.pattern);
        if (match) {
          matchedRoute = route;
          route.paramNames.forEach((name, i) => {
            if (name === "__proto__" || name === "constructor" || name === "prototype") return;
            pathParams[name] = decodeURIComponent(match[i + 1] || "");
          });
          break;
        }
      }
    } catch {
      const problem: ProblemDetails = {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Malformed percent-encoded URI path parameter",
        instance: pathname,
        code: "BAD_REQUEST"
      };
      return applyCorsHeaders(
        formatErrorResponse(req, config, problem, {
          ok: false,
          error: { code: "BAD_REQUEST", message: "Malformed percent-encoded URI path parameter" }
        }),
        req,
        config.cors
      );
    }

    if (!matchedRoute) {
      const problem: ProblemDetails = {
        type: "about:blank",
        title: "Not Found",
        status: 404,
        detail: `Route not found: ${pathname}`,
        instance: pathname,
        code: "NOT_FOUND"
      };
      return applyCorsHeaders(
        formatErrorResponse(req, config, problem, {
          ok: false,
          error: { code: "NOT_FOUND", message: `Route not found: ${pathname}` }
        }),
        req,
        config.cors
      );
    }

    try {
      const method = req.method.toUpperCase();
      let procedure: ApiProcedure | undefined;

      if (method === "GET" || method === "HEAD") {
        procedure =
          matchedRoute.procedures.HEAD ||
          matchedRoute.procedures.head ||
          matchedRoute.procedures.GET ||
          matchedRoute.procedures.get;
      } else if (method === "POST") {
        procedure = matchedRoute.procedures.POST || matchedRoute.procedures.post;
      } else if (method === "PUT") {
        procedure = matchedRoute.procedures.PUT || matchedRoute.procedures.put;
      } else if (method === "DELETE") {
        procedure =
          matchedRoute.procedures.DELETE ||
          matchedRoute.procedures.del ||
          matchedRoute.procedures.delete;
      } else if (method === "PATCH") {
        procedure = matchedRoute.procedures.PATCH || matchedRoute.procedures.patch;
      }

      if (!procedure && matchedRoute.procedures.default) {
        const defaultProc = matchedRoute.procedures.default;
        if (defaultProc.type === "mutation") {
          if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
            procedure = defaultProc;
          }
        } else if (defaultProc.type === "subscription") {
          if (method === "GET" || method === "HEAD") {
            procedure = defaultProc;
          }
        } else if (defaultProc.type === "query") {
          if (method === "GET" || method === "HEAD") {
            procedure = defaultProc;
          }
        } else {
          procedure = defaultProc;
        }
      }

      // 3. Execute Middleware Chain (File-level + Procedure-level)
      const mwFns = [
        ...matchedRoute.middlewares.map((m) => m.fn),
        ...(procedure?.middlewares || [])
      ];

      const { response: earlyResponse, ctx } = await executeMiddlewareChain(
        mwFns,
        req,
        url,
        pathParams
      );

      if (earlyResponse) {
        return applyCorsHeaders(earlyResponse, req, config.cors);
      }

      // 4. Custom Raw Handler
      if (matchedRoute.handler) {
        const res = await matchedRoute.handler(req, ctx);
        if (config.etag !== false && (method === "GET" || method === "HEAD")) {
          const conditionalRes = await handleConditionalResponse(req, res, {
            cacheControl: config.cache
          });
          return applyCorsHeaders(conditionalRes, req, config.cors);
        }
        return applyCorsHeaders(res, req, config.cors);
      }

      if (!procedure) {
        const problem: ProblemDetails = {
          type: "about:blank",
          title: "Method Not Allowed",
          status: 405,
          detail: `Method ${method} not allowed on ${pathname}`,
          instance: pathname,
          code: "METHOD_NOT_ALLOWED"
        };
        return applyCorsHeaders(
          formatErrorResponse(req, config, problem, {
            ok: false,
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: `Method ${method} not allowed on ${pathname}`
            }
          }),
          req,
          config.cors
        );
      }

      if (procedure.type === "mutation" && (method === "GET" || method === "HEAD")) {
        const problem: ProblemDetails = {
          type: "about:blank",
          title: "Method Not Allowed",
          status: 405,
          detail: `Method ${method} not allowed for mutation procedure on ${pathname}`,
          instance: pathname,
          code: "METHOD_NOT_ALLOWED"
        };
        return applyCorsHeaders(
          formatErrorResponse(req, config, problem, {
            ok: false,
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: `Method ${method} not allowed for mutation procedure on ${pathname}`
            }
          }),
          req,
          config.cors
        );
      }

      if (procedure.type === "subscription" && method !== "GET" && method !== "HEAD") {
        const problem: ProblemDetails = {
          type: "about:blank",
          title: "Method Not Allowed",
          status: 405,
          detail: `Method ${method} not allowed for subscription procedure on ${pathname}`,
          instance: pathname,
          code: "METHOD_NOT_ALLOWED"
        };
        return applyCorsHeaders(
          formatErrorResponse(req, config, problem, {
            ok: false,
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: `Method ${method} not allowed for subscription procedure on ${pathname}`
            }
          }),
          req,
          config.cors
        );
      }

      // Parse Input
      let rawInput: any = {};
      if (method === "GET" || method === "HEAD") {
        const inputQuery = url.searchParams.get("input");
        if (inputQuery) {
          try {
            rawInput = JSON.parse(inputQuery);
          } catch {
            rawInput = inputQuery;
          }
        } else {
          // Flatten searchParams
          const spObj: Record<string, string> = {};
          url.searchParams.forEach((val, key) => {
            spObj[key] = val;
          });
          if (Object.keys(spObj).length > 0) {
            rawInput = spObj;
          }
        }
      } else {
        const contentType =
          req.headers.get("Content-Type") || req.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            rawInput = await req.json();
          } catch {
            rawInput = {};
          }
        } else if (
          contentType.includes("multipart/form-data") ||
          contentType.includes("application/x-www-form-urlencoded")
        ) {
          try {
            const formData = await req.formData();
            const parsedObj: Record<string, any> = {};
            const keys = new Set<string>();
            formData.forEach((_, k) => {
              keys.add(k);
            });
            for (const k of keys) {
              const all = formData.getAll(k);
              if (all.length > 1) {
                parsedObj[k] = all;
              } else {
                const val = all[0];
                if (typeof val === "string") {
                  try {
                    parsedObj[k] = JSON.parse(val);
                  } catch {
                    parsedObj[k] = val;
                  }
                } else {
                  parsedObj[k] = val;
                }
              }
            }
            rawInput = Object.assign(parsedObj, { __formData: formData });
          } catch {
            rawInput = {};
          }
        } else if (contentType.includes("application/octet-stream")) {
          try {
            rawInput = await req.arrayBuffer();
          } catch {
            rawInput = {};
          }
        }
      }

      // Merge Path Params into Input if object
      if (typeof rawInput === "object" && rawInput !== null) {
        rawInput = { ...pathParams, ...rawInput };
      }

      // Validate Input Schema
      let validatedInput = rawInput;
      if (procedure.options.input) {
        const validation = await validateWithSchema(procedure.options.input, rawInput);
        if (!validation.success) {
          const invalidParams = formatValidationIssues(validation.issues || []);
          const problem: ProblemDetails = {
            type: "about:blank",
            title: "Bad Request",
            status: 400,
            detail: "Validation Error",
            instance: pathname,
            code: "BAD_REQUEST",
            invalidParams,
            issues: validation.issues
          };
          return applyCorsHeaders(
            formatErrorResponse(req, config, problem, {
              ok: false,
              error: {
                code: "BAD_REQUEST",
                message: "Validation Error",
                issues: validation.issues
              }
            }),
            req,
            config.cors
          );
        }
        validatedInput = validation.data;
      }

      // Run Procedure
      if (procedure.type === "subscription") {
        // SSE Real-time Streaming
        const generator = procedure.options.resolve({
          input: validatedInput,
          ctx,
          req,
          params: pathParams
        }) as AsyncGenerator<any, void, unknown>;

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            try {
              for await (const chunk of generator) {
                const payload = `data: ${JSON.stringify(chunk)}\n\n`;
                controller.enqueue(encoder.encode(payload));
              }
              controller.close();
            } catch (err: any) {
              controller.error(err);
            }
          }
        });

        const sseRes = new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive"
          }
        });
        return applyCorsHeaders(sseRes, req, config.cors);
      }

      const result = await procedure.options.resolve({
        input: validatedInput,
        ctx,
        req,
        params: pathParams
      });

      const successRes = new Response(JSON.stringify({ ok: true, data: result }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

      if (config.etag !== false && (method === "GET" || method === "HEAD")) {
        const conditionalRes = await handleConditionalResponse(req, successRes, {
          cacheControl: procedure.options.cache ?? config.cache
        });
        return applyCorsHeaders(conditionalRes, req, config.cors);
      }

      if (procedure.options.cache ?? config.cache) {
        successRes.headers.set(
          "Cache-Control",
          formatCacheControl(procedure.options.cache ?? config.cache)
        );
      }

      if (method === "HEAD") {
        return applyCorsHeaders(
          new Response(null, {
            status: successRes.status,
            statusText: successRes.statusText,
            headers: successRes.headers
          }),
          req,
          config.cors
        );
      }

      return applyCorsHeaders(successRes, req, config.cors);
    } catch (err: any) {
      if (config.onError) {
        const customRes = await config.onError(err, req);
        return applyCorsHeaders(customRes, req, config.cors);
      }

      if (err instanceof ProblemError) {
        const problem = err.problem;
        const legacyPayload = {
          ok: false,
          error: {
            code:
              (problem.code as string) ||
              STATUS_TO_ERROR_CODE[err.status] ||
              "INTERNAL_SERVER_ERROR",
            message: err.message
          }
        };
        return applyCorsHeaders(
          formatErrorResponse(
            req,
            config,
            { ...problem, instance: problem.instance ?? pathname },
            legacyPayload
          ),
          req,
          config.cors
        );
      }

      if (err instanceof RPCError) {
        const problem = err.toProblemDetails(pathname);
        const legacyPayload = {
          ok: false,
          error: {
            code: err.code,
            message: err.message,
            issues: err.issues
          }
        };
        return applyCorsHeaders(
          formatErrorResponse(req, config, problem, legacyPayload),
          req,
          config.cors
        );
      }

      const statusCode =
        ERROR_CODE_TO_STATUS[err?.code as keyof typeof ERROR_CODE_TO_STATUS] || 500;
      const code = (err?.code as RPCErrorCode) || "INTERNAL_SERVER_ERROR";
      const message = err?.message || "Internal Server Error";

      const problem: ProblemDetails = {
        type: "about:blank",
        title: getHttpStatusTitle(statusCode),
        status: statusCode,
        detail: message,
        instance: pathname,
        code
      };

      const legacyPayload = {
        ok: false,
        error: { code, message }
      };

      return applyCorsHeaders(
        formatErrorResponse(req, config, problem, legacyPayload),
        req,
        config.cors
      );
    }
  };
}

function isApiRouterConfig(val: unknown): val is ApiRouterConfig {
  if (!val || typeof val !== "object") return false;
  const keys = Object.keys(val);
  return keys.some((k) =>
    ["prefix", "cors", "cache", "etag", "problemDetails", "onError"].includes(k)
  );
}

/**
 * High-level createApi factory for file-based API routers
 */
export function createApi(
  files: Record<string, FileRouteModule | { default?: any; [key: string]: any }>,
  sourceMapOrConfig?: Record<string, string> | ApiRouterConfig,
  maybeConfig?: ApiRouterConfig
) {
  const isConfigSecondArg = isApiRouterConfig(sourceMapOrConfig);

  const sourceMap = isConfigSecondArg ? {} : (sourceMapOrConfig as Record<string, string>) || {};

  const config = maybeConfig || (isConfigSecondArg ? (sourceMapOrConfig as ApiRouterConfig) : {});

  const routes = buildFileRouter(files, sourceMap);
  const fetchHandler = createApiHandler(routes, config);

  return {
    routes,
    fetch: fetchHandler
  };
}
