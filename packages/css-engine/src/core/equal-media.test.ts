import { describe, expect, test } from "@jest/globals";
import { equalMedia } from "./equal-media";

describe("equalMedia", () => {
  test("minWidth", () => {
    expect(equalMedia({ minWidth: 100 }, { minWidth: 10 })).toBe(false);
    expect(equalMedia({ minWidth: 100 }, { minWidth: 100 })).toBe(true);
    expect(equalMedia({ minWidth: 100 }, { minWidth: 101 })).toBe(false);
  });

  test("maxWidth", () => {
    expect(equalMedia({ maxWidth: 100 }, { maxWidth: 101 })).toBe(false);
    expect(equalMedia({ maxWidth: 100 }, { maxWidth: 100 })).toBe(true);
    expect(equalMedia({ maxWidth: 100 }, { maxWidth: 10 })).toBe(false);
  });

  test("minWidth and maxWidth", () => {
    expect(equalMedia({ maxWidth: 100, minWidth: 10 }, { maxWidth: 100 })).toBe(
      false
    );
    expect(equalMedia({ maxWidth: 100, minWidth: 10 }, { minWidth: 10 })).toBe(
      false
    );
    expect(
      equalMedia(
        { maxWidth: 100, minWidth: 10 },
        { maxWidth: 100, minWidth: 10 }
      )
    ).toBe(true);
  });
});
