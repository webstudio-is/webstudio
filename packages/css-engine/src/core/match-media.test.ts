import { describe, expect, test } from "@jest/globals";
import { matchMedia } from "./match-media";

describe("matchMedia", () => {
  test("minWidth", () => {
    expect(matchMedia({ minWidth: 100 }, 10)).toBe(false);
    expect(matchMedia({ minWidth: 100 }, 100)).toBe(true);
    expect(matchMedia({ minWidth: 100 }, 101)).toBe(true);
  });

  test("maxWidth", () => {
    expect(matchMedia({ maxWidth: 100 }, 101)).toBe(false);
    expect(matchMedia({ maxWidth: 100 }, 100)).toBe(true);
    expect(matchMedia({ maxWidth: 100 }, 10)).toBe(true);
  });

  test("minWidth and maxWidth", () => {
    expect(matchMedia({ maxWidth: 100, minWidth: 10 }, 9)).toBe(false);
    expect(matchMedia({ maxWidth: 100, minWidth: 10 }, 101)).toBe(false);
    expect(matchMedia({ maxWidth: 100, minWidth: 10 }, 100)).toBe(true);
    expect(matchMedia({ maxWidth: 100, minWidth: 10 }, 10)).toBe(true);
    expect(matchMedia({ maxWidth: 100, minWidth: 10 }, 11)).toBe(true);
  });
});
