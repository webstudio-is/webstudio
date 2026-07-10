import { expect, test } from "vitest";
import { getTagFromProps, tagProperty } from "./runtime";

test("ignores empty tag overrides", () => {
  expect(getTagFromProps({ [tagProperty]: "" })).toBeUndefined();
  expect(getTagFromProps({ [tagProperty]: "span" })).toBe("span");
});
