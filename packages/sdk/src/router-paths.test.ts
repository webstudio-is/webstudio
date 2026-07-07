/**
 * Shared test suite for router path handling consistency.
 *
 * This ensures that router paths are handled consistently across:
 * 1. Path schema validation (SDK) - redirect source paths
 * 2. URLPattern matching (builder) - used for all page routing
 * 3. Route generation for published sites (react-sdk)
 *
 * If a path is valid in one layer, it should work in all layers.
 */

import { describe, test, expect } from "vitest";
import { projectNewRedirectPath, redirectSourcePath } from "./schema/pages";
import {
  REDIRECT_SOURCE_INVALID_PATHS,
  REDIRECT_SOURCE_VALID_PATHS,
} from "./router-path-test-data";

describe("Router path validation consistency", () => {
  describe("redirectSourcePath schema - valid paths", () => {
    test.each(REDIRECT_SOURCE_VALID_PATHS)("accepts: %s", (path) => {
      const result = redirectSourcePath.safeParse(path);
      expect(result.success).toBe(true);
    });
  });

  describe("redirectSourcePath schema - invalid paths", () => {
    test.each(REDIRECT_SOURCE_INVALID_PATHS)("rejects: %s", (path) => {
      const result = redirectSourcePath.safeParse(path);
      expect(result.success).toBe(false);
    });
  });

  describe("projectNewRedirectPath schema - valid paths", () => {
    // projectNewRedirectPath is more permissive (allows / and external URLs)
    const validTargetPaths = [
      "/",
      "/about",
      "/关于我们",
      "https://example.com",
      "https://example.com/path",
    ];

    test.each(validTargetPaths)("accepts: %s", (path) => {
      const result = projectNewRedirectPath.safeParse(path);
      expect(result.success).toBe(true);
    });
  });
});
