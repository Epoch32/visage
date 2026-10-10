// @visage-middleware cascade: true

import { type MiddlewareFn, RPCError } from "visage/api";

export const middleware: MiddlewareFn = async ({ req, url, next }) => {
  const authHeader = req.headers.get("Authorization");
  const tokenQuery = url.searchParams.get("token") || url.searchParams.get("auth");
  const isAuthed =
    authHeader === "Bearer super-secret-admin-key" || tokenQuery === "super-secret-admin-key";

  if (!isAuthed) {
    throw new RPCError(
      401,
      "Admin access required. Provide header 'Authorization: Bearer super-secret-admin-key' or query '?token=super-secret-admin-key'"
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
