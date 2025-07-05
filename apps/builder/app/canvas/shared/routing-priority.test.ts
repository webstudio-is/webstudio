import { test, expect } from "vitest";
import { comparePatterns } from "./routing-priority";

test("sort top-level patterns", () => {
  const patterns = ["/foo*", "/:foo", "/foo"];
  const expected = ["/foo", "/:foo", "/foo*"];
  expect(patterns.toSorted(comparePatterns)).toEqual(expected);
});

test("sort static paths", () => {
  const patterns = ["/a/z", "/a/b/c", "/a/c", "/a/b"];
  const expected = ["/a/b", "/a/c", "/a/z", "/a/b/c"];
  expect(patterns.toSorted(comparePatterns)).toEqual(expected);
});

test("sort mixed static, dynamic, spread at multiple levels", () => {
  const patterns = [
    "/foo",
    "/:id",
    "/bar*",
    "/foo/bar",
    "/foo/:id",
    "/foo/bar*",
  ];
  const expected = [
    // static first-segment
    "/foo",
    "/foo/bar",
    "/foo/:id",
    "/foo/bar*",
    // dynamic then spread at top level
    "/:id",
    "/bar*",
  ];
  expect(patterns.toSorted(comparePatterns)).toEqual(expected);
});

test("sort deeply nested mixed segments", () => {
  const patterns = ["/u/bar", "/u/:id", "/u/bar/b", "/u/:id/c", "/u/bar/*"];
  const expected = [
    // static second-segment
    "/u/bar",
    "/u/bar/b",
    "/u/bar/*",
    // dynamic second-segment
    "/u/:id",
    "/u/:id/c",
  ];
  expect(patterns.toSorted(comparePatterns)).toEqual(expected);
});
