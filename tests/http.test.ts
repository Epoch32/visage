import { describe, expect, it } from "bun:test";
import {
  compareETags,
  create304Response,
  evaluatePreconditions,
  filter304Headers,
  fnv1a64,
  formatCacheControl,
  generateETag,
  handleConditionalResponse,
  matchesETagHeader,
  parseCacheControl,
  parseETag,
  parseETagList
} from "../src/http";

describe("Visage HTTP Standards (RFC 9110 & RFC 9111)", () => {
  describe("Entity Tag Generation & Parsing (RFC 9110 §8.8.3)", () => {
    it("computes deterministic 64-bit FNV-1a hash", () => {
      const h1 = fnv1a64("Hello World");
      const h2 = fnv1a64("Hello World");
      const h3 = fnv1a64("Hello World!");

      expect(h1).toBe(h2);
      expect(h1).not.toBe(h3);
      expect(h1.length).toBe(16);
    });

    it("generates valid weak and strong ETags", () => {
      const content = JSON.stringify({ message: "Hello Visage" });
      const weakETag = generateETag(content, { weak: true });
      const strongETag = generateETag(content, { weak: false });

      expect(weakETag.startsWith('W/"')).toBe(true);
      expect(weakETag.endsWith('"')).toBe(true);
      expect(strongETag.startsWith('"')).toBe(true);
      expect(strongETag.startsWith('W/"')).toBe(false);

      const parsedWeak = parseETag(weakETag);
      expect(parsedWeak?.weak).toBe(true);

      const parsedStrong = parseETag(strongETag);
      expect(parsedStrong?.weak).toBe(false);
      expect(parsedStrong?.tag).toBe(parsedWeak?.tag);
    });

    it("parses single entity tags with or without quotes", () => {
      expect(parseETag('W/"abc-123"')).toEqual({
        weak: true,
        tag: "abc-123",
        raw: 'W/"abc-123"'
      });
      expect(parseETag('"strong-456"')).toEqual({
        weak: false,
        tag: "strong-456",
        raw: '"strong-456"'
      });
      expect(parseETag("bare-tag")).toEqual({
        weak: false,
        tag: "bare-tag",
        raw: '"bare-tag"'
      });
    });

    it("parses comma-separated ETag lists handling quotes and whitespace", () => {
      const list = parseETagList('W/"tag1", "tag2",   W/"tag3"');
      expect(list.length).toBe(3);
      expect(list[0]).toEqual({ weak: true, tag: "tag1", raw: 'W/"tag1"' });
      expect(list[1]).toEqual({ weak: false, tag: "tag2", raw: '"tag2"' });
      expect(list[2]).toEqual({ weak: true, tag: "tag3", raw: 'W/"tag3"' });
    });

    it("handles wildcard * in ETag list", () => {
      const list = parseETagList("*");
      expect(list.length).toBe(1);
      expect(list[0]?.tag).toBe("*");
    });
  });

  describe("Entity Tag Comparison (RFC 9110 §8.8.3.2)", () => {
    it("weak comparison matches when opaque tags match, ignoring weak indicator", () => {
      expect(compareETags('W/"123"', 'W/"123"', true)).toBe(true);
      expect(compareETags('W/"123"', '"123"', true)).toBe(true);
      expect(compareETags('"123"', 'W/"123"', true)).toBe(true);
      expect(compareETags('"123"', '"123"', true)).toBe(true);
      expect(compareETags('W/"123"', 'W/"456"', true)).toBe(false);
    });

    it("strong comparison requires neither tag to be weak", () => {
      expect(compareETags('"123"', '"123"', false)).toBe(true);
      expect(compareETags('W/"123"', '"123"', false)).toBe(false);
      expect(compareETags('"123"', 'W/"123"', false)).toBe(false);
      expect(compareETags('W/"123"', 'W/"123"', false)).toBe(false);
    });

    it("matchesETagHeader evaluates comma-separated client headers", () => {
      const serverETag = 'W/"item-99"';
      expect(matchesETagHeader('W/"item-1", W/"item-99"', serverETag)).toBe(true);
      expect(matchesETagHeader('"item-99"', serverETag)).toBe(true);
      expect(matchesETagHeader('W/"other"', serverETag)).toBe(false);
      expect(matchesETagHeader("*", serverETag)).toBe(true);
      expect(matchesETagHeader(null, serverETag)).toBe(false);
    });
  });

  describe("Cache-Control Directives (RFC 9111 §5.2)", () => {
    it("serializes structured CacheControlDirectives to RFC 9111 string", () => {
      const header = formatCacheControl({
        public: true,
        maxAge: 0,
        sMaxAge: 3600,
        mustRevalidate: true,
        staleWhileRevalidate: 60
      });
      expect(header).toBe(
        "public, max-age=0, s-maxage=3600, must-revalidate, stale-while-revalidate=60"
      );
    });

    it("serializes private, no-cache, and immutable directives correctly", () => {
      const h1 = formatCacheControl({
        private: true,
        noCache: true
      });
      expect(h1).toBe("no-cache, private");

      const h2 = formatCacheControl({
        public: true,
        maxAge: 31536000,
        immutable: true
      });
      expect(h2).toBe("public, max-age=31536000, immutable");
    });

    it("parses Cache-Control header string into structured object", () => {
      const parsed = parseCacheControl(
        "public, max-age=60, s-maxage=300, must-revalidate, stale-while-revalidate=120"
      );
      expect(parsed.public).toBe(true);
      expect(parsed.maxAge).toBe(60);
      expect(parsed.sMaxAge).toBe(300);
      expect(parsed.mustRevalidate).toBe(true);
      expect(parsed.staleWhileRevalidate).toBe(120);
    });
  });

  describe("Conditional Precondition Evaluation (RFC 9110 §13.1)", () => {
    it("returns 304 when If-None-Match matches current ETag on GET", () => {
      const req = new Request("http://localhost/api/data", {
        headers: { "if-none-match": 'W/"v1-tag"' }
      });
      const result = evaluatePreconditions(req, { etag: 'W/"v1-tag"' });
      expect(result.isNotModified).toBe(true);
      expect(result.status).toBe(304);
    });

    it("returns false when If-None-Match does not match current ETag", () => {
      const req = new Request("http://localhost/api/data", {
        headers: { "if-none-match": 'W/"old-tag"' }
      });
      const result = evaluatePreconditions(req, { etag: 'W/"new-tag"' });
      expect(result.isNotModified).toBe(false);
      expect(result.status).toBeUndefined();
    });

    it("evaluates If-Match on state-changing methods (RFC 9110 §13.1.1)", () => {
      const reqFail = new Request("http://localhost/api/data", {
        method: "PUT",
        headers: { "if-match": '"expected-tag"' }
      });
      const failRes = evaluatePreconditions(reqFail, { etag: '"different-tag"' });
      expect(failRes.isPreconditionFailed).toBe(true);
      expect(failRes.status).toBe(412);

      const reqPass = new Request("http://localhost/api/data", {
        method: "PUT",
        headers: { "if-match": '"expected-tag"' }
      });
      const passRes = evaluatePreconditions(reqPass, { etag: '"expected-tag"' });
      expect(passRes.isPreconditionFailed).toBe(false);
    });

    it("ignores If-Modified-Since if If-None-Match is present (RFC 9110 §13.1.3)", () => {
      const req = new Request("http://localhost/api/data", {
        headers: {
          "if-none-match": 'W/"actual-tag"',
          "if-modified-since": "Mon, 01 Jan 2000 00:00:00 GMT"
        }
      });
      // Even if modified-since would say it was modified, If-None-Match takes precedence
      const res = evaluatePreconditions(req, {
        etag: 'W/"actual-tag"',
        lastModified: new Date("2026-01-01T00:00:00Z")
      });
      expect(res.isNotModified).toBe(true);
      expect(res.status).toBe(304);
    });
  });

  describe("304 Not Modified Response Filtering (RFC 9110 §15.4.5)", () => {
    it("strips representation headers while preserving cache and CORS headers", () => {
      const original = new Headers({
        "Content-Type": "application/json",
        "Content-Length": "1024",
        "Content-Encoding": "gzip",
        ETag: 'W/"my-etag"',
        "Cache-Control": "public, max-age=0, must-revalidate",
        Vary: "Accept-Encoding",
        "Access-Control-Allow-Origin": "*"
      });

      const filtered = filter304Headers(original);
      expect(filtered.get("etag")).toBe('W/"my-etag"');
      expect(filtered.get("content-type")).toBeNull();

      const res304 = create304Response(original);
      expect(res304.status).toBe(304);
      expect(res304.statusText).toBe("Not Modified");
      expect(res304.headers.get("etag")).toBe('W/"my-etag"');
      expect(res304.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
      expect(res304.headers.get("vary")).toBe("Accept-Encoding");
      expect(res304.headers.get("access-control-allow-origin")).toBe("*");

      // Representation headers MUST NOT be present
      expect(res304.headers.get("content-type")).toBeNull();
      expect(res304.headers.get("content-length")).toBeNull();
      expect(res304.headers.get("content-encoding")).toBeNull();
    });
  });

  describe("handleConditionalResponse Higher-Level Wrapper", () => {
    it("automatically generates weak ETag on 200 response and intercepts subsequent request with 304", async () => {
      const initialReq = new Request("http://localhost/api/items");
      const originRes = new Response(JSON.stringify({ items: [1, 2, 3] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

      const processedRes = await handleConditionalResponse(initialReq, originRes, {
        cacheControl: { public: true, maxAge: 0, sMaxAge: 3600, mustRevalidate: true }
      });

      expect(processedRes.status).toBe(200);
      const etag = processedRes.headers.get("etag");
      expect(etag).not.toBeNull();
      expect(etag?.startsWith('W/"')).toBe(true);
      expect(processedRes.headers.get("cache-control")).toContain("s-maxage=3600");

      // Repeat request with If-None-Match
      const revalidateReq = new Request("http://localhost/api/items", {
        headers: { "if-none-match": etag! }
      });
      const revalidateOriginRes = new Response(JSON.stringify({ items: [1, 2, 3] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

      const revalidateProcessed = await handleConditionalResponse(
        revalidateReq,
        revalidateOriginRes,
        {
          cacheControl: { public: true, maxAge: 0, sMaxAge: 3600, mustRevalidate: true }
        }
      );

      expect(revalidateProcessed.status).toBe(304);
      expect(revalidateProcessed.statusText).toBe("Not Modified");
      expect(await revalidateProcessed.text()).toBe("");
    });

    it("handles HEAD requests per RFC 9110 §9.3.2 by emitting identical headers with empty body", async () => {
      const headReq = new Request("http://localhost/api/items", { method: "HEAD" });
      const originRes = new Response(JSON.stringify({ message: "Hello" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

      const res = await handleConditionalResponse(headReq, originRes);
      expect(res.status).toBe(200);
      expect(res.headers.get("etag")).not.toBeNull();
      expect(res.headers.get("content-type")).toBe("application/json");
      expect(await res.text()).toBe("");
    });
  });
});
