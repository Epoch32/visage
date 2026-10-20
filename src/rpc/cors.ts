import type { CORSOptions } from "./types";

export function getCORSHeaders(cors: boolean | CORSOptions | undefined, req: Request): Headers {
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

  if (req.method === "OPTIONS") {
    const methods = opts.methods || ["GET", "POST", "OPTIONS"];
    headers.set("Access-Control-Allow-Methods", methods.join(", "));

    const requestHeaders = req.headers.get("access-control-request-headers");
    const allowedHeaders =
      opts.allowedHeaders ||
      (requestHeaders
        ? [requestHeaders]
        : ["Content-Type", "Authorization", "x-visage-rpc", "Accept"]);
    headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
  }

  if (opts.exposedHeaders && opts.exposedHeaders.length > 0) {
    headers.set("Access-Control-Expose-Headers", opts.exposedHeaders.join(", "));
  }

  return headers;
}
