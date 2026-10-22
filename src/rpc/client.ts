import { isProblemDetails, matchesRulePattern, resolveHeaders as resolveHttpHeaders } from "@http";
import { createMutation } from "@query/create-mutation";
import { createQuery } from "@query/create-query";
import { RPCError } from "./error";
import type {
  ClientOptions,
  ClientRouter,
  Router,
  RPCResponse,
  SubscriptionCallbacks,
  SubscriptionHandle
} from "./types";

async function resolveHeaders(
  headers?:
    | Record<string, string>
    | Record<string, any>
    | (() => Promise<Record<string, string>> | Record<string, string>),
  fullPath = ""
): Promise<Record<string, string>> {
  return resolveHttpHeaders(headers, fullPath, matchesRulePattern);
}

function isBinary(val: unknown): boolean {
  if (typeof Blob !== "undefined" && val instanceof Blob) return true;
  if (typeof File !== "undefined" && val instanceof File) return true;
  if (typeof ArrayBuffer !== "undefined" && (val instanceof ArrayBuffer || ArrayBuffer.isView(val)))
    return true;
  return false;
}

function hasBinaryData(val: unknown): boolean {
  if (!val || typeof val !== "object") return false;
  if (typeof FormData !== "undefined" && val instanceof FormData) return true;
  if (isBinary(val)) return true;
  if (Array.isArray(val)) return val.some(hasBinaryData);
  return Object.values(val as Record<string, any>).some(hasBinaryData);
}

function objectToFormData(obj: Record<string, any>): FormData {
  const fd = new FormData();
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof File !== "undefined" && val instanceof File) {
      fd.append(key, val, val.name);
    } else if (typeof Blob !== "undefined" && val instanceof Blob) {
      fd.append(key, val);
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof File !== "undefined" && item instanceof File) {
          fd.append(key, item, item.name);
        } else if (typeof Blob !== "undefined" && item instanceof Blob) {
          fd.append(key, item);
        } else if (typeof item === "object" && item !== null) {
          fd.append(key, JSON.stringify(item));
        } else {
          fd.append(key, String(item));
        }
      }
    } else if (typeof val === "object") {
      fd.append(key, JSON.stringify(val));
    } else {
      fd.append(key, String(val));
    }
  }
  return fd;
}

