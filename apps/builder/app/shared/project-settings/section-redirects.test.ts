import { describe, expect, test } from "vitest";
import type { PageRedirect } from "@webstudio-is/sdk";
import { __testing__ } from "./section-redirects";

const { validateFromPath, validateToPath } = __testing__;

describe("validateFromPath", () => {
  describe("format validation", () => {
    test("returns error for empty path", () => {
      const result = validateFromPath("", [], new Set());
      expect(result.errors).toContain("Can't be empty");
      expect(result.warnings).toEqual([]);
    });

    test("returns error for just /", () => {
      const result = validateFromPath("/", [], new Set());
      expect(result.errors).toContain("Can't be just a /");
      expect(result.warnings).toEqual([]);
    });

    test("returns error for path not starting with /", () => {
      const result = validateFromPath("page", [], new Set());
      expect(result.errors).toContain(
        "Must start with a / or a full URL e.g. https://website.org"
      );
      expect(result.warnings).toEqual([]);
    });

    test("returns error for path ending with /", () => {
      const result = validateFromPath("/page/", [], new Set());
      expect(result.errors).toContain("Can't end with a /");
      expect(result.warnings).toEqual([]);
    });

    test("returns error for path with double slashes", () => {
      const result = validateFromPath("/page//subpage", [], new Set());
      expect(result.errors).toContain("Can't contain repeating /");
      expect(result.warnings).toEqual([]);
    });

    test("returns error for path with invalid characters", () => {
      const result = validateFromPath("/page name", [], new Set());
      expect(result.errors).toContain(
        "Path contains invalid characters (spaces or URL-unsafe characters are not allowed)"
      );
      expect(result.warnings).toEqual([]);
    });

    test("returns error for reserved /s prefix", () => {
      const result = validateFromPath("/s/something", [], new Set());
      expect(result.errors).toContain("/s prefix is reserved for the system");
      expect(result.warnings).toEqual([]);
    });

    test("returns error for reserved /build prefix", () => {
      const result = validateFromPath("/build/something", [], new Set());
      expect(result.errors).toContain(
        "/build prefix is reserved for the system"
      );
      expect(result.warnings).toEqual([]);
    });

    test("accepts valid path", () => {
      const result = validateFromPath("/valid-path", [], new Set());
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test("accepts path with allowed special characters", () => {
      const result = validateFromPath(
        "/path-name_123:param?query",
        [],
        new Set()
      );
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test("accepts path with uppercase letters", () => {
      const result = validateFromPath("/Path/SubPage", [], new Set());
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test("accepts path with wildcard", () => {
      const result = validateFromPath("/blog/*", [], new Set());
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test("accepts path with named parameter", () => {
      const result = validateFromPath("/blog/:slug", [], new Set());
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test("accepts path with optional parameter", () => {
      const result = validateFromPath("/page/:id?", [], new Set());
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test("accepts path with multiple parameters", () => {
      const result = validateFromPath(
        "/blog/:year/:month/:slug",
        [],
        new Set()
      );
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test("accepts path with named splat", () => {
      const result = validateFromPath("/docs/:path*", [], new Set());
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test("accepts deeply nested path with wildcard", () => {
      const result = validateFromPath("/api/v1/users/*", [], new Set());
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    test("skips duplicate/warning checks for paths not starting with /", () => {
      // External URLs or other formats that pass schema validation
      // but don't start with / should skip the duplicate redirect
      // and existing page checks (since those only apply to local paths)
      const existingRedirects: Array<PageRedirect> = [
        { old: "https://old.com/page", new: "/new", status: "301" },
      ];
      const existingPaths = new Set(["https://old.com/page"]);

      // Even though this path "exists" in redirects and pages,
      // no error/warning because it doesn't start with /
      // Note: This tests the current behavior - external URLs bypass checks
      const result = validateFromPath(
        "https://old.com/page",
        existingRedirects,
        existingPaths
      );
      // The schema may reject this, but if it passes, no duplicate check
      // If schema rejects, we get format errors instead
      expect(result.warnings).toEqual([]);
    });
  });

  describe("duplicate redirect validation", () => {
    const existingRedirects: Array<PageRedirect> = [
      { old: "/old-page", new: "/new-page", status: "301" },
      { old: "/another-old", new: "/another-new", status: "302" },
      { old: "/blog/*", new: "/articles", status: "301" },
      { old: "/posts/:slug", new: "/blog", status: "301" },
    ];

    test("returns error when redirect already exists for path", () => {
      const result = validateFromPath(
        "/old-page",
        existingRedirects,
        new Set()
      );
      expect(result.errors).toContain("This path is already being redirected");
      expect(result.warnings).toEqual([]);
    });

    test("returns error when wildcard redirect already exists", () => {
      const result = validateFromPath("/blog/*", existingRedirects, new Set());
      expect(result.errors).toContain("This path is already being redirected");
      expect(result.warnings).toEqual([]);
    });

    test("returns error when parameterized redirect already exists", () => {
      const result = validateFromPath(
        "/posts/:slug",
        existingRedirects,
        new Set()
      );
      expect(result.errors).toContain("This path is already being redirected");
      expect(result.warnings).toEqual([]);
    });

    test("returns error for duplicate even if page exists (error takes precedence)", () => {
      const existingPaths = new Set(["/old-page"]);
      const result = validateFromPath(
        "/old-page",
        existingRedirects,
        existingPaths
      );
      expect(result.errors).toContain("This path is already being redirected");
      expect(result.warnings).toEqual([]);
    });

    test("allows path that is not already redirected", () => {
      const result = validateFromPath(
        "/different-path",
        existingRedirects,
        new Set()
      );
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe("existing page warning", () => {
    const existingPaths = new Set(["/about", "/contact", "/blog/:id"]);

    test("returns warning when redirecting from existing page path", () => {
      const result = validateFromPath("/about", [], existingPaths);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toContain(
        "This redirect will override an existing page"
      );
    });

    test("returns warning for dynamic route path", () => {
      const result = validateFromPath("/blog/:id", [], existingPaths);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toContain(
        "This redirect will override an existing page"
      );
    });

    test("no warning for path that doesn't exist as page", () => {
      const result = validateFromPath("/new-redirect", [], existingPaths);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });
});

describe("validateToPath", () => {
  // Note: ProjectNewRedirectPath uses `new URL(data, baseURL)` which is permissive
  // for most strings. However, empty strings are explicitly rejected.

  test("rejects empty path", () => {
    const errors = validateToPath("");
    expect(errors).toContain("Path is required");
  });

  test("accepts relative path with spaces (URL-encoded)", () => {
    const errors = validateToPath("path with spaces");
    expect(errors).toEqual([]);
  });

  test("accepts relative path starting with /", () => {
    const errors = validateToPath("/new-page");
    expect(errors).toEqual([]);
  });

  test("accepts absolute URL", () => {
    const errors = validateToPath("https://example.com/page");
    expect(errors).toEqual([]);
  });

  test("accepts home page path", () => {
    const errors = validateToPath("/");
    expect(errors).toEqual([]);
  });

  test("accepts path with query parameters", () => {
    const errors = validateToPath("/page?param=value");
    expect(errors).toEqual([]);
  });

  test("accepts path with hash fragment", () => {
    const errors = validateToPath("/page#section");
    expect(errors).toEqual([]);
  });

  test("accepts external URL with path", () => {
    const errors = validateToPath("https://other-site.com/path/to/page");
    expect(errors).toEqual([]);
  });

  test("accepts protocol-relative URL", () => {
    const errors = validateToPath("//example.com/page");
    expect(errors).toEqual([]);
  });
});

describe("redirect patterns (integration tests)", () => {
  // These tests document the supported redirect patterns
  // and how they should be validated together

  test("exact path redirect: /old → /new", () => {
    const fromResult = validateFromPath("/old-about", [], new Set());
    const toErrors = validateToPath("/about");
    expect(fromResult.errors).toEqual([]);
    expect(toErrors).toEqual([]);
  });

  test("wildcard redirect: /old/* → /new (all paths go to single destination)", () => {
    const fromResult = validateFromPath("/old-blog/*", [], new Set());
    const toErrors = validateToPath("/blog");
    expect(fromResult.errors).toEqual([]);
    expect(toErrors).toEqual([]);
  });

  test("parameterized from path: /old/:slug → /new (param captured but not substituted)", () => {
    // Note: The :slug is captured by the router but cannot be substituted
    // into the "to" path - all matching URLs redirect to the same destination
    const fromResult = validateFromPath("/old/:slug", [], new Set());
    const toErrors = validateToPath("/new");
    expect(fromResult.errors).toEqual([]);
    expect(toErrors).toEqual([]);
  });

  test("complex pattern: /posts/:year/:month/* → /archive", () => {
    const fromResult = validateFromPath("/posts/:year/:month/*", [], new Set());
    const toErrors = validateToPath("/archive");
    expect(fromResult.errors).toEqual([]);
    expect(toErrors).toEqual([]);
  });

  test("redirect to external URL", () => {
    const fromResult = validateFromPath("/legacy-page", [], new Set());
    const toErrors = validateToPath("https://new-domain.com/page");
    expect(fromResult.errors).toEqual([]);
    expect(toErrors).toEqual([]);
  });

  test("redirect to home page", () => {
    const fromResult = validateFromPath("/old-home", [], new Set());
    const toErrors = validateToPath("/");
    expect(fromResult.errors).toEqual([]);
    expect(toErrors).toEqual([]);
  });
});

describe("shared schema validation", () => {
  // This test documents that validateToPath uses the same ProjectNewRedirectPath
  // schema that is used in page-settings.tsx for page redirect destinations.
  // This ensures consistent validation across the codebase.

  test("validateToPath uses ProjectNewRedirectPath schema (shared with page settings)", () => {
    // Valid paths that should work in both places
    expect(validateToPath("/page")).toEqual([]);
    expect(validateToPath("https://example.com")).toEqual([]);
    expect(validateToPath("/")).toEqual([]);

    // The schema is imported from @webstudio-is/sdk and shared
    // between section-redirects.tsx and page-settings.tsx
  });
});
