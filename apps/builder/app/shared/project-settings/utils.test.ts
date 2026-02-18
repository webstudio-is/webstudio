import { describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { PageRedirect } from "@webstudio-is/sdk";
import { getExistingRoutePaths, findMatchingRedirect } from "./utils";

describe("getExistingRoutePaths", () => {
  test("gets all the route paths that exists in the project", () => {
    const pages = createDefaultPages({
      rootInstanceId: "rootInstanceId",
      homePageId: "homePageId",
    });

    pages.pages.push({
      id: "pageId",
      meta: {},
      name: "Page",
      path: "/page",
      rootInstanceId: "rootInstanceId",
      title: `"Page"`,
    });

    pages.pages.push({
      id: "blogId",
      meta: {},
      name: "Blog",
      path: "/blog/:id",
      rootInstanceId: "rootInstanceId",
      title: `"Blog"`,
    });

    const result = getExistingRoutePaths(pages);
    expect(Array.from(result)).toEqual(["/page", "/blog/:id"]);
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

    test("returns undefined when no match found", () => {
      const redirects = [createRedirect("/about")];
      const result = findMatchingRedirect("/contact", redirects);
      expect(result).toBeUndefined();
    });

    test("matches home page path /", () => {
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
