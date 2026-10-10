// @visage-middleware cascade: true

import { type MiddlewareFn, RPCError } from "visage/api";

export const middleware: MiddlewareFn = async ({ req, next }) => {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer super-secret-admin-key")) {
    throw new RPCError(
      401,
      "Admin access required. Provide header Authorization: Bearer super-secret-admin-key"
    );
  }

  return next({
    admin: {
      id: "admin_master",
      role: "superuser",
      sessionStarted: Date.now()
    }
  });
};
