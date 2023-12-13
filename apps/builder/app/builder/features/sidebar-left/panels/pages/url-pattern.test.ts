import { expect, test } from "@jest/globals";
import {
  compilePathnamePattern,
  parsePathnamePattern,
  validatePathnamePattern,
} from "./url-pattern";

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

test("validate invalid pattern", () => {
  expect(validatePathnamePattern("/:name*?")).toEqual([
    `Invalid path pattern '/:name*?'`,
  ]);
});

test("validate named groups", () => {
  expect(validatePathnamePattern("/:name")).toEqual([]);
  expect(validatePathnamePattern("/:name/last")).toEqual([]);
});

test("validate named groups with optional modifier", () => {
  expect(validatePathnamePattern("/:name?")).toEqual([]);
  expect(validatePathnamePattern("/:name?/last")).toEqual([]);
});

test('validate "one or more" named group modifier', () => {
  expect(validatePathnamePattern("/:name+/:slug+")).toEqual([
    "+ modifier is not allowed at ':name+', ':slug+'",
  ]);
});

test('validate "zero or more" named group modifier', () => {
  expect(validatePathnamePattern("/:name*")).toEqual([]);
  expect(validatePathnamePattern("/:name*/:another*/:slug*")).toEqual([
    "* modifier is not allowed at ':name*', ':another*' and can be used only in the end",
  ]);
});

test("validate wildcard groups", () => {
  expect(validatePathnamePattern("/*")).toEqual([]);
  expect(validatePathnamePattern("/*?/*?")).toEqual([
    `? modifier is not allowed on wildcard group at '*?'`,
  ]);
  expect(validatePathnamePattern("/*/*")).toEqual([
    `Wildcard group '*' is allowed only in the end`,
  ]);
  expect(validatePathnamePattern("/*/last")).toEqual([
    `Wildcard group '*' is allowed only in the end`,
  ]);
  expect(validatePathnamePattern("/*?/*/last")).toEqual([
    `? modifier is not allowed on wildcard group at '*?'`,
    `Wildcard group '*' is allowed only in the end`,
  ]);
});

test("forbid wildcard group with static parts before", () => {
  expect(validatePathnamePattern("/blog-*")).toEqual([
    `Cannot use wildcard at 'blog-*'`,
  ]);
});

test(`forbid named group with "zero or more" modifier and static parts before`, () => {
  expect(validatePathnamePattern("/blog-:slug*")).toEqual([
    `Cannot use named group at 'blog-:slug*'`,
  ]);
});

test(`forbid named group with static parts before or after`, () => {
  expect(validatePathnamePattern("/prefix-:id")).toEqual([
    `Cannot use named group at 'prefix-:id'`,
  ]);
  expect(validatePathnamePattern("/:id-suffix")).toEqual([
    `Cannot use named group at ':id-suffix'`,
  ]);
  expect(validatePathnamePattern("/prefix-:id-suffix")).toEqual([
    `Cannot use named group at 'prefix-:id-suffix'`,
  ]);
});
