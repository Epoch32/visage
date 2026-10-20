/**
 * Visage File-Based API Typed Client SDK (visage/api)
 */
import { isProblemDetails, resolveHeaders as resolveHttpHeaders } from "@http";
import { createMutation } from "@query/create-mutation";
import { createQuery } from "@query/create-query";
import { RPCError } from "@rpc/error";
import { matchesRulePattern } from "@rpc/server";
import type {
  ApiCallOptions,
  ApiClient,
  ApiClientOptions,
  ApiSubscriptionCallbacks,
  ApiSubscriptionHandle
} from "./types";

async function resolveHeaders(
  headers?: ApiClientOptions["headers"],
  fullPath = ""
): Promise<Record<string, string>> {
  return resolveHttpHeaders(headers, fullPath, matchesRulePattern);
}

function buildUrl(baseUrl: string, pathSegments: string[], queryParams?: unknown): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = pathSegments.filter(Boolean).join("/");
  let url = cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;

  if (queryParams !== undefined && queryParams !== null) {
    if (typeof queryParams === "object") {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(queryParams as Record<string, any>)) {
        if (v !== undefined && v !== null) {
          if (typeof v === "object") {
            params.set(k, JSON.stringify(v));
          } else {
            params.set(k, String(v));
          }
        }
      }
      const qs = params.toString();
      if (qs) {
        url += `${url.includes("?") ? "&" : "?"}${qs}`;
      }
    } else {
      url += `${url.includes("?") ? "&" : "?"}input=${encodeURIComponent(String(queryParams))}`;
    }
  }

  return url;
}

