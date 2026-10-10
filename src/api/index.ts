/**
 * Visage File-Based API & Opinionated RPC Framework (visage/api)
 */

// Re-export standard schema validation & RPC errors
export {
  Schema,
  type SchemaLike,
  type StandardSchemaV1,
  type ValidationIssue,
  type ValidationResult,
  v,
  validateWithSchema
} from "../form/schema";
export {
  ERROR_CODE_TO_STATUS,
  RPCError,
  STATUS_TO_ERROR_CODE
} from "../rpc/error";
export {
  buildFileRouter,
  compileRoutePattern,
  type FileRouteEntry,
  normalizeFilePath
} from "./file-router";
export {
  createApi,
  createApiHandler
} from "./handler";
export { executeMiddlewareChain } from "./middleware";
export {
  globToRegExp,
  matchesAnyPattern,
  parsePragma,
  shouldApplyMiddleware
} from "./pragma";
export {
  defineMiddleware,
  mutation,
  ProcedureBuilder,
  procedure,
  query,
  subscription
} from "./procedure";
export type {
  ApiProcedure,
  ApiRouterConfig,
  FileRouteModule,
  HttpMethod,
  MiddlewareContext,
  MiddlewareDefinition,
  MiddlewareFn,
  MiddlewarePragma,
  NextFn,
  ProcedureOptions,
  ProcedureType,
  RouteMatch,
  RPCErrorCode
} from "./types";