function createProxyPath(options: ClientOptions, path: string[] = []): any {
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "then") return undefined;

        if (prop === "query") {
          return async (
            input?: unknown,
            callOpts?: { signal?: AbortSignal; headers?: Record<string, string> }
          ) => {
            const fetchFn = options.fetch ?? globalThis.fetch;
            const baseUrl = (options.baseUrl ?? options.endpoint ?? "/api/rpc").replace(/\/+$/, "");
            const fullPath = path.join(".");
            let url = `${baseUrl}/${fullPath}`;

            if (input !== undefined) {
              const serialized = JSON.stringify(input);
              url += `${url.includes("?") ? "&" : "?"}input=${encodeURIComponent(serialized)}`;
            }

            const dynamicHeaders = await resolveHeaders(options.headers, fullPath);
            const headers = {
              Accept: "application/json",
              ...dynamicHeaders,
              ...callOpts?.headers
            };

            const devtools =
              typeof window !== "undefined" ? (window as any).__VISAGE_DEVTOOLS__ : null;
            const logId = devtools?.logRpcCall({
              id: `rpc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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

              const body: RPCResponse = await res.json();
              if ("error" in body) {
                devtools?.updateRpcCall(logId, { status: "error", error: body.error });
                throw new RPCError({
                  code: body.error.code,
                  message: body.error.message,
                  issues: body.error.issues,
                  problem: isProblemDetails(body) ? body : undefined
                });
              }

              devtools?.updateRpcCall(logId, { status: "success", response: body.result.data });
              return body.result.data;
            } catch (err) {
              devtools?.updateRpcCall(logId, { status: "error", error: err });
              throw err;
            }
          };
        }

        if (prop === "mutate") {
          return async (
            input?: unknown,
            callOpts?: { signal?: AbortSignal; headers?: Record<string, string> }
          ) => {
            const fetchFn = options.fetch ?? globalThis.fetch;
            const baseUrl = (options.baseUrl ?? options.endpoint ?? "/api/rpc").replace(/\/+$/, "");
            const fullPath = path.join(".");
            const url = `${baseUrl}/${fullPath}`;

            const isFormData = typeof FormData !== "undefined" && input instanceof FormData;
            const isRawBinary = isBinary(input);
            const containsBinary = !isFormData && !isRawBinary && hasBinaryData(input);

            const dynamicHeaders = await resolveHeaders(options.headers, fullPath);
            const headers: Record<string, string> = {
              Accept: "application/json",
              "x-visage-rpc": "1",
              ...dynamicHeaders,
              ...callOpts?.headers
            };

            let requestBody: any;
            if (isFormData) {
              requestBody = input;
              delete headers["Content-Type"];
              delete headers["content-type"];
            } else if (containsBinary && typeof FormData !== "undefined") {
              requestBody = objectToFormData(input as Record<string, any>);
              delete headers["Content-Type"];
              delete headers["content-type"];
            } else if (isRawBinary) {
              requestBody = input;
              if ((input as any).type) {
                headers["Content-Type"] = (input as any).type;
              } else if (!headers["Content-Type"] && !headers["content-type"]) {
                headers["Content-Type"] = "application/octet-stream";
              }
            } else {
              if (!headers["Content-Type"] && !headers["content-type"]) {
                headers["Content-Type"] = "application/json";
              }
              requestBody = JSON.stringify({ input });
            }

            const devtools =
              typeof window !== "undefined" ? (window as any).__VISAGE_DEVTOOLS__ : null;
            const logId = devtools?.logRpcCall({
              id: `rpc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              path: fullPath,
              type: "mutation",
              input
            });

            try {
              const res = await fetchFn(url, {
                method: "POST",
                headers,
                body: requestBody,
                signal: callOpts?.signal
              });

              const body: RPCResponse = await res.json();
              if ("error" in body) {
                devtools?.updateRpcCall(logId, { status: "error", error: body.error });
                throw new RPCError({
                  code: body.error.code,
                  message: body.error.message,
                  issues: body.error.issues,
                  problem: isProblemDetails(body) ? body : undefined
                });
              }

              devtools?.updateRpcCall(logId, { status: "success", response: body.result.data });
              return body.result.data;
            } catch (err) {
              devtools?.updateRpcCall(logId, { status: "error", error: err });
              throw err;
            }
          };
        }

        if (prop === "subscribe") {
          return (input: unknown, callbacks: SubscriptionCallbacks): SubscriptionHandle => {
            const fetchFn = options.fetch ?? globalThis.fetch;
            const baseUrl = (options.baseUrl ?? options.endpoint ?? "/api/rpc").replace(/\/+$/, "");
            const fullPath = path.join(".");
            let url = `${baseUrl}/${fullPath}`;

            if (input !== undefined) {
              const serialized = JSON.stringify(input);
              url += `${url.includes("?") ? "&" : "?"}input=${encodeURIComponent(serialized)}`;
            }

            const controller = new AbortController();
            const devtools =
              typeof window !== "undefined" ? (window as any).__VISAGE_DEVTOOLS__ : null;
            const logId = devtools?.logRpcCall({
              id: `rpc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
                  throw new Error(`Subscription connection failed with status ${res.status}`);
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
                      callbacks.onError?.(new Error("Server event stream error"));
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

        if (prop === "queryKey") {
          return (input?: unknown) => {
            const resolvedInput = typeof input === "function" ? (input as () => unknown)() : input;
            const key: unknown[] = [...path];
            if (resolvedInput !== undefined) {
              key.push(resolvedInput);
            }
            return key;
          };
        }

        if (prop === "queryOptions") {
          return (input?: unknown, extra?: Record<string, unknown>) => {
            const resolvedInput = typeof input === "function" ? (input as () => unknown)() : input;
            const key: unknown[] = [...path];
            if (resolvedInput !== undefined) {
              key.push(resolvedInput);
            }
            return {
              queryKey: key,
              queryFn: ({ signal }: { signal: AbortSignal }) => {
                const queryFn = createProxyPath(options, path).query;
                return queryFn(resolvedInput, { signal });
              },
              ...extra
            };
          };
        }

        if (prop === "createQuery" || prop === "useQuery") {
          return (input?: unknown, extra?: Record<string, unknown>) => {
            const proxy = createProxyPath(options, path);
            return createQuery(() => proxy.queryOptions(input, extra));
          };
        }

        if (prop === "mutationKey") {
          return () => [...path];
        }

        if (prop === "mutationOptions") {
          return (extra?: Record<string, unknown>) => {
            return {
              mutationKey: [...path],
              mutationFn: (input: unknown) => {
                const mutateFn = createProxyPath(options, path).mutate;
                return mutateFn(input);
              },
              ...extra
            };
          };
        }

        if (prop === "createMutation" || prop === "useMutation") {
          return (extra?: Record<string, unknown>) => {
            const proxy = createProxyPath(options, path);
            return createMutation(proxy.mutationOptions(extra));
          };
        }

        return createProxyPath(options, [...path, prop]);
      }
    }
  );
}

export function createClient<TRouter extends Router<any, any>>(
  options: ClientOptions = {}
): ClientRouter<TRouter> {
  const normalizedOpts: ClientOptions = {
    ...options,
    baseUrl: (options.baseUrl ?? options.endpoint ?? "/api/rpc").replace(/\/+$/, "")
  };
  return createProxyPath(normalizedOpts, []) as ClientRouter<TRouter>;
}
