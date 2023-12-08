import { expect, test } from "@jest/globals";
import { compilePathnamePattern, parsePathnamePattern } from "./url-pattern";

test("parse keys from pathname pattern", () => {
  expect(parsePathnamePattern("/blog/:id/:date")).toEqual(["id", "date"]);
});

test("parse wildcard and named wildcard from pathname pattern", () => {
  expect(parsePathnamePattern("/blog/*/:slug*/*")).toEqual(["0", "1", "slug"]);
});

test("compile pathname pattern with named values", () => {
  expect(
    compilePathnamePattern("/blog/:id/:date", { id: "my-id", date: "my-date" })
  ).toEqual("/blog/my-id/my-date");
});

test("compile pathname pattern with named wildcard", () => {
  expect(
    compilePathnamePattern("/blog/:slug*/:date*", {
      slug: "my-slug",
      date: "my-date",
    })
  ).toEqual("/blog/my-slug/my-date");
});

test("compile pathname pattern with indexed wildcard", () => {
  expect(
    compilePathnamePattern("/blog/*/:slug*/*", {
      // use random order
      1: "one",
      slug: "my-slug",
      0: "zero",
    })
  ).toEqual("/blog/zero/my-slug/one");
});

test("compile pathname pattern with many indexed wildcards (more than 10)", () => {
  expect(
    compilePathnamePattern("/blog/*/*/*/*/*/*/*/*/*/*/*/*", {
      // use random order
      11: "eleven",
      10: "ten",
      9: "nine",
      8: "eight",
      7: "seven",
      6: "six",
      5: "five",
      4: "four",
      3: "three",
      2: "two",
      1: "one",
      0: "zero",
    })
  ).toEqual(
    "/blog/zero/one/two/three/four/five/six/seven/eight/nine/ten/eleven"
  );
});

test("ignore compiling empty values", () => {
  expect(
    compilePathnamePattern("/blog/*/:slug", {
      // use random order
      slug: "",
      0: "",
    })
  ).toEqual("/blog/*/:slug");
});
