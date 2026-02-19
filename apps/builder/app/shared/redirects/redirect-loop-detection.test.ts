import { describe, test, expect } from "vitest";
import { wouldCreateLoop, detectLoopsInBatch } from "./redirect-loop-detection";
import type { PageRedirect } from "@webstudio-is/sdk";

describe("wouldCreateLoop", () => {
  describe("self-redirect detection", () => {
    test("returns true for direct self-redirect", () => {
      expect(wouldCreateLoop("/about", "/about", [])).toBe(true);
    });

    test("returns true for self-redirect with existing redirects", () => {
      const existing: PageRedirect[] = [
        { old: "/other", new: "/page", status: "301" },
      ];
      expect(wouldCreateLoop("/about", "/about", existing)).toBe(true);
    });
  });

  describe("direct loop detection (A → B → A)", () => {
    test("returns true when target redirects back to source", () => {
      const existing: PageRedirect[] = [
        { old: "/b", new: "/a", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/b", existing)).toBe(true);
    });

    test("returns false when no loop exists", () => {
      const existing: PageRedirect[] = [
        { old: "/b", new: "/c", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/b", existing)).toBe(false);
    });
  });

  describe("chain loop detection (A → B → C → A)", () => {
    test("returns true for 3-node loop", () => {
      const existing: PageRedirect[] = [
        { old: "/b", new: "/c", status: "301" },
        { old: "/c", new: "/a", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/b", existing)).toBe(true);
    });

    test("returns true for longer chain loop", () => {
      const existing: PageRedirect[] = [
        { old: "/b", new: "/c", status: "301" },
        { old: "/c", new: "/d", status: "301" },
        { old: "/d", new: "/e", status: "301" },
        { old: "/e", new: "/a", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/b", existing)).toBe(true);
    });

    test("returns false for chain that doesn't loop back", () => {
      const existing: PageRedirect[] = [
        { old: "/b", new: "/c", status: "301" },
        { old: "/c", new: "/d", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/b", existing)).toBe(false);
    });
  });

  describe("external URLs", () => {
    test("returns false for external http URL target", () => {
      const existing: PageRedirect[] = [
        { old: "/b", new: "/a", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "http://example.com/b", existing)).toBe(
        false
      );
    });

    test("returns false for external https URL target", () => {
      const existing: PageRedirect[] = [
        { old: "/b", new: "/a", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "https://example.com/b", existing)).toBe(
        false
      );
    });

    test("returns false for protocol-relative URL target", () => {
      expect(wouldCreateLoop("/a", "//example.com/b", [])).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("returns false when no existing redirects", () => {
      expect(wouldCreateLoop("/a", "/b", [])).toBe(false);
    });

    test("returns false when target is not redirected anywhere", () => {
      const existing: PageRedirect[] = [
        { old: "/other", new: "/somewhere", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/b", existing)).toBe(false);
    });

    test("handles redirect to home page", () => {
      const existing: PageRedirect[] = [{ old: "/", new: "/a", status: "301" }];
      expect(wouldCreateLoop("/a", "/", existing)).toBe(true);
    });

    test("prevents infinite loop in detection with circular existing redirects", () => {
      // Existing redirects already have a loop (shouldn't happen but be defensive)
      const existing: PageRedirect[] = [
        { old: "/b", new: "/c", status: "301" },
        { old: "/c", new: "/b", status: "301" },
      ];
      // Should return true because following /b leads to a cycle
      expect(wouldCreateLoop("/a", "/b", existing)).toBe(true);
    });
  });
});

describe("detectLoopsInBatch", () => {
  describe("loops within imported set", () => {
    test("detects direct loop in imported redirects", () => {
      const newRedirects: PageRedirect[] = [
        { old: "/a", new: "/b", status: "301" },
        { old: "/b", new: "/a", status: "301" },
      ];
      const result = detectLoopsInBatch(newRedirects, []);

      expect(result.valid).toHaveLength(1);
      expect(result.valid[0]).toEqual({ old: "/a", new: "/b", status: "301" });
      expect(result.looped).toHaveLength(1);
      expect(result.looped[0].redirect).toEqual({
        old: "/b",
        new: "/a",
        status: "301",
      });
      expect(result.looped[0].reason).toContain("loop");
    });

    test("detects chain loop in imported redirects", () => {
      const newRedirects: PageRedirect[] = [
        { old: "/a", new: "/b", status: "301" },
        { old: "/b", new: "/c", status: "301" },
        { old: "/c", new: "/a", status: "301" },
      ];
      const result = detectLoopsInBatch(newRedirects, []);

      expect(result.valid).toHaveLength(2);
      expect(result.looped).toHaveLength(1);
      expect(result.looped[0].redirect.old).toBe("/c");
    });

    test("detects self-redirect in imported redirects", () => {
      const newRedirects: PageRedirect[] = [
        { old: "/a", new: "/a", status: "301" },
        { old: "/b", new: "/c", status: "301" },
      ];
      const result = detectLoopsInBatch(newRedirects, []);

      expect(result.valid).toHaveLength(1);
      expect(result.valid[0].old).toBe("/b");
      expect(result.looped).toHaveLength(1);
      expect(result.looped[0].redirect.old).toBe("/a");
    });
  });

  describe("loops with existing redirects", () => {
    test("detects loop that would form with existing redirects", () => {
      const existing: PageRedirect[] = [
        { old: "/b", new: "/a", status: "301" },
      ];
      const newRedirects: PageRedirect[] = [
        { old: "/a", new: "/b", status: "301" },
      ];
      const result = detectLoopsInBatch(newRedirects, existing);

      expect(result.valid).toHaveLength(0);
      expect(result.looped).toHaveLength(1);
    });

    test("detects chain loop with existing redirects", () => {
      const existing: PageRedirect[] = [
        { old: "/c", new: "/a", status: "301" },
      ];
      const newRedirects: PageRedirect[] = [
        { old: "/a", new: "/b", status: "301" },
        { old: "/b", new: "/c", status: "301" },
      ];
      const result = detectLoopsInBatch(newRedirects, existing);

      // First redirect is fine: /a → /b (no loop yet)
      // Second redirect creates: /a → /b → /c → /a (loop!)
      expect(result.valid).toHaveLength(1);
      expect(result.looped).toHaveLength(1);
      expect(result.looped[0].redirect.old).toBe("/b");
    });
  });

  describe("valid imports", () => {
    test("returns all redirects as valid when no loops", () => {
      const newRedirects: PageRedirect[] = [
        { old: "/a", new: "/b", status: "301" },
        { old: "/c", new: "/d", status: "301" },
        { old: "/e", new: "/f", status: "301" },
      ];
      const result = detectLoopsInBatch(newRedirects, []);

      expect(result.valid).toHaveLength(3);
      expect(result.looped).toHaveLength(0);
    });

    test("handles empty input", () => {
      const result = detectLoopsInBatch([], []);

      expect(result.valid).toHaveLength(0);
      expect(result.looped).toHaveLength(0);
    });

    test("allows external URL targets", () => {
      const existing: PageRedirect[] = [
        { old: "https://example.com/a", new: "/a", status: "301" },
      ];
      const newRedirects: PageRedirect[] = [
        { old: "/a", new: "https://example.com/a", status: "301" },
      ];
      const result = detectLoopsInBatch(newRedirects, existing);

      // External URL can't create a loop
      expect(result.valid).toHaveLength(1);
      expect(result.looped).toHaveLength(0);
    });
  });
});
