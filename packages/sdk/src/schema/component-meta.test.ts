import { expect, test } from "vitest";
import {
  normalizeComponentCategory,
  shouldFilterComponentCategory,
} from "./component-meta";

test("treats omitted component category as hidden", () => {
  expect(normalizeComponentCategory(undefined)).toBe("hidden");
  expect(shouldFilterComponentCategory(undefined)).toBe(true);
});

test("filters hidden and internal component categories", () => {
  expect(shouldFilterComponentCategory("hidden")).toBe(true);
  expect(shouldFilterComponentCategory("internal")).toBe(true);
  expect(shouldFilterComponentCategory("general")).toBe(false);
});
