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
    | (() => Promise<Record<string, string>> | Record<string, string>)
): Promise<Record<string, string>> {
  if (!headers) return {};
  if (typeof headers === "function") {
    return await headers();
  }
  return headers;
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
            const baseUrl = options.baseUrl.replace(/\/+$/, "");
            const fullPath = path.join(".");
            let url = `${baseUrl}/${fullPath}`;

            if (input !== undefined) {
              const serialized = JSON.stringify(input);
              url += `${url.includes("?") ? "&" : "?"}input=${encodeURIComponent(serialized)}`;
            }

            const dynamicHeaders = await resolveHeaders(options.headers);
            const headers = {
              Accept: "application/json",
              ...dynamicHeaders,
              ...callOpts?.headers
            };

            const res = await fetchFn(url, {
              method: "GET",
              headers,
              signal: callOpts?.signal
            });

            const body: RPCResponse = await res.json();
            if ("error" in body) {
              throw new RPCError({
                code: body.error.code,
                message: body.error.message,
                issues: body.error.issues
              });
            }

            return body.result.data;
          };
        }

        if (prop === "mutate") {
          return async (
            input?: unknown,
            callOpts?: { signal?: AbortSignal; headers?: Record<string, string> }
          ) => {
            const fetchFn = options.fetch ?? globalThis.fetch;
            const baseUrl = options.baseUrl.replace(/\/+$/, "");
            const fullPath = path.join(".");
            const url = `${baseUrl}/${fullPath}`;

            const dynamicHeaders = await resolveHeaders(options.headers);
            const headers = {
              "Content-Type": "application/json",
              Accept: "application/json",
              ...dynamicHeaders,
              ...callOpts?.headers
            };

            const res = await fetchFn(url, {
              method: "POST",
              headers,
              body: JSON.stringify({ input }),
              signal: callOpts?.signal
            });

            const body: RPCResponse = await res.json();
            if ("error" in body) {
              throw new RPCError({
                code: body.error.code,
                message: body.error.message,
                issues: body.error.issues
              });
            }

            return body.result.data;
          };
        }

        if (prop === "subscribe") {
          return (input: unknown, callbacks: SubscriptionCallbacks): SubscriptionHandle => {
            const fetchFn = options.fetch ?? globalThis.fetch;
            const baseUrl = options.baseUrl.replace(/\/+$/, "");
            const fullPath = path.join(".");
            let url = `${baseUrl}/${fullPath}`;

            if (input !== undefined) {
              const serialized = JSON.stringify(input);
              url += `${url.includes("?") ? "&" : "?"}input=${encodeURIComponent(serialized)}`;
            }

            const controller = new AbortController();

            (async () => {
              try {
                const dynamicHeaders = await resolveHeaders(options.headers);
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
                        callbacks.onData(parsed);
                      } catch (parseErr) {
                        callbacks.onError?.(parseErr);
                      }
                    } else if (trimmed.startsWith("event: error")) {
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
            const key: unknown[] = [...path];
            if (input !== undefined) {
              key.push(input);
            }
            return key;
          };
        }

        if (prop === "queryOptions") {
          return (input?: unknown, extra?: Record<string, unknown>) => {
            const key: unknown[] = [...path];
            if (input !== undefined) {
              key.push(input);
            }
            return {
              queryKey: key,
              queryFn: ({ signal }: { signal: AbortSignal }) => {
                const queryFn = createProxyPath(options, path).query;
                return queryFn(input, { signal });
              },
              ...extra
            };
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

        return createProxyPath(options, [...path, prop]);
      }
    }
  );
}

export function createClient<TRouter extends Router<any, any>>(
  options: ClientOptions
): ClientRouter<TRouter> {
  return createProxyPath(options, []) as ClientRouter<TRouter>;
}
