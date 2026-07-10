import { describe, expect, test } from "vitest";
import type { PageRedirect } from "@webstudio-is/sdk";
import {
  doesRedirectSourceOverridePagePath,
  doesRedirectSourceMatchLocalUrl,
  doesRedirectSourceMatchUrl,
  findMatchingRedirect,
  getRedirectSourcePathname,
  getRedirectSourceSearchIndex,
  hasInvalidLocalTargetParams,
  hasNamedSplat,
  isRedirectSourcePattern,
  normalizeRedirectSource,
  stripRedirectSourceFragment,
} from "./redirect-source";

describe("redirect source helpers", () => {
  test("keeps optional pathname markers separate from search", () => {
    expect(getRedirectSourceSearchIndex("/blog/:slug?")).toBe(-1);
    expect(getRedirectSourceSearchIndex("/blog/:slug?draft=true")).toBe(11);
  });

  test("normalizes fragments and encoded pathnames without decoding search", () => {
    expect(stripRedirectSourceFragment("/docs#intro")).toBe("/docs");
    expect(
      normalizeRedirectSource("/%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82?q=%D1%82")
    ).toBe("/привет?q=%D1%82");
    expect(getRedirectSourcePathname("/docs?utm=1#intro")).toBe("/docs");
  });

  test("detects redirect patterns and named splats", () => {
    expect(isRedirectSourcePattern("/blog/:slug")).toBe(true);
    expect(isRedirectSourcePattern("/docs/*")).toBe(true);
    expect(isRedirectSourcePattern("/docs/:path*")).toBe(true);
    expect(hasNamedSplat("/docs/:path*")).toBe(true);
    expect(hasNamedSplat("/docs/*")).toBe(false);
  });

  test("validates local target params against source params", () => {
    expect(hasInvalidLocalTargetParams("/new/:slug", "/old/:slug")).toBe(false);
    expect(hasInvalidLocalTargetParams("/new/:missing", "/old/:slug")).toBe(
      true
    );
    expect(hasInvalidLocalTargetParams("/new?tag=:slug", "/old/:slug")).toBe(
      true
    );
    expect(hasInvalidLocalTargetParams("https://example.com/:slug")).toBe(
      false
    );
  });

  test("matches exact sources with search and pathname-only sources without search", () => {
    expect(doesRedirectSourceMatchUrl("/docs?tab=api", "/docs?tab=api")).toBe(
      true
    );
    expect(doesRedirectSourceMatchUrl("/docs?tab=api", "/docs?tab=guide")).toBe(
      false
    );
    expect(doesRedirectSourceMatchUrl("/docs", "/docs?tab=api")).toBe(true);
  });

  test("matches local URLs with redirect source patterns", () => {
    expect(doesRedirectSourceMatchLocalUrl("/blog/:slug", "/blog/post")).toBe(
      true
    );
    expect(doesRedirectSourceMatchLocalUrl("/docs/*", "/docs/api")).toBe(true);
    expect(doesRedirectSourceMatchLocalUrl("/en?/about", "/en/about")).toBe(
      true
    );
    expect(doesRedirectSourceMatchLocalUrl("/docs?tab=api", "/docs")).toBe(
      false
    );
  });
});

