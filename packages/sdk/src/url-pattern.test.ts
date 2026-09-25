import { expect, test, describe } from "vitest";
import {
  isPathnamePattern,
  isAbsoluteUrl,
  matchesPathnamePattern,
  removeTrailingSlash,
  validatePathnamePattern,
} from "./url-pattern";

test("removes trailing slashes without changing the root path", () => {
  expect(removeTrailingSlash("/")).toBe("/");
  expect(removeTrailingSlash("/about")).toBe("/about");
  expect(removeTrailingSlash("/about/")).toBe("/about");
  expect(removeTrailingSlash("/about///")).toBe("/about");
  expect(removeTrailingSlash("/file%2Fname/")).toBe("/file%2Fname");
});

test("check pathname is pattern", () => {
  expect(isPathnamePattern("/:name")).toEqual(true);
  expect(isPathnamePattern("/:slug*")).toEqual(true);
  expect(isPathnamePattern("/:id?")).toEqual(true);
  expect(isPathnamePattern("/*")).toEqual(true);

  expect(isPathnamePattern("")).toEqual(false);
  expect(isPathnamePattern("/")).toEqual(false);
  expect(isPathnamePattern("/blog")).toEqual(false);
  expect(isPathnamePattern("/blog/post-name")).toEqual(false);
});

test.each([
  ["/", "/", true],
  ["/", "/docs", false],
  ["/*", "/", true],
  ["/*", "/docs/a", true],
  ["/docs/*", "/docs", true],
  ["/docs/*", "/docs/a", true],
  ["/docs", "/docs/a", false],
  ["/docs/:id", "/docs/a", true],
  ["/docs/:id", "/docs", false],
  ["/docs/:id?", "/docs", true],
  ["/docs/:id?", "/docs/a", true],
  ["/docs/:id?", "/docs/a/b", false],
  ["/docs/:rest*", "/docs/a/b", true],
  ["/Docs", "/docs", false],
  ["/docs", "/docs/", true],
] as const)("matches %s against %s: %s", (pattern, pathname, expected) => {
  expect(matchesPathnamePattern(pattern, pathname)).toBe(expected);
});

test("validates shared auth and header route patterns", () => {
  expect(validatePathnamePattern("/docs/*")).toBeUndefined();
  expect(validatePathnamePattern("/docs/:id?")).toBeUndefined();
  expect(validatePathnamePattern("docs")).toBe('Route must start with "/"');
  expect(validatePathnamePattern("/docs/*/more")).toBe(
    "Wildcard route segment must be the last segment"
  );
});

describe("isAbsoluteUrl", () => {
  test("returns true for absolute URLs", () => {
    expect(isAbsoluteUrl("https://example.com")).toBe(true);
    expect(isAbsoluteUrl("http://example.com")).toBe(true);
    expect(isAbsoluteUrl("https://example.com/path")).toBe(true);
    expect(isAbsoluteUrl("https://example.com/path?query=1")).toBe(true);
    expect(isAbsoluteUrl("https://example.com:8080/path")).toBe(true);
    expect(isAbsoluteUrl("ftp://files.example.com")).toBe(true);
    expect(isAbsoluteUrl("mailto:test@example.com")).toBe(true);
    expect(isAbsoluteUrl("data:text/html,<h1>Hello</h1>")).toBe(true);
  });

  test("returns false for relative URLs", () => {
    expect(isAbsoluteUrl("/path")).toBe(false);
    expect(isAbsoluteUrl("/path/to/file")).toBe(false);
    expect(isAbsoluteUrl("path/to/file")).toBe(false);
    expect(isAbsoluteUrl("./path")).toBe(false);
    expect(isAbsoluteUrl("../path")).toBe(false);
    expect(isAbsoluteUrl("")).toBe(false);
    expect(isAbsoluteUrl("?query=1")).toBe(false);
    expect(isAbsoluteUrl("#hash")).toBe(false);
  });

  test("returns false for invalid URLs", () => {
    expect(isAbsoluteUrl("not a url")).toBe(false);
    expect(isAbsoluteUrl("https://")).toBe(false);
    expect(isAbsoluteUrl("://missing-protocol")).toBe(false);
  });
});
