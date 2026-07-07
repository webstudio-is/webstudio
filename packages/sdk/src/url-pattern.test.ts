import { expect, test, describe } from "vitest";
import { isPathnamePattern, isAbsoluteUrl } from "./url-pattern";

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
