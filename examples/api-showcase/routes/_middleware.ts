// @visage-middleware cascade: true, exclude: ["health"]

import type { MiddlewareFn } from "visage/api";

export const middleware: MiddlewareFn = async ({ next }) => {
  const start = Date.now();
  const res = await next({ requestId: `req_${Math.random().toString(36).slice(2, 8)}` });
  const duration = Date.now() - start;

  if (res instanceof Response) {
    res.headers.set("X-Response-Time", `${duration}ms`);
  }

  return res;
};
