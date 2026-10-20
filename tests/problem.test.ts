import { describe, expect, it } from "bun:test";
import { createApi, mutation, query } from "@api";
import { normalizeIssuePath, v } from "@form";
import {
  badRequest,
  conflict,
  createProblemResponse,
  forbidden,
  formatValidationIssues,
  getHttpStatusTitle,
  internalServerError,
  isProblemDetails,
  isProblemResponse,
  methodNotAllowed,
  notFound,
  PROBLEM_MEDIA_TYPE,
  type ProblemDetails,
  ProblemError,
  parseProblemDetails,
  problem,
  tooManyRequests,
  unauthorized,
  unprocessable
} from "@http";
import { createFetchHandler, createRouter, RPCError, query as rpcQuery } from "@rpc";

describe("RFC 9457 Problem Details for HTTP APIs (visage/http)", () => {
  describe("Specification Defaults & Response Construction", () => {
    it("creates a standard RFC 9457 response with media type application/problem+json", async () => {
      const res = createProblemResponse({
        status: 404,
        detail: "Account 'acc_123' does not exist in the active workspace",
        instance: "/accounts/acc_123"
      });

      expect(res.status).toBe(404);
      expect(res.headers.get("Content-Type")).toBe(PROBLEM_MEDIA_TYPE);

      const json = await res.json();
      expect(json.type).toBe("about:blank");
      expect(json.title).toBe("Not Found");
      expect(json.status).toBe(404);
      expect(json.detail).toBe("Account 'acc_123' does not exist in the active workspace");
      expect(json.instance).toBe("/accounts/acc_123");
    });

    it("defaults status to 500 and title to Internal Server Error when omitted", async () => {
      const res = createProblemResponse({
        detail: "Database pool exhausted"
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.type).toBe("about:blank");
      expect(json.title).toBe("Internal Server Error");
      expect(json.status).toBe(500);
      expect(json.detail).toBe("Database pool exhausted");
    });

    it("preserves custom URI types, titles, and arbitrary extension members", async () => {
      const res = createProblemResponse({
        type: "https://example.com/probs/insufficient-credit",
        title: "You do not have enough credit.",
        status: 403,
        detail: "Your current balance is 30, but that costs 50.",
        instance: "/account/12345/msgs/abc",
        balance: 30,
        cost: 50,
        accounts: ["/account/12345", "/account/67890"]
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.type).toBe("https://example.com/probs/insufficient-credit");
      expect(json.title).toBe("You do not have enough credit.");
      expect(json.status).toBe(403);
      expect(json.balance).toBe(30);
      expect(json.cost).toBe(50);
      expect(json.accounts).toEqual(["/account/12345", "/account/67890"]);
    });

    it("resolves standard HTTP reason phrases across common status codes", () => {
      expect(getHttpStatusTitle(400)).toBe("Bad Request");
      expect(getHttpStatusTitle(401)).toBe("Unauthorized");
      expect(getHttpStatusTitle(403)).toBe("Forbidden");
      expect(getHttpStatusTitle(404)).toBe("Not Found");
      expect(getHttpStatusTitle(405)).toBe("Method Not Allowed");
      expect(getHttpStatusTitle(409)).toBe("Conflict");
      expect(getHttpStatusTitle(422)).toBe("Unprocessable Content");
      expect(getHttpStatusTitle(429)).toBe("Too Many Requests");
      expect(getHttpStatusTitle(500)).toBe("Internal Server Error");
      expect(getHttpStatusTitle(503)).toBe("Service Unavailable");
    });
  });

  describe("Validation Issues & Extension Formatting", () => {
    it("formats schema validation issues into RFC 9457 invalidParams structure", () => {
      const issues = [
        { path: ["user", "email"], message: "Invalid email syntax" },
        { path: ["user", "age"], message: "Must be at least 18 years old" }
      ];

      const invalidParams = formatValidationIssues(issues);
      expect(invalidParams.length).toBe(2);
      expect(invalidParams[0]).toEqual({
        name: "user.email",
        reason: "Invalid email syntax",
        path: ["user", "email"]
      });
      expect(invalidParams[1]).toEqual({
        name: "user.age",
        reason: "Must be at least 18 years old",
        path: ["user", "age"]
      });
    });

    it("handles string and undefined path shapes in validation formatting gracefully", () => {
      const issues = [
        { path: "token", message: "Malformed bearer token" },
        { message: "Global authorization failure" }
      ];

      const invalidParams = formatValidationIssues(issues as any);
      expect(invalidParams[0]?.name).toBe("token");
      expect(invalidParams[0]?.reason).toBe("Malformed bearer token");
      expect(invalidParams[1]?.name).toBe("");
      expect(invalidParams[1]?.reason).toBe("Global authorization failure");
    });
  });

  describe("Type Guards & Response Utilities", () => {
    it("identifies valid ProblemDetails objects and rejects non-problem payloads", () => {
      expect(isProblemDetails({ status: 404, title: "Not Found" })).toBe(true);
      expect(isProblemDetails({ type: "about:blank" })).toBe(true);
      expect(isProblemDetails({ type: "https://api.example.com/errors/invalid-token" })).toBe(true);
      expect(isProblemDetails({ title: "Bad Request", detail: "Missing field" })).toBe(true);
      expect(isProblemDetails({ invalidParams: [{ name: "email", reason: "invalid" }] })).toBe(
        true
      );

      expect(isProblemDetails(null)).toBe(false);
      expect(isProblemDetails(undefined)).toBe(false);
      expect(isProblemDetails("error string")).toBe(false);
      expect(isProblemDetails(404)).toBe(false);
      expect(isProblemDetails([1, 2, 3])).toBe(false);
      expect(isProblemDetails({ success: true, count: 42 })).toBe(false);
    });

    it("identifies problem responses via isProblemResponse and parses details via parseProblemDetails", async () => {
      const res = createProblemResponse({ status: 400, detail: "Malformed body" });
      expect(isProblemResponse(res)).toBe(true);

      const parsed = await parseProblemDetails(res);
      expect(parsed).not.toBeNull();
      expect(parsed?.status).toBe(400);
      expect(parsed?.detail).toBe("Malformed body");

      const normalRes = new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
      expect(isProblemResponse(normalRes)).toBe(false);
    });
  });

  describe("ProblemError Class & Factory Helpers", () => {
    it("instantiates ProblemError with string and converts to RFC 9457 response", async () => {
      const err = new ProblemError("Forbidden resource access", 403);
      expect(err.status).toBe(403);
      expect(err.problem.title).toBe("Forbidden");
      expect(err.problem.detail).toBe("Forbidden resource access");

      const res = err.toResponse();
      expect(res.status).toBe(403);
      expect(res.headers.get("Content-Type")).toBe(PROBLEM_MEDIA_TYPE);

      const json = await res.json();
      expect(json.status).toBe(403);
      expect(json.detail).toBe("Forbidden resource access");
    });

    it("instantiates ProblemError with structured ProblemDetails and custom extensions", async () => {
      const err = new ProblemError({
        type: "https://example.com/probs/rate-limit",
        title: "Rate limit exceeded",
        status: 429,
        detail: "Exceeded 100 requests per minute quota",
        retryAfterSeconds: 30
      });

      expect(err.status).toBe(429);
      expect(err.problem.type).toBe("https://example.com/probs/rate-limit");
      expect(err.problem.retryAfterSeconds).toBe(30);

      const res = err.toResponse({ headers: { "Retry-After": "30" } });
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("30");
      expect(res.headers.get("Content-Type")).toBe(PROBLEM_MEDIA_TYPE);
    });

    it("produces standardized HTTP problem responses with fast helper functions", async () => {
      const rBad = badRequest("Invalid payload", [{ name: "email", reason: "required" }]);
      expect(rBad.status).toBe(400);
      const jBad = await rBad.json();
      expect(jBad.title).toBe("Bad Request");
      expect(jBad.invalidParams[0].name).toBe("email");

      const rUnauth = unauthorized("Missing bearer token");
      expect(rUnauth.status).toBe(401);
      const jUnauth = await rUnauth.json();
      expect(jUnauth.title).toBe("Unauthorized");

      const rForbid = forbidden("Insufficient scope");
      expect(rForbid.status).toBe(403);

      const rNotFound = notFound("Document not found");
      expect(rNotFound.status).toBe(404);

      const rMethod = methodNotAllowed("POST not supported");
      expect(rMethod.status).toBe(405);

      const rConflict = conflict("Email already registered");
      expect(rConflict.status).toBe(409);

      const rUnproc = unprocessable("Semantic errors");
      expect(rUnproc.status).toBe(422);

      const rTooMany = tooManyRequests("Rate limited");
      expect(rTooMany.status).toBe(429);

      const r500 = internalServerError("Internal database failure");
      expect(r500.status).toBe(500);

      const rCustom = problem(418, "I'm a teapot", { teaType: "Earl Grey" });
      expect(rCustom.status).toBe(418);
      const jCustom = await rCustom.json();
      expect(jCustom.title).toBe("I'm a teapot");
      expect(jCustom.teaType).toBe("Earl Grey");
    });
  });

  describe("RPCError & RFC 9457 Bi-Directional Conversion", () => {
    it("converts RPCError to RFC 9457 ProblemDetails with mapped invalidParams", () => {
      const rpcErr = new RPCError({
        code: "BAD_REQUEST",
        message: "Validation failed",
        issues: [{ path: "username", message: "Must be alphanumeric" }]
      });

      const problem = rpcErr.toProblemDetails("/api/auth/register");
      expect(problem.type).toBe("about:blank");
      expect(problem.title).toBe("Bad Request");
      expect(problem.status).toBe(400);
      expect(problem.detail).toBe("Validation failed");
      expect(problem.instance).toBe("/api/auth/register");
      expect(problem.invalidParams).toEqual([
        { name: "username", reason: "Must be alphanumeric", path: ["username"] }
      ]);
    });

    it("hydrates RPCError from an RFC 9457 ProblemDetails object", () => {
      const problemDetails: ProblemDetails = {
        type: "https://example.com/probs/auth",
        title: "Unauthorized",
        status: 401,
        detail: "Expired session credentials",
        invalidParams: [{ name: "session_id", reason: "Expired" }]
      };

      const rpcErr = RPCError.fromProblem(problemDetails);
      expect(rpcErr.status).toBe(401);
      expect(rpcErr.code).toBe("UNAUTHORIZED");
      expect(rpcErr.message).toBe("Expired session credentials");
      expect(rpcErr.problem).toBe(problemDetails);
      expect(rpcErr.issues?.[0]?.message).toBe("Expired");
      expect(rpcErr.issues?.[0]?.path).toEqual(["session_id"]);
      expect(normalizeIssuePath(rpcErr.issues?.[0]?.path)).toBe("session_id");
    });
  });

  describe("API Handler & Router Integration (visage/api)", () => {
    const apiFiles = {
      "./routes/users.ts": {
        post: mutation({
          input: v.object({
            email: v.string(),
            age: v.number()
          }),
          resolve: ({ input }: any) => ({ success: true, user: input })
        })
      },
      "./routes/guarded.ts": {
        get: query({
          resolve: () => {
            throw new ProblemError({
              type: "https://my-api.com/errors/license-expired",
              title: "Subscription Expired",
              status: 402,
              detail: "Your enterprise license expired on 2026-10-01.",
              instance: "/guarded"
            });
          }
        })
      }
    };

    it("automatically responds with application/problem+json when problemDetails: true is enabled", async () => {
      const api = createApi(apiFiles, {
        problemDetails: true
      });

      // 404 Route Not Found
      const req404 = new Request("http://localhost/non-existent");
      const res404 = await api.fetch(req404);
      expect(res404.status).toBe(404);
      expect(res404.headers.get("Content-Type")).toBe(PROBLEM_MEDIA_TYPE);

      const json404 = await res404.json();
      expect(json404.type).toBe("about:blank");
      expect(json404.title).toBe("Not Found");
      expect(json404.detail).toContain("/non-existent");
      expect(json404.instance).toBe("/non-existent");

      // 400 Validation Error with invalidParams
      const req400 = new Request("http://localhost/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }) // missing age
      });
      const res400 = await api.fetch(req400);
      expect(res400.status).toBe(400);
      expect(res400.headers.get("Content-Type")).toBe(PROBLEM_MEDIA_TYPE);

      const json400 = await res400.json();
      expect(json400.title).toBe("Bad Request");
      expect(json400.detail).toBe("Validation Error");
      expect(json400.invalidParams).toBeDefined();
      expect(json400.invalidParams.length > 0).toBe(true);

      // Thrown ProblemError
      const reqGuarded = new Request("http://localhost/guarded");
      const resGuarded = await api.fetch(reqGuarded);
      expect(resGuarded.status).toBe(402);
      expect(resGuarded.headers.get("Content-Type")).toBe(PROBLEM_MEDIA_TYPE);

      const jsonGuarded = await resGuarded.json();
      expect(jsonGuarded.type).toBe("https://my-api.com/errors/license-expired");
      expect(jsonGuarded.title).toBe("Subscription Expired");
      expect(jsonGuarded.detail).toContain("license expired");
    });

    it("dynamically negotiates application/problem+json when client sends Accept header", async () => {
      const api = createApi(apiFiles); // default config without problemDetails: true

      const reqWithAccept = new Request("http://localhost/missing", {
        headers: { Accept: "application/problem+json" }
      });
      const res = await api.fetch(reqWithAccept);
      expect(res.status).toBe(404);
      expect(res.headers.get("Content-Type")).toBe(PROBLEM_MEDIA_TYPE);

      const json = await res.json();
      expect(json.type).toBe("about:blank");
      expect(json.title).toBe("Not Found");
    });
  });

  describe("RPC Server Integration (visage/rpc)", () => {
    const appRouter = createRouter({
      throwProblem: rpcQuery({
        resolve: async () => {
          throw new RPCError({
            code: "FORBIDDEN",
            message: "Operation not permitted on production database"
          });
        }
      })
    });

    it("emits application/problem+json when problemDetails: true is enabled on createFetchHandler", async () => {
      const handler = createFetchHandler({
        router: appRouter,
        endpoint: "/api/rpc",
        problemDetails: true
      });

      const req = new Request("http://localhost/api/rpc/throwProblem");
      const res = await handler(req);
      expect(res.status).toBe(403);
      expect(res.headers.get("Content-Type")).toBe(PROBLEM_MEDIA_TYPE);

      const json = await res.json();
      expect(json.type).toBe("about:blank");
      expect(json.title).toBe("Forbidden");
      expect(json.detail).toBe("Operation not permitted on production database");
      expect(json.instance).toBe("throwProblem");
      // Backwards compatible RPC structure
      expect(json.error.code).toBe("FORBIDDEN");
    });
  });
});
