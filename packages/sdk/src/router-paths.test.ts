/**
 * Shared test suite for router path handling consistency.
 *
 * This ensures that router paths are handled consistently across:
 * 1. Path schema validation (SDK) - OldPagePath, page paths
 * 2. URLPattern matching (builder) - used for all page routing
 * 3. Route generation for published sites (react-sdk)
 *
 * If a path is valid in one layer, it should work in all layers.
 */

import { describe, test, expect } from "vitest";
import { OldPagePath, ProjectNewRedirectPath } from "./schema/pages";
import { ALL_VALID_PATHS, ALL_INVALID_PATHS } from "./router-path-test-data";

// Re-export for use in other packages
export {
  VALID_ROUTER_PATHS,
  INVALID_ROUTER_PATHS,
  ALL_VALID_PATHS,
  ALL_INVALID_PATHS,
  VALID_URLPATTERN_PATHS,
  STATIC_PATHS,
} from "./router-path-test-data";

describe("Router path validation consistency", () => {
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
