import { describe, expect, test } from "vitest";
import {
  doesRedirectSourceMatchUrl,
  getRedirectSourcePathname,
  getRedirectSourceSearchIndex,
  hasInvalidLocalTargetParams,
  hasNamedSplat,
  isRedirectSourcePattern,
  normalizeRedirectSource,
  stripRedirectSourceFragment,
} from "./redirect-source";

describe("redirect source helpers", () => {
  test("strips source fragments", () => {
    expect(stripRedirectSourceFragment("/old#section")).toBe("/old");
    expect(stripRedirectSourceFragment("/old?x=1#section")).toBe("/old?x=1");
  });

  test("normalizes encoded pathname variants without changing search", () => {
    expect(normalizeRedirectSource("/%C3%BCber?x=a%20b")).toBe("/über?x=a%20b");
    expect(normalizeRedirectSource("/path%20with%20spaces?x=a+b")).toBe(
      "/path with spaces?x=a+b"
    );
  });

  test("does not decode encoded slashes into path separators", () => {
    expect(normalizeRedirectSource("/file%2Fname")).toBe("/file%2Fname");
  });

  test("keeps malformed percent escapes unchanged", () => {
    expect(normalizeRedirectSource("/%E0%A4%A")).toBe("/%E0%A4%A");
  });

  test("gets normalized pathname without search", () => {
    expect(getRedirectSourcePathname("/%C3%BCber?x=1")).toBe("/über");
  });

  test("distinguishes optional path segments from query delimiters", () => {
    expect(getRedirectSourceSearchIndex("/blog/:slug?")).toBe(-1);
    expect(getRedirectSourceSearchIndex("/blog/:slug?/comments")).toBe(-1);
    expect(getRedirectSourceSearchIndex("/en?/about")).toBe(-1);
    expect(getRedirectSourceSearchIndex("/one?/:two?/three")).toBe(-1);
    expect(getRedirectSourceSearchIndex("/blog/:slug?preview=1")).toBe(11);
    expect(getRedirectSourceSearchIndex("/old?x=1")).toBe(4);
  });

  test("matches path-only sources against requests with query strings", () => {
    expect(doesRedirectSourceMatchUrl("/old", "/old?x=1")).toBe(true);
  });

  test("matches query-specific sources exactly", () => {
    expect(doesRedirectSourceMatchUrl("/old?x=1", "/old?x=1")).toBe(true);
    expect(doesRedirectSourceMatchUrl("/old?x=1", "/old?x=2")).toBe(false);
    expect(doesRedirectSourceMatchUrl("/old?x=1", "/old")).toBe(false);
  });

  test("matches encoded and decoded pathname spellings", () => {
    expect(doesRedirectSourceMatchUrl("/über", "/%C3%BCber")).toBe(true);
    expect(doesRedirectSourceMatchUrl("/%C3%BCber", "/über")).toBe(true);
  });

  test("detects redirect route patterns", () => {
    expect(isRedirectSourcePattern("/blog/:slug")).toBe(true);
    expect(isRedirectSourcePattern("/docs/*")).toBe(true);
    expect(isRedirectSourcePattern("/en?/about")).toBe(true);
    expect(isRedirectSourcePattern("/time/12:30")).toBe(false);
    expect(isRedirectSourcePattern("/file*name")).toBe(false);
  });

  test("detects named splats that are not supported for new redirect inputs", () => {
    expect(hasNamedSplat("/docs/:path*")).toBe(true);
    expect(hasNamedSplat("/docs/:path*/edit")).toBe(true);
    expect(hasNamedSplat("/docs/*")).toBe(false);
    expect(hasNamedSplat("/blog/:slug")).toBe(false);
    expect(hasNamedSplat("/file*name")).toBe(false);
  });

  test("detects unsupported local target param syntax", () => {
    expect(hasInvalidLocalTargetParams("/posts/:slug")).toBe(false);
    expect(hasInvalidLocalTargetParams("/posts/:year-:slug")).toBe(true);
    expect(hasInvalidLocalTargetParams("/posts?slug=:slug")).toBe(true);
    expect(hasInvalidLocalTargetParams("/time/12:30")).toBe(false);
    expect(hasInvalidLocalTargetParams("https://example.com/:slug")).toBe(
      false
    );
  });

  test("detects target params not provided by source patterns", () => {
    expect(hasInvalidLocalTargetParams("/posts/:slug", "/blog/:slug")).toBe(
      false
    );
    expect(hasInvalidLocalTargetParams("/reference/*", "/docs/*")).toBe(false);
    expect(hasInvalidLocalTargetParams("/posts/:slug", "/old")).toBe(true);
    expect(hasInvalidLocalTargetParams("/posts/:slug", "/blog?x=1")).toBe(true);
    expect(hasInvalidLocalTargetParams("/posts/:missing", "/blog/:slug")).toBe(
      true
    );
    expect(
      hasInvalidLocalTargetParams("https://example.com/:missing", "/blog/:slug")
    ).toBe(false);
  });
});