describe("findMatchingRedirect", () => {
  const createRedirect = (
    old: string,
    newPath: string = "/new"
  ): PageRedirect => ({
    old,
    new: newPath,
    status: "301",
  });

  describe("exact matches", () => {
    test("finds redirect with exact path match", () => {
      const redirects = [createRedirect("/about")];
      const result = findMatchingRedirect("/about", redirects);
      expect(result?.old).toBe("/about");
    });

    test("finds redirect after removing source fragment", () => {
      const redirects = [createRedirect("/about#section")];
      const result = findMatchingRedirect("/about", redirects);
      expect(result?.old).toBe("/about#section");
    });

    test("finds redirect with encoded source path for decoded page path", () => {
      const redirects = [createRedirect("/%C3%BCber")];
      const result = findMatchingRedirect("/über", redirects);
      expect(result?.old).toBe("/%C3%BCber");
    });

    test("does not report query-specific redirect as fully overriding a page", () => {
      const redirects = [createRedirect("/about?x=1")];
      const result = findMatchingRedirect("/about", redirects);
      expect(result).toBeUndefined();
    });

    test("returns undefined when no match found", () => {
      const redirects = [createRedirect("/about")];
      const result = findMatchingRedirect("/contact", redirects);
      expect(result).toBeUndefined();
    });

    test("does not match home page path when redirect points elsewhere", () => {
      const redirects = [createRedirect("/old-home")];
      const result = findMatchingRedirect("/", redirects);
      expect(result).toBeUndefined();
    });
  });

  describe("wildcard patterns", () => {
    test("matches wildcard pattern /*", () => {
      const redirects = [createRedirect("/blog/*")];
      const result = findMatchingRedirect("/blog/post-1", redirects);
      expect(result?.old).toBe("/blog/*");
    });

    test("matches nested path with wildcard", () => {
      const redirects = [createRedirect("/docs/*")];
      const result = findMatchingRedirect("/docs/api/v1/users", redirects);
      expect(result?.old).toBe("/docs/*");
    });

    test("does not match path outside wildcard scope", () => {
      const redirects = [createRedirect("/blog/*")];
      const result = findMatchingRedirect("/posts/article", redirects);
      expect(result).toBeUndefined();
    });

    test("matches wildcard at root level", () => {
      const redirects = [createRedirect("/*")];
      const result = findMatchingRedirect("/anything", redirects);
      expect(result?.old).toBe("/*");
    });
  });

  describe("dynamic segment patterns", () => {
    test("matches single dynamic segment", () => {
      const redirects = [createRedirect("/:slug")];
      const result = findMatchingRedirect("/about", redirects);
      expect(result?.old).toBe("/:slug");
    });

    test("matches dynamic segment in middle of path", () => {
      const redirects = [createRedirect("/blog/:id/comments")];
      const result = findMatchingRedirect("/blog/123/comments", redirects);
      expect(result?.old).toBe("/blog/:id/comments");
    });

    test("matches multiple dynamic segments", () => {
      const redirects = [createRedirect("/users/:userId/posts/:postId")];
      const result = findMatchingRedirect("/users/42/posts/99", redirects);
      expect(result?.old).toBe("/users/:userId/posts/:postId");
    });

    test("does not match when segment count differs", () => {
      const redirects = [createRedirect("/blog/:id")];
      const result = findMatchingRedirect("/blog/123/extra", redirects);
      expect(result).toBeUndefined();
    });
  });

  describe("optional segments", () => {
    test("matches optional segment when present", () => {
      const redirects = [createRedirect("/blog/:id?")];
      const result = findMatchingRedirect("/blog/123", redirects);
      expect(result?.old).toBe("/blog/:id?");
    });

    test("matches optional segment when absent", () => {
      const redirects = [createRedirect("/blog/:id?")];
      const result = findMatchingRedirect("/blog", redirects);
      expect(result?.old).toBe("/blog/:id?");
    });

    test("matches optional static segment", () => {
      const redirects = [createRedirect("/en?/about")];
      const result = findMatchingRedirect("/en/about", redirects);
      expect(result?.old).toBe("/en?/about");
    });
  });

  describe("priority and order", () => {
    test("returns first matching redirect", () => {
      const redirects = [
        createRedirect("/about", "/new-about"),
        createRedirect("/:slug", "/catch-all"),
      ];
      const result = findMatchingRedirect("/about", redirects);
      expect(result?.new).toBe("/new-about");
    });

    test("falls through to wildcard if no exact match", () => {
      const redirects = [createRedirect("/specific"), createRedirect("/*")];
      const result = findMatchingRedirect("/other", redirects);
      expect(result?.old).toBe("/*");
    });
  });

  describe("edge cases", () => {
    test("handles empty redirects array", () => {
      const result = findMatchingRedirect("/about", []);
      expect(result).toBeUndefined();
    });

    test("handles path with special characters", () => {
      const redirects = [createRedirect("/path-with-dashes")];
      const result = findMatchingRedirect("/path-with-dashes", redirects);
      expect(result?.old).toBe("/path-with-dashes");
    });

    test("handles path with underscores", () => {
      const redirects = [createRedirect("/path_with_underscores")];
      const result = findMatchingRedirect("/path_with_underscores", redirects);
      expect(result?.old).toBe("/path_with_underscores");
    });

    test("handles deeply nested paths", () => {
      const redirects = [createRedirect("/a/b/c/d/e")];
      const result = findMatchingRedirect("/a/b/c/d/e", redirects);
      expect(result?.old).toBe("/a/b/c/d/e");
    });
  });
});

describe("doesRedirectSourceOverridePagePath", () => {
  test("returns true when exact redirect source matches exact page path", () => {
    expect(doesRedirectSourceOverridePagePath("/about", "/about")).toBe(true);
  });

  test("returns true when exact redirect source matches dynamic page path", () => {
    expect(doesRedirectSourceOverridePagePath("/blog/post", "/blog/:id")).toBe(
      true
    );
  });

  test("returns true when redirect pattern matches exact page path", () => {
    expect(
      doesRedirectSourceOverridePagePath("/blog/:slug", "/blog/post")
    ).toBe(true);
  });

  test("returns true when redirect splat overlaps page path", () => {
    expect(doesRedirectSourceOverridePagePath("/docs/*", "/docs/:id")).toBe(
      true
    );
  });

  test("returns false for exact-query redirect source", () => {
    expect(doesRedirectSourceOverridePagePath("/about?x=1", "/about")).toBe(
      false
    );
  });

  test("returns false when paths do not overlap", () => {
    expect(doesRedirectSourceOverridePagePath("/about", "/contact")).toBe(
      false
    );
  });
});