function createApiProxy(options: ApiClientOptions, path: string[] = []): any {
  const handlerFn = (...args: any[]) => {
    if (args.length > 0) {
      return createApiProxy(options, [...path, String(args[0])]);
    }
    return createApiProxy(options, path);
  };

  return new Proxy(handlerFn, {
    get(_target, prop: string) {
      if (prop === "then") return undefined;

      const fullPath = path.join("/");

      // 1. GET Method
      if (prop === "get") {
        return async (input?: unknown, callOpts?: ApiCallOptions) => {
          const fetchFn = options.fetch ?? globalThis.fetch;
          const url = buildUrl(options.baseUrl, path, input);
          const dynamicHeaders = await resolveHeaders(options.headers, fullPath);
          const headers = {
            Accept: "application/json, application/problem+json",
            ...dynamicHeaders,
            ...callOpts?.headers
          };

          const devtools =
            typeof window !== "undefined" ? (window as any).__VISAGE_DEVTOOLS__ : null;
          const logId = devtools?.logRpcCall({
            id: `api_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            path: fullPath,
            type: "query",
            input
          });

          try {
            const res = await fetchFn(url, {
              method: "GET",
              headers,
              signal: callOpts?.signal
            });

            const contentType = res.headers.get("Content-Type") || "";
            if (
              contentType.includes("application/json") ||
              contentType.includes("application/problem+json")
            ) {
              const body = await res.json();
              if (body && typeof body === "object") {
                if ("ok" in body && !body.ok) {
                  devtools?.updateRpcCall(logId, { status: "error", error: body.error });
                  if (isProblemDetails(body)) {
                    throw RPCError.fromProblem(body);
                  }
                  throw new RPCError({
                    code: body.error?.code || "INTERNAL_SERVER_ERROR",
                    message: body.error?.message || "Request failed",
                    issues: body.error?.issues
                  });
                }
                if (isProblemDetails(body)) {
                  devtools?.updateRpcCall(logId, { status: "error", error: body });
                  throw RPCError.fromProblem(body);
                }
                if ("ok" in body && body.ok) {
                  devtools?.updateRpcCall(logId, { status: "success", response: body.data });
                  return body.data;
                }
              }
              if (!res.ok) {
                throw new Error(`Request failed with status ${res.status}`);
              }
              devtools?.updateRpcCall(logId, { status: "success", response: body });
              return body;
            }

            if (!res.ok) {
              throw new Error(`Request failed with status ${res.status}`);
            }
            const text = await res.text();
            devtools?.updateRpcCall(logId, { status: "success", response: text });
            return text;
          } catch (err) {
            devtools?.updateRpcCall(logId, { status: "error", error: err });
            throw err;
          }
        };
      }

      // 2. Mutations: POST, PUT, PATCH, DELETE
      if (
        prop === "post" ||
        prop === "put" ||
        prop === "patch" ||
        prop === "delete" ||
        prop === "del"
      ) {
        const httpMethod =
          prop === "del" ? "DELETE" : (prop.toUpperCase() as "POST" | "PUT" | "PATCH" | "DELETE");

        return async (body?: unknown, callOpts?: ApiCallOptions) => {
          const fetchFn = options.fetch ?? globalThis.fetch;
          const url = buildUrl(options.baseUrl, path);
          const dynamicHeaders = await resolveHeaders(options.headers, fullPath);
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "application/json, application/problem+json",
            ...dynamicHeaders,
            ...callOpts?.headers
          };

          const devtools =
            typeof window !== "undefined" ? (window as any).__VISAGE_DEVTOOLS__ : null;
          const logId = devtools?.logRpcCall({
            id: `api_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            path: fullPath,
            type: "mutation",
            input: body
          });

          try {
            const res = await fetchFn(url, {
              method: httpMethod,
              headers,
              body: body !== undefined ? JSON.stringify(body) : undefined,
              signal: callOpts?.signal
            });

            const contentType = res.headers.get("Content-Type") || "";
            if (
              contentType.includes("application/json") ||
              contentType.includes("application/problem+json")
            ) {
              const resBody = await res.json();
              if (resBody && typeof resBody === "object") {
                if ("ok" in resBody && !resBody.ok) {
                  devtools?.updateRpcCall(logId, { status: "error", error: resBody.error });
                  if (isProblemDetails(resBody)) {
                    throw RPCError.fromProblem(resBody);
                  }
                  throw new RPCError({
                    code: resBody.error?.code || "INTERNAL_SERVER_ERROR",
                    message: resBody.error?.message || "Request failed",
                    issues: resBody.error?.issues
                  });
                }
                if (isProblemDetails(resBody)) {
                  devtools?.updateRpcCall(logId, { status: "error", error: resBody });
                  throw RPCError.fromProblem(resBody);
                }
                if ("ok" in resBody && resBody.ok) {
                  devtools?.updateRpcCall(logId, { status: "success", response: resBody.data });
                  return resBody.data;
                }
              }
              if (!res.ok) {
                throw new Error(`Request failed with status ${res.status}`);
              }
              devtools?.updateRpcCall(logId, { status: "success", response: resBody });
              return resBody;
            }

            if (!res.ok) {
              throw new Error(`Request failed with status ${res.status}`);
            }
            const text = await res.text();
            devtools?.updateRpcCall(logId, { status: "success", response: text });
            return text;
          } catch (err) {
            devtools?.updateRpcCall(logId, { status: "error", error: err });
            throw err;
          }
        };
      }

      // 3. SSE Subscriptions
      if (prop === "subscribe") {
        return (input: unknown, callbacks: ApiSubscriptionCallbacks): ApiSubscriptionHandle => {
          const fetchFn = options.fetch ?? globalThis.fetch;
          const url = buildUrl(options.baseUrl, path, input);
          const controller = new AbortController();

          const devtools =
            typeof window !== "undefined" ? (window as any).__VISAGE_DEVTOOLS__ : null;
          const logId = devtools?.logRpcCall({
            id: `api_sse_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            path: fullPath,
            type: "subscription",
            input
          });

          (async () => {
            try {
              const dynamicHeaders = await resolveHeaders(options.headers, fullPath);
              const headers = {
                Accept: "text/event-stream",
                ...dynamicHeaders
              };

              const res = await fetchFn(url, {
                method: "GET",
                headers,
                signal: controller.signal
              });

              if (!res.ok || !res.body) {
                throw new Error(`SSE stream failed with status ${res.status}`);
              }

              const reader = res.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith("data:")) {
                    const jsonStr = trimmed.slice(5).trim();
                    try {
                      const parsed = JSON.parse(jsonStr);
                      devtools?.logRpcEvent(logId, parsed);
                      callbacks.onData(parsed);
                    } catch (parseErr) {
                      devtools?.updateRpcCall(logId, { status: "error", error: parseErr });
                      callbacks.onError?.(parseErr);
                    }
                  } else if (trimmed.startsWith("event: error")) {
                    devtools?.updateRpcCall(logId, { status: "error" });
                    callbacks.onError?.(new Error("Server SSE error"));
                  }
                }
              }

              callbacks.onComplete?.();
            } catch (err: any) {
              if (!controller.signal.aborted) {
                callbacks.onError?.(err);
              }
            }
          })();

          return {
            unsubscribe: () => {
              controller.abort();
            }
          };
        };
      }

      // 4. Query Signals Integration
      if (prop === "queryKey") {
        return (input?: unknown) => {
          const resolved = typeof input === "function" ? (input as () => unknown)() : input;
          const key: unknown[] = [...path];
          if (resolved !== undefined) key.push(resolved);
          return key;
        };
      }

      if (prop === "queryOptions") {
        return (input?: unknown, extra?: Record<string, unknown>) => {
          const resolved = typeof input === "function" ? (input as () => unknown)() : input;
          const key: unknown[] = [...path];
          if (resolved !== undefined) key.push(resolved);
          return {
            queryKey: key,
            queryFn: ({ signal }: { signal: AbortSignal }) => {
              const proxy = createApiProxy(options, path);
              return proxy.get(resolved, { signal });
            },
            ...extra
          };
        };
      }

      if (prop === "createQuery" || prop === "useQuery") {
        return (input?: unknown, extra?: Record<string, unknown>) => {
          const proxy = createApiProxy(options, path);
          return createQuery(() => proxy.queryOptions(input, extra));
        };
      }

      // 5. Mutation Signals Integration
      if (prop === "mutationKey") {
        return () => [...path];
      }

      if (prop === "mutationOptions") {
        return (extra?: Record<string, unknown>) => {
          return {
            mutationKey: [...path],
            mutationFn: (body: unknown) => {
              const proxy = createApiProxy(options, path);
              return proxy.post(body);
            },
            ...extra
          };
        };
      }

      if (prop === "createMutation" || prop === "useMutation") {
        return (extra?: Record<string, unknown>) => {
          const proxy = createApiProxy(options, path);
          return createMutation(proxy.mutationOptions(extra));
        };
      }

      // 6. Nested Route Segment
      return createApiProxy(options, [...path, prop]);
    }
  });
}

/**
 * Create a type-safe API client for file-based API routes
 */
export function createApiClient<TRoutes = any>(options: ApiClientOptions): ApiClient<TRoutes> {
  return createApiProxy(options, []) as ApiClient<TRoutes>;
}
