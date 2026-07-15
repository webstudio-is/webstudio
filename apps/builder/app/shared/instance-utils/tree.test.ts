import { expect, test } from "vitest";
import {
  areInstanceSelectorsEqual,
  isDescendantOrSelf,
} from "@webstudio-is/project-build/runtime";

test("compares instance selectors", () => {
  expect(areInstanceSelectorsEqual(["child", "body"], ["child", "body"])).toBe(
    true
  );
  expect(areInstanceSelectorsEqual(["child"], ["other"])).toBe(false);
  expect(areInstanceSelectorsEqual(undefined, ["child"])).toBe(false);
  expect(areInstanceSelectorsEqual(undefined, undefined)).toBe(false);
});

test("is descendant or self", () => {
  expect(isDescendantOrSelf(["1", "2", "3"], [])).toBe(true);
  expect(isDescendantOrSelf(["1", "2", "3"], ["1", "2", "3"])).toBe(true);
  expect(isDescendantOrSelf(["0", "1", "2", "3"], ["1", "2", "3"])).toBe(true);
  expect(isDescendantOrSelf(["1", "2", "3"], ["0", "1", "2", "3"])).toBe(false);
  expect(
    isDescendantOrSelf(
      ["item-child", "collection:entry-1", "collection", "body", "page-root"],
      ["collection", "body", "page-root"]
    )
  ).toBe(true);
});
