import { expect, test } from "@jest/globals";
import { isPathnamePattern } from "./url-pattern";

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
