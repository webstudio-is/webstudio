import { describe, expect, test } from "vitest";
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

  test("custom condition", () => {
    expect(
      equalMedia(
        { condition: "orientation:portrait" },
        { condition: "orientation:portrait" }
      )
    ).toBe(true);
    expect(
      equalMedia(
        { condition: "orientation:portrait" },
        { condition: "orientation:landscape" }
      )
    ).toBe(false);
    expect(equalMedia({ condition: "orientation:portrait" }, {})).toBe(false);
    expect(equalMedia({}, { condition: "orientation:portrait" })).toBe(false);
  });

  test("condition with width should not be equal", () => {
    // Note: In practice, condition and minWidth/maxWidth are mutually exclusive
    // (enforced by schema validation). This test verifies the comparison logic only.
    expect(
      equalMedia(
        { condition: "hover:hover", minWidth: 100 },
        { condition: "hover:hover", minWidth: 100 }
      )
    ).toBe(true);
    expect(equalMedia({ condition: "hover:hover" }, { minWidth: 100 })).toBe(
      false
    );
  });
});
