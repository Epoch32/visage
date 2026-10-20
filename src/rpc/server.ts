import { formatCacheControl, handleConditionalResponse } from "@http";
import { ERROR_CODE_TO_STATUS, RPCError } from "./error";
import { executeProcedure } from "./procedure";
import type { CORSOptions, FetchHandlerOptions, Procedure, Router, RPCResponse } from "./types";

function getCORSHeaders(cors: boolean | CORSOptions | undefined, req: Request): Headers {
  const headers = new Headers();
  if (!cors) return headers;

  const opts: CORSOptions = typeof cors === "object" ? cors : {};
  const originHeader = req.headers.get("origin") ?? "*";

  let allowOrigin: string | null = null;
  if (!opts.origin || opts.origin === "*") {
    allowOrigin = originHeader || "*";
  } else if (originHeader) {
    if (typeof opts.origin === "function") {
      const res = opts.origin(originHeader);
      if (typeof res === "string") allowOrigin = res;
      else if (res) allowOrigin = originHeader;
    } else if (typeof opts.origin === "string") {
      if (opts.origin === originHeader) allowOrigin = originHeader;
    } else if (Array.isArray(opts.origin)) {
      if (opts.origin.includes(originHeader)) allowOrigin = originHeader;
    }
  }

  if (allowOrigin) {
    headers.set("Access-Control-Allow-Origin", allowOrigin);
    if (opts.credentials) {
      headers.set("Access-Control-Allow-Credentials", "true");
    }
    headers.append("Vary", "Origin");
  }
  if (opts.maxAge !== undefined) {
    headers.set("Access-Control-Max-Age", opts.maxAge.toString());
  }

  return headers;
}

function resolveProcedureFromPath(
  router: Router<any, any>,
  path: string
): Procedure<any, any, any, any> {
  const parts = path.split(/[./]/).filter(Boolean);
  let current: any = router._def.record;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (!current || typeof current !== "object") {
      throw new RPCError({
        code: "NOT_FOUND",
        message: `Procedure '${path}' not found`
      });
    }

    if (i === parts.length - 1) {
      if (part in current && "type" in current[part]) {
        return current[part];
      }
      throw new RPCError({
        code: "NOT_FOUND",
        message: `Procedure '${path}' not found`
      });
    }

    if (part in current && "_def" in current[part]) {
      current = current[part]._def.record;
    } else if (part in current && typeof current[part] === "object") {
      current = current[part];
    } else {
      throw new RPCError({
        code: "NOT_FOUND",
        message: `Procedure '${path}' not found`
      });
    }
  }

  throw new RPCError({
    code: "NOT_FOUND",
    message: `Procedure '${path}' not found`
  });
}

export function matchesRulePattern(
  pattern: string,
  urlPath: string,
  procedurePath: string
): boolean {
  if (pattern === "*") return true;

  const cleanUrl = urlPath.replace(/^\/+|\/+$/g, "");
  const cleanPattern = pattern.replace(/^\/+|\/+$/g, "");
  const cleanProc = procedurePath.replace(/^\/+|\/+$/g, "");

  if (
    cleanUrl === cleanPattern ||
    cleanProc === cleanPattern ||
    cleanProc === cleanPattern.replace(/\//g, ".")
  ) {
    return true;
  }

  if (cleanPattern.endsWith("*")) {
    const prefix = cleanPattern.slice(0, -1);
    if (cleanUrl.startsWith(prefix) || cleanProc.startsWith(prefix)) {
      return true;
    }
    const dotPrefix = prefix.replace(/\//g, ".");
    if (cleanProc.startsWith(dotPrefix)) {
      return true;
    }
  }

  try {
    const regexStr = cleanPattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(cleanUrl) || regex.test(cleanProc);
  } catch {
    return false;
  }
}

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
    etag: handlerEtag
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
          const batchResults = await Promise.all(
            body.map(async (item: { id?: string | number; path: string; input?: any }) => {
              try {
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
                const error =
                  err instanceof RPCError
                    ? err
                    : new RPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: err.message ?? "Internal Server Error",
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
        try {
          const body = await request.json();
          rawInput = body && typeof body === "object" && "input" in body ? body.input : body;
        } catch {
          rawInput = undefined;
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

        if (!iterable || typeof (iterable as any)[Symbol.asyncIterator] !== "function") {
          throw new RPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Subscription procedure must return an AsyncIterable"
          });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of iterable) {
                if (request.signal.aborted) break;
                const message = `data: ${JSON.stringify(chunk)}\n\n`;
                controller.enqueue(encoder.encode(message));
              }
              controller.close();
            } catch (err: any) {
              const errorMessage = `event: error\ndata: ${JSON.stringify({ message: err.message ?? "Stream error" })}\n\n`;
              controller.enqueue(encoder.encode(errorMessage));
              controller.close();
            }
          },
          cancel() {
            if (typeof (iterable as any).return === "function") {
              (iterable as any).return();
            }
          }
        });

        baseHeaders.set("Content-Type", "text/event-stream; charset=utf-8");
        baseHeaders.set("Cache-Control", "no-cache, no-transform");
        baseHeaders.set("Connection", "keep-alive");

        return new Response(stream, {
          status: 200,
          headers: baseHeaders
        });
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
      const error =
        err instanceof RPCError
          ? err
          : new RPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: err.message ?? "Internal Server Error",
              cause: err
            });

      onError?.({ error, path: procedurePath, req: request });

      const responsePayload: RPCResponse = {
        error: {
          code: error.code,
          message: error.message,
          issues: error.issues
        }
      };

      baseHeaders.set("Content-Type", "application/json");
      return new Response(JSON.stringify(responsePayload), {
        status: ERROR_CODE_TO_STATUS[error.code] ?? 500,
        headers: baseHeaders
      });
    }
  };
}
