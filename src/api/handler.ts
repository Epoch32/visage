/**
 * Visage Web Standard API Fetch Handler & Request Dispatcher
 */
import { validateWithSchema } from "../form/schema";
import { ERROR_CODE_TO_STATUS, RPCError } from "../rpc/error";
import { buildFileRouter } from "./file-router";
import { executeMiddlewareChain } from "./middleware";
import type { ApiProcedure, ApiRouterConfig, FileRouteModule, RouteMatch } from "./types";

/**
 * Check whether origin matches configured CORS policy and return allowed origin string or null
 */
function resolveAllowedOrigin(
  reqOrigin: string | null,
  configOrigin?: NonNullable<ApiRouterConfig["cors"]>["origin"]
): string | null {
  if (!configOrigin || configOrigin === "*") {
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
  const allowedOrigin = resolveAllowedOrigin(reqOrigin, config.origin);

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
  const allowedOrigin = resolveAllowedOrigin(reqOrigin, config.origin);

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
    const pathParams: Record<string, string> = {};

    for (const route of routes) {
      const match = pathname.match(route.pattern);
      if (match) {
        matchedRoute = route;
        route.paramNames.forEach((name, i) => {
          pathParams[name] = decodeURIComponent(match[i + 1] || "");
        });
        break;
      }
    }

    if (!matchedRoute) {
      return applyCorsHeaders(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "NOT_FOUND", message: `Route not found: ${pathname}` }
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        ),
        req,
        config.cors
      );
    }

    try {
      const method = req.method.toUpperCase();
      let procedure: ApiProcedure | undefined = matchedRoute.procedures.default;

      if (!procedure) {
        if (method === "GET") {
          procedure = matchedRoute.procedures.GET || matchedRoute.procedures.get;
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
        return applyCorsHeaders(res, req, config.cors);
      }

      if (!procedure) {
        return applyCorsHeaders(
          new Response(
            JSON.stringify({
              ok: false,
              error: {
                code: "METHOD_NOT_ALLOWED",
                message: `Method ${method} not allowed on ${pathname}`
              }
            }),
            { status: 405, headers: { "Content-Type": "application/json" } }
          ),
          req,
          config.cors
        );
      }

      // Parse Input
      let rawInput: any = {};
      if (method === "GET") {
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
        const contentType = req.headers.get("Content-Type") || "";
        if (contentType.includes("application/json")) {
          try {
            rawInput = await req.json();
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
          return applyCorsHeaders(
            new Response(
              JSON.stringify({
                ok: false,
                error: {
                  code: "BAD_REQUEST",
                  message: "Validation Error",
                  issues: validation.issues
                }
              }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            ),
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
      return applyCorsHeaders(successRes, req, config.cors);
    } catch (err: any) {
      if (config.onError) {
        const customRes = await config.onError(err, req);
        return applyCorsHeaders(customRes, req, config.cors);
      }

      const statusCode =
        err instanceof RPCError
          ? err.statusCode
          : ERROR_CODE_TO_STATUS[err?.code as keyof typeof ERROR_CODE_TO_STATUS] || 500;

      const code = err instanceof RPCError ? err.code : "INTERNAL_SERVER_ERROR";
      const message = err?.message || "Internal Server Error";

      const errRes = new Response(JSON.stringify({ ok: false, error: { code, message } }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" }
      });
      return applyCorsHeaders(errRes, req, config.cors);
    }
  };
}

/**
 * High-level createApi factory for file-based API routers
 */
export function createApi(
  files: Record<string, FileRouteModule | { default?: any; [key: string]: any }>,
  sourceMapOrConfig?: Record<string, string> | ApiRouterConfig,
  maybeConfig?: ApiRouterConfig
) {
  const sourceMap =
    sourceMapOrConfig && !("prefix" in sourceMapOrConfig) && !("cors" in sourceMapOrConfig)
      ? (sourceMapOrConfig as Record<string, string>)
      : {};

  const config =
    maybeConfig ||
    (sourceMapOrConfig && ("prefix" in sourceMapOrConfig || "cors" in sourceMapOrConfig)
      ? (sourceMapOrConfig as ApiRouterConfig)
      : {});

  const routes = buildFileRouter(files, sourceMap);
  const fetchHandler = createApiHandler(routes, config);

  return {
    routes,
    fetch: fetchHandler
  };
}
