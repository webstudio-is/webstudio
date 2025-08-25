import { expect, test } from "vitest";
import {
  compilePathnamePattern,
  isPathnamePattern,
  matchPathnamePattern,
  tokenizePathnamePattern,
  validatePathnamePattern,
} from "./url-pattern";

test("decode matched params", () => {
  expect(matchPathnamePattern("/blog/:slug", "/blog/привет")).toEqual({
    slug: "привет",
  });
  expect(
    matchPathnamePattern(
      "/blog/:slug",
      "/blog/%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82"
    )
  ).toEqual({
    slug: "привет",
  });
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

test("tokenize named params in pathname pattern", () => {
  expect(tokenizePathnamePattern("/blog/:id")).toEqual([
    { type: "fragment", value: "/blog/" },
    { type: "param", name: "id", optional: false, splat: false },
  ]);
  expect(tokenizePathnamePattern("/blog/:slug*")).toEqual([
    { type: "fragment", value: "/blog/" },
    { type: "param", name: "slug", optional: false, splat: true },
  ]);
  expect(tokenizePathnamePattern("/blog/:name?")).toEqual([
    { type: "fragment", value: "/blog/" },
    { type: "param", name: "name", optional: true, splat: false },
  ]);
  expect(tokenizePathnamePattern("/blog/*")).toEqual([
    { type: "fragment", value: "/blog/" },
    { type: "param", name: "0", optional: false, splat: true },
  ]);
});

test("tokenize complex pathname pattern", () => {
  expect(tokenizePathnamePattern("/blog/:date/:slug*")).toEqual([
    { type: "fragment", value: "/blog/" },
    { type: "param", name: "date", optional: false, splat: false },
    { type: "fragment", value: "/" },
    { type: "param", name: "slug", optional: false, splat: true },
  ]);
});

test("tokenize trailing fragment", () => {
  expect(tokenizePathnamePattern("/blog/:name/profile")).toEqual([
    { type: "fragment", value: "/blog/" },
    { type: "param", name: "name", optional: false, splat: false },
    { type: "fragment", value: "/profile" },
  ]);
});

test("tokenize pathname without params", () => {
  expect(tokenizePathnamePattern("/blog/post")).toEqual([
    { type: "fragment", value: "/blog/post" },
  ]);
});

test("tokenize empty pathname", () => {
  expect(tokenizePathnamePattern("")).toEqual([
    { type: "fragment", value: "" },
  ]);
});

test("compile pathname pattern with named values", () => {
  expect(
    compilePathnamePattern(tokenizePathnamePattern("/blog/:id/:date"), {
      id: "my-id",
      date: "my-date",
    })
  ).toEqual("/blog/my-id/my-date");
});

test("compile pathname pattern with named values", () => {
  expect(
    compilePathnamePattern(tokenizePathnamePattern("/blog/:id/:date"), {
      id: "my-id",
      date: "my-date",
    })
  ).toEqual("/blog/my-id/my-date");
});

test("compile pathname pattern with named wildcard", () => {
  expect(
    compilePathnamePattern(tokenizePathnamePattern("/blog/:slug*/:date*"), {
      slug: "my-slug",
      date: "my-date",
    })
  ).toEqual("/blog/my-slug/my-date");
});

test("compile pathname pattern with indexed wildcard", () => {
  expect(
    compilePathnamePattern(tokenizePathnamePattern("/blog/*/:slug*/*"), {
      // use random order
      1: "one",
      slug: "my-slug",
      0: "zero",
    })
  ).toEqual("/blog/zero/my-slug/one");
});

test("compile pathname pattern with many indexed wildcards (more than 10)", () => {
  expect(
    compilePathnamePattern(
      tokenizePathnamePattern("/blog/*/*/*/*/*/*/*/*/*/*/*/*"),
      {
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
      }
    )
  ).toEqual(
    "/blog/zero/one/two/three/four/five/six/seven/eight/nine/ten/eleven"
  );
});

test("collapse empty values", () => {
  expect(
    compilePathnamePattern(tokenizePathnamePattern("/blog/*/:slug"), {
      // use random order
      slug: "",
      0: "",
    })
  ).toEqual("/blog//");
});

test("collapse optional values with preceding slash", () => {
  expect(
    compilePathnamePattern(tokenizePathnamePattern("/blog/:slug?/:name?"), {
      slug: "",
    })
  ).toEqual("/blog");
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
    "Dynamic parameters ':name+', ':slug+' shouldn't have the + modifier.",
  ]);
});

test('validate "zero or more" named group modifier', () => {
  expect(validatePathnamePattern("/:name*")).toEqual([]);
  expect(validatePathnamePattern("/:name*/:another*/:slug*")).toEqual([
    "':name*', ':another*' should end the path.",
  ]);
});

test("validate wildcard groups", () => {
  expect(validatePathnamePattern("/*")).toEqual([]);
  expect(validatePathnamePattern("/*?/*?")).toEqual([
    `Optional wildcard '*?' is not allowed.`,
  ]);
  expect(validatePathnamePattern("/*/*")).toEqual([
    `Wildcard '*' should end the path.`,
  ]);
  expect(validatePathnamePattern("/*/last")).toEqual([
    `Wildcard '*' should end the path.`,
  ]);
  expect(validatePathnamePattern("/*?/*/last")).toEqual([
    `Optional wildcard '*?' is not allowed.`,
    `Wildcard '*' should end the path.`,
  ]);
});

test("forbid wildcard group with static parts before", () => {
  expect(validatePathnamePattern("/blog-*")).toEqual([
    `Static parts cannot be mixed with dynamic parameters at 'blog-*'.`,
  ]);
});

test(`forbid named group with "zero or more" modifier and static parts before`, () => {
  expect(validatePathnamePattern("/blog-:slug*")).toEqual([
    `Static parts cannot be mixed with dynamic parameters at 'blog-:slug*'.`,
  ]);
});

test(`forbid named group with static parts before or after`, () => {
  expect(validatePathnamePattern("/prefix-:id")).toEqual([
    `Static parts cannot be mixed with dynamic parameters at 'prefix-:id'.`,
  ]);
  expect(validatePathnamePattern("/:id-suffix")).toEqual([
    `Static parts cannot be mixed with dynamic parameters at ':id-suffix'.`,
  ]);
  expect(validatePathnamePattern("/prefix-:id-suffix")).toEqual([
    `Static parts cannot be mixed with dynamic parameters at 'prefix-:id-suffix'.`,
  ]);
});

test(`? should be allowed in named groups only`, () => {
  expect(validatePathnamePattern("/name?")).toEqual([
    `Optional parameter indicator ? must be at the end of the named parameter. Correct usage: /:param?`,
  ]);
});
