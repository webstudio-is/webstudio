/**
 * Shared test suite for redirect path handling consistency.
 *
 * This ensures that redirect paths are handled consistently across:
 * 1. OldPagePath schema validation (SDK)
 * 2. URLPattern matching (builder)
 * 3. Route generation for published sites (react-sdk)
 *
 * If a path is valid in one layer, it should work in all layers.
 */

import { describe, test, expect } from "vitest";
import { OldPagePath, ProjectNewRedirectPath } from "./schema/pages";
import { ALL_VALID_PATHS, ALL_INVALID_PATHS } from "./redirect-path-test-data";

// Re-export for use in other packages
export {
  VALID_REDIRECT_PATHS,
  INVALID_REDIRECT_PATHS,
  ALL_VALID_PATHS,
  ALL_INVALID_PATHS,
  VALID_URLPATTERN_PATHS,
  STATIC_PATHS,
} from "./redirect-path-test-data";

describe("Redirect path validation consistency", () => {
  describe("OldPagePath schema - valid paths", () => {
    test.each(ALL_VALID_PATHS)("accepts: %s", (path) => {
      const result = OldPagePath.safeParse(path);
      expect(result.success).toBe(true);
    });
  });

  describe("OldPagePath schema - invalid paths", () => {
    test.each(ALL_INVALID_PATHS)("rejects: %s", (path) => {
      const result = OldPagePath.safeParse(path);
      expect(result.success).toBe(false);
    });
  });

  describe("ProjectNewRedirectPath schema - valid paths", () => {
    // ProjectNewRedirectPath is more permissive (allows / and external URLs)
    const validTargetPaths = [
      "/",
      "/about",
      "/关于我们",
      "https://example.com",
      "https://example.com/path",
    ];

    test.each(validTargetPaths)("accepts: %s", (path) => {
      const result = ProjectNewRedirectPath.safeParse(path);
      expect(result.success).toBe(true);
    });
  });
});
