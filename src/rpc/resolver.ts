import { RPCError } from "./error";
import type { Procedure, Router } from "./types";

export function resolveProcedureFromPath(
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
