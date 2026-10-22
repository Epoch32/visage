import { formatCacheControl, handleConditionalResponse, matchesRulePattern } from "@http";
import { getCORSHeaders } from "./cors";
import { ERROR_CODE_TO_STATUS, RPCError } from "./error";
import { executeProcedure } from "./procedure";
import { resolveProcedureFromPath } from "./resolver";
import { createSubscriptionResponse } from "./subscription";
import type { FetchHandlerOptions, Router, RPCResponse } from "./types";

export { matchesRulePattern };

export function createFetchHandler<TRouter extends Router<any, any>, TContext = any>(
  options: FetchHandlerOptions<TRouter, TContext>
): (request: Request, ...extra: any[]) => Promise<Response> {
  const {
    router,
    endpoint = "",
    createContext,
    onError,
    cors = true,
    securityHeaders = true,
    rules,
    cache: handlerCache,
    etag: handlerEtag,
    problemDetails: handlerProblemDetails,
    maxBatchSize = 50,
    maxBodySize = 10 * 1024 * 1024
  } = options;

  return async (request: Request, ...extra: any[]): Promise<Response> => {
    const corsHeaders = getCORSHeaders(cors, request);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const baseHeaders = new Headers(corsHeaders);
    if (securityHeaders) {
      if (typeof securityHeaders === "object") {
        for (const [k, v] of Object.entries(securityHeaders)) {
          baseHeaders.set(k, v);
        }
      } else {
        baseHeaders.set("X-Content-Type-Options", "nosniff");
      }
    }

    // Check payload size limits against Content-Length
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (maxBodySize > 0 && contentLength > maxBodySize) {
      const error = new RPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: `Payload too large (${contentLength} bytes exceeds limit of ${maxBodySize} bytes)`
      });
      baseHeaders.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          error: {
            code: error.code,
            message: error.message
          }
        }),
        {
          status: 413,
          headers: baseHeaders
        }
      );
    }

    const url = new URL(request.url);
    let pathname = url.pathname;
    if (endpoint && pathname.startsWith(endpoint)) {
      pathname = pathname.slice(endpoint.length);
    }
    pathname = pathname.replace(/^\/+|\/+$/g, "");

    const procedurePath = pathname || url.searchParams.get("procedure") || "";

    let ctx: TContext = {} as TContext;
    try {
      if (createContext) {
        ctx = await createContext({ req: request, extra });
      }
    } catch (err: any) {
      const error =
        err instanceof RPCError
          ? err
          : new RPCError({
              code: "UNAUTHORIZED",
              message: err.message ?? "Context initialization failed",
              cause: err
            });
      onError?.({ error, req: request });
      baseHeaders.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          error: {
            code: error.code,
            message: error.message,
            issues: error.issues
          }
        }),
        {
          status: error.status,
          headers: baseHeaders
        }
      );
    }

    // Evaluate declarative pattern rules
    const rulesList: Array<{ match: string } & import("./types").RouteRule> = [];
    if (rules) {
      if (Array.isArray(rules)) {
        rulesList.push(...rules);
      } else {
        for (const [match, rule] of Object.entries(rules)) {
          rulesList.push({ match, ...rule });
        }
      }
    }

    const matchingRules = rulesList.filter((r) =>
      matchesRulePattern(r.match, url.pathname, procedurePath)
    );

    // Enforce required headers, query parameters, and custom guards from rules
    for (const rule of matchingRules) {
      if (rule.requireHeaders) {
        for (const headerName of rule.requireHeaders) {
          if (!request.headers.get(headerName)) {
            const error = new RPCError({
              code: "UNAUTHORIZED",
              message: `Missing required header '${headerName}' for rule '${rule.match}'`
            });
            onError?.({ error, path: procedurePath, req: request });
            baseHeaders.set("Content-Type", "application/json");
            return new Response(
              JSON.stringify({
                error: {
                  code: error.code,
                  message: error.message
                }
              }),
              {
                status: 401,
                headers: baseHeaders
              }
            );
          }
        }
      }

      if (rule.requireParams) {
        for (const paramName of rule.requireParams) {
          if (!url.searchParams.has(paramName)) {
            const error = new RPCError({
              code: "BAD_REQUEST",
              message: `Missing required query parameter '${paramName}' for rule '${rule.match}'`
            });
            onError?.({ error, path: procedurePath, req: request });
            baseHeaders.set("Content-Type", "application/json");
            return new Response(
              JSON.stringify({
                error: {
                  code: error.code,
                  message: error.message
                }
              }),
              {
                status: 400,
                headers: baseHeaders
              }
            );
          }
        }
      }

      if (rule.guard) {
        try {
          const guardResult = await rule.guard({ req: request, ctx, path: procedurePath });
          if (guardResult === false) {
            throw new RPCError({
              code: "UNAUTHORIZED",
              message: `Access denied by route rule guard for '${rule.match}'`
            });
          }
        } catch (err: any) {
          const error =
            err instanceof RPCError
              ? err
              : new RPCError({
                  code: "UNAUTHORIZED",
                  message: err.message ?? "Unauthorized",
                  cause: err
                });
          onError?.({ error, path: procedurePath, req: request });
          baseHeaders.set("Content-Type", "application/json");
          return new Response(
            JSON.stringify({
              error: {
                code: error.code,
                message: error.message
              }
            }),
            {
              status: error.status,
              headers: baseHeaders
            }
          );
        }
      }

      // Inject custom response headers defined by matching rule
      if (rule.headers) {
        const resHeaders =
          typeof rule.headers === "function" ? await rule.headers(request, ctx) : rule.headers;
        for (const [k, v] of Object.entries(resHeaders)) {
          baseHeaders.set(k, v);
        }
      }

      if (rule.cache) {
        baseHeaders.set("Cache-Control", formatCacheControl(rule.cache));
      }
    }

    // Check for batch execution in POST body
    if (request.method === "POST" && (!pathname || pathname === "batch")) {
      try {
        const body = await request.json();
        if (Array.isArray(body)) {
          if (body.length > maxBatchSize) {
            const error = new RPCError({
              code: "BAD_REQUEST",
              message: `Batch size (${body.length}) exceeds maximum limit (${maxBatchSize})`
            });
            baseHeaders.set("Content-Type", "application/json");
            return new Response(
              JSON.stringify({
                error: {
                  code: error.code,
                  message: error.message
                }
              }),
              {
                status: 400,
                headers: baseHeaders
              }
            );
          }

          const batchResults = await Promise.all(
            body.map(async (item: { id?: string | number; path: string; input?: any }) => {
              try {
                // Enforce route rules and guards for each item in batch
                const itemRules = rulesList.filter((r) =>
                  matchesRulePattern(r.match, url.pathname, item.path)
                );

                for (const rule of itemRules) {
                  if (rule.requireHeaders) {
                    for (const headerName of rule.requireHeaders) {
                      if (!request.headers.get(headerName)) {
                        throw new RPCError({
                          code: "UNAUTHORIZED",
                          message: `Missing required header '${headerName}' for rule '${rule.match}'`
                        });
                      }
                    }
                  }

                  if (rule.guard) {
                    const guardResult = await rule.guard({ req: request, ctx, path: item.path });
                    if (guardResult === false) {
                      throw new RPCError({
                        code: "UNAUTHORIZED",
                        message: `Access denied by route rule guard for '${rule.match}'`
                      });
                    }
                  }
                }

                const proc = resolveProcedureFromPath(router, item.path);
                const data = await executeProcedure(proc, {
                  rawInput: item.input,
                  ctx,
                  req: request,
                  signal: request.signal
                });
                return {
                  id: item.id,
                  result: { data }
                };
              } catch (err: any) {
                const isDev =
                  typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
                const error =
                  err instanceof RPCError
                    ? err
                    : new RPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: isDev
                          ? (err?.message ?? "Internal Server Error")
                          : "Internal Server Error",
                        cause: err
                      });
                onError?.({ error, path: item.path, req: request });
                return {
                  id: item.id,
                  error: {
                    code: error.code,
                    message: error.message,
                    issues: error.issues
                  }
                };
              }
            })
          );

          baseHeaders.set("Content-Type", "application/json");
          return new Response(JSON.stringify(batchResults), {
            status: 200,
            headers: baseHeaders
          });
        }
      } catch (err: any) {
        const error = new RPCError({
          code: "BAD_REQUEST",
          message: "Malformed batch request body",
          cause: err
        });
        baseHeaders.set("Content-Type", "application/json");
        return new Response(
          JSON.stringify({
            error: {
              code: error.code,
              message: error.message
            }
          }),
          {
            status: 400,
            headers: baseHeaders
          }
        );
      }
    }

    try {
      const procedure = resolveProcedureFromPath(router, procedurePath);

      // Verify HTTP method constraints
      if (procedure.type === "mutation" && request.method !== "POST") {
        throw new RPCError({
          code: "METHOD_NOT_ALLOWED",
          message: "Mutations must use POST method"
        });
      }
      if (
        procedure.type === "query" &&
        request.method !== "GET" &&
        request.method !== "HEAD" &&
        request.method !== "POST"
      ) {
        throw new RPCError({
          code: "METHOD_NOT_ALLOWED",
          message: `Queries must use GET, HEAD, or POST method (received ${request.method})`
        });
      }
      if (
        procedure.type === "subscription" &&
        request.method !== "GET" &&
        request.method !== "HEAD"
      ) {
        throw new RPCError({
          code: "METHOD_NOT_ALLOWED",
          message: `Subscriptions must use GET method (received ${request.method})`
        });
      }

      // Parse input
      let rawInput: unknown;
      if (request.method === "GET") {
        const inputParam = url.searchParams.get("input");
        if (inputParam !== null) {
          try {
            rawInput = JSON.parse(inputParam);
          } catch {
            rawInput = inputParam;
          }
        }
      } else if (request.method === "POST") {
        const contentType = request.headers.get("content-type") || "";
        if (
          contentType.includes("multipart/form-data") ||
          contentType.includes("application/x-www-form-urlencoded")
        ) {
          try {
            const formData = await request.formData();
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
            rawInput = undefined;
          }
        } else if (contentType.includes("application/octet-stream")) {
          try {
            rawInput = await request.arrayBuffer();
          } catch {
            rawInput = undefined;
          }
        } else {
          try {
            const body = await request.json();
            rawInput = body && typeof body === "object" && "input" in body ? body.input : body;
          } catch {
            rawInput = undefined;
          }
        }
      }

      // Handle Subscription (Server-Sent Events)
      if (procedure.type === "subscription") {
        const iterable = (await executeProcedure(procedure, {
          rawInput,
          ctx,
          req: request,
          signal: request.signal
        })) as AsyncIterable<any>;

        return createSubscriptionResponse(iterable, request.signal, baseHeaders);
      }

      // Standard Query or Mutation execution
      const data = await executeProcedure(procedure, {
        rawInput,
        ctx,
        req: request,
        signal: request.signal
      });

      const responsePayload: RPCResponse = {
        result: { data }
      };

      baseHeaders.set("Content-Type", "application/json");

      const cacheDirective = procedure.cache ?? handlerCache;
      if (cacheDirective && !baseHeaders.has("Cache-Control")) {
        baseHeaders.set("Cache-Control", formatCacheControl(cacheDirective));
      }

      const res = new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: baseHeaders
      });

      if (
        handlerEtag !== false &&
        (procedure.type === "query" || request.method === "GET" || request.method === "HEAD")
      ) {
        return await handleConditionalResponse(request, res, {
          cacheControl: cacheDirective
        });
      }

      return res;
    } catch (err: any) {
      const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
      const error =
        err instanceof RPCError
          ? err
          : new RPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: isDev ? (err?.message ?? "Internal Server Error") : "Internal Server Error",
              cause: err
            });

      onError?.({ error, path: procedurePath, req: request });

      const problem = error.toProblemDetails(procedurePath);
      const isProblemNegotiated =
        handlerProblemDetails === true ||
        (handlerProblemDetails !== false &&
          Boolean(request.headers.get("Accept")?.includes("application/problem+json")));

      const responsePayload = {
        ...problem,
        error: {
          code: error.code,
          message: error.message,
          issues: error.issues
        }
      };

      baseHeaders.set(
        "Content-Type",
        isProblemNegotiated ? "application/problem+json" : "application/json"
      );
      return new Response(JSON.stringify(responsePayload), {
        status: ERROR_CODE_TO_STATUS[error.code] ?? 500,
        headers: baseHeaders
      });
    }
  };
}
