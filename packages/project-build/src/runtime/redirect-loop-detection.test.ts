import { describe, test, expect } from "vitest";
import type { PageRedirect } from "@webstudio-is/sdk";
import { detectLoopsInBatch, wouldCreateLoop } from "./redirect-loop-detection";

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

    test("returns true for self-redirect with target fragment", () => {
      expect(wouldCreateLoop("/about", "/about#section", [])).toBe(true);
    });

    test("returns true for self-redirect with source fragment", () => {
      expect(wouldCreateLoop("/about#section", "/about", [])).toBe(true);
    });

    test("returns true when path-only source redirects to the same path with query", () => {
      expect(wouldCreateLoop("/about", "/about?x=1", [])).toBe(true);
    });

    test("returns true when path-only source redirects to the same path with relative query", () => {
      expect(wouldCreateLoop("/about", "?x=1", [])).toBe(true);
    });

    test("returns true when source redirects to itself through relative target", () => {
      expect(wouldCreateLoop("/about", "about", [])).toBe(true);
    });

    test("returns true for encoded and decoded variants of the same path", () => {
      expect(wouldCreateLoop("/%C3%BCber", "/über", [])).toBe(true);
      expect(wouldCreateLoop("/über", "/%C3%BCber", [])).toBe(true);
    });

    test("returns true for matching exact query redirect", () => {
      expect(wouldCreateLoop("/about?x=1", "/about?x=1", [])).toBe(true);
    });

    test("returns false for different exact query redirect", () => {
      expect(wouldCreateLoop("/about?x=1", "/about?x=2", [])).toBe(false);
    });

    test("returns true when dynamic source matches the target path", () => {
      expect(wouldCreateLoop("/blog/:slug", "/blog/post", [])).toBe(true);
    });

    test("returns true when wildcard source matches the target path", () => {
      expect(wouldCreateLoop("/docs/*", "/docs/api/reference", [])).toBe(true);
    });

    test("returns true when optional static source matches the target path", () => {
      expect(wouldCreateLoop("/en?/about", "/en/about", [])).toBe(true);
    });
  });

  describe("direct loop detection", () => {
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

    test("returns true when target redirects back to source without fragments", () => {
      const existing: PageRedirect[] = [
        { old: "/b#section", new: "/a#target", status: "301" },
      ];
      expect(wouldCreateLoop("/a#source", "/b#target", existing)).toBe(true);
    });

    test("returns true when existing path-only redirect matches target query string", () => {
      const existing: PageRedirect[] = [
        { old: "/b", new: "/a", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/b?x=1", existing)).toBe(true);
    });

    test("returns true when existing redirect source is an encoded path variant", () => {
      const existing: PageRedirect[] = [
        { old: "/%C3%BCber", new: "/a", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/über", existing)).toBe(true);
    });

    test("returns true when existing dynamic redirect matches target path", () => {
      const existing: PageRedirect[] = [
        { old: "/blog/:slug", new: "/a", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/blog/post", existing)).toBe(true);
    });

    test("returns true when existing optional static redirect matches target path", () => {
      const existing: PageRedirect[] = [
        { old: "/en?/about", new: "/a", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/en/about", existing)).toBe(true);
    });

    test("returns true when relative target resolves to an existing redirect source", () => {
      const existing: PageRedirect[] = [
        { old: "/new", new: "/old", status: "301" },
      ];
      expect(wouldCreateLoop("/old", "new", existing)).toBe(true);
    });

    test("returns true when nested relative target resolves to an existing redirect source", () => {
      const existing: PageRedirect[] = [
        { old: "/old/new", new: "/old/", status: "301" },
      ];
      expect(wouldCreateLoop("/old/", "new", existing)).toBe(true);
    });

    test("follows the first matching existing redirect like the published runtime", () => {
      const existing: PageRedirect[] = [
        { old: "/b", new: "/c", status: "301" },
        { old: "/b", new: "/a", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/b", existing)).toBe(false);
    });
  });

  describe("chain loop detection", () => {
    test("returns true for three-node loop", () => {
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

    test("returns false for chain that does not loop back", () => {
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

    test("returns false for non-path URL targets handled externally by runtime", () => {
      expect(wouldCreateLoop("/a", "mailto:test@example.com", [])).toBe(false);
      expect(wouldCreateLoop("/a", "#section", [])).toBe(false);
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
      const existing: PageRedirect[] = [
        { old: "/b", new: "/c", status: "301" },
        { old: "/c", new: "/b", status: "301" },
      ];
      expect(wouldCreateLoop("/a", "/b", existing)).toBe(true);
    });
  });
});

describe("detectLoopsInBatch", () => {
  test("detects direct loop in imported redirects", () => {
    const newRedirects: PageRedirect[] = [
      { old: "/a", new: "/b", status: "301" },
      { old: "/b", new: "/a", status: "301" },
    ];
    const result = detectLoopsInBatch(newRedirects, []);

    expect(result.valid).toEqual([{ old: "/a", new: "/b", status: "301" }]);
    expect(result.looped).toEqual([
      {
        redirect: { old: "/b", new: "/a", status: "301" },
        reason: "Creates redirect loop",
      },
    ]);
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
    expect(result.looped[0]?.redirect.old).toBe("/c");
  });

  test("detects self-redirect in imported redirects", () => {
    const newRedirects: PageRedirect[] = [
      { old: "/a", new: "/a", status: "301" },
      { old: "/b", new: "/c", status: "301" },
    ];
    const result = detectLoopsInBatch(newRedirects, []);

    expect(result.valid).toEqual([{ old: "/b", new: "/c", status: "301" }]);
    expect(result.looped).toHaveLength(1);
    expect(result.looped[0]?.redirect.old).toBe("/a");
  });

  test("detects loop that would form with existing redirects", () => {
    const existing: PageRedirect[] = [{ old: "/b", new: "/a", status: "301" }];
    const newRedirects: PageRedirect[] = [
      { old: "/a", new: "/b", status: "301" },
    ];
    const result = detectLoopsInBatch(newRedirects, existing);

    expect(result.valid).toHaveLength(0);
    expect(result.looped).toHaveLength(1);
  });

  test("detects chain loop with existing redirects", () => {
    const existing: PageRedirect[] = [{ old: "/c", new: "/a", status: "301" }];
    const newRedirects: PageRedirect[] = [
      { old: "/a", new: "/b", status: "301" },
      { old: "/b", new: "/c", status: "301" },
    ];
    const result = detectLoopsInBatch(newRedirects, existing);

    expect(result.valid).toEqual([{ old: "/a", new: "/b", status: "301" }]);
    expect(result.looped).toHaveLength(1);
    expect(result.looped[0]?.redirect.old).toBe("/b");
  });

  test("returns all redirects as valid when no loops", () => {
    const newRedirects: PageRedirect[] = [
      { old: "/a", new: "/b", status: "301" },
      { old: "/c", new: "/d", status: "301" },
      { old: "/e", new: "/f", status: "301" },
    ];
    const result = detectLoopsInBatch(newRedirects, []);

    expect(result.valid).toEqual(newRedirects);
    expect(result.looped).toHaveLength(0);
  });

  test("handles empty input", () => {
    expect(detectLoopsInBatch([], [])).toEqual({ valid: [], looped: [] });
  });

  test("allows external URL targets", () => {
    const existing: PageRedirect[] = [
      { old: "https://example.com/a", new: "/a", status: "301" },
    ];
    const newRedirects: PageRedirect[] = [
      { old: "/a", new: "https://example.com/a", status: "301" },
    ];
    const result = detectLoopsInBatch(newRedirects, existing);

    expect(result.valid).toHaveLength(1);
    expect(result.looped).toHaveLength(0);
  });
});
