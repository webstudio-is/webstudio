import { describe, expect, test } from "vitest";
import { __testing__ } from "./transitions";

const { canAddTransitionToStyleState } = __testing__;

describe("canAddTransitionToStyleState", () => {
  test("allows local styles and pseudo-elements", () => {
    expect(canAddTransitionToStyleState(undefined)).toBe(true);
    expect(canAddTransitionToStyleState("::before")).toBe(true);
    expect(canAddTransitionToStyleState("::after")).toBe(true);
  });

  test("keeps transitions disabled for pseudo-classes", () => {
    expect(canAddTransitionToStyleState(":hover")).toBe(false);
    expect(canAddTransitionToStyleState(":focus")).toBe(false);
  });
});
