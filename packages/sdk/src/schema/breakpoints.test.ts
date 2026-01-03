import { describe, expect, test } from "vitest";
import { Breakpoint } from "./breakpoints";

describe("Breakpoint schema", () => {
  test("accepts valid width-based breakpoints", () => {
    expect(() =>
      Breakpoint.parse({
        id: "1",
        label: "Desktop",
        minWidth: 1024,
      })
    ).not.toThrow();

    expect(() =>
      Breakpoint.parse({
        id: "2",
        label: "Mobile",
        maxWidth: 767,
      })
    ).not.toThrow();

    expect(() =>
      Breakpoint.parse({
        id: "3",
        label: "Base",
      })
    ).not.toThrow();
  });

  test("accepts valid custom condition breakpoints", () => {
    expect(() =>
      Breakpoint.parse({
        id: "1",
        label: "Portrait",
        condition: "orientation:portrait",
      })
    ).not.toThrow();

    expect(() =>
      Breakpoint.parse({
        id: "2",
        label: "Hover",
        condition: "hover:hover",
      })
    ).not.toThrow();

    expect(() =>
      Breakpoint.parse({
        id: "3",
        label: "Dark Mode",
        condition: "prefers-color-scheme:dark",
      })
    ).not.toThrow();
  });

  test("normalizes empty condition to undefined", () => {
    const result = Breakpoint.parse({
      id: "1",
      label: "Test",
      condition: "",
    });
    expect(result.condition).toBeUndefined();

    const result2 = Breakpoint.parse({
      id: "2",
      label: "Test",
      condition: "   ",
    });
    expect(result2.condition).toBeUndefined();
  });

  test("rejects breakpoint with both condition and width", () => {
    expect(() =>
      Breakpoint.parse({
        id: "1",
        label: "Invalid",
        condition: "orientation:portrait",
        minWidth: 1024,
      })
    ).toThrow(
      "Either minWidth, maxWidth, or condition should be defined, but not both"
    );

    expect(() =>
      Breakpoint.parse({
        id: "2",
        label: "Invalid",
        condition: "hover:hover",
        maxWidth: 767,
      })
    ).toThrow(
      "Either minWidth, maxWidth, or condition should be defined, but not both"
    );

    expect(() =>
      Breakpoint.parse({
        id: "3",
        label: "Invalid",
        condition: "hover:hover",
        minWidth: 1024,
        maxWidth: 767,
      })
    ).toThrow(
      "Either minWidth, maxWidth, or condition should be defined, but not both"
    );
  });

  test("rejects breakpoint with both minWidth and maxWidth", () => {
    expect(() =>
      Breakpoint.parse({
        id: "1",
        label: "Invalid",
        minWidth: 1024,
        maxWidth: 767,
      })
    ).toThrow();
  });

  test("preserves valid condition values", () => {
    const result = Breakpoint.parse({
      id: "1",
      label: "Portrait",
      condition: "orientation:portrait",
    });
    expect(result.condition).toBe("orientation:portrait");
    expect(result.minWidth).toBeUndefined();
    expect(result.maxWidth).toBeUndefined();
  });

  test("handles complex conditions", () => {
    const result = Breakpoint.parse({
      id: "1",
      label: "Complex",
      condition: "orientation:portrait and hover:hover",
    });
    expect(result.condition).toBe("orientation:portrait and hover:hover");
  });
});
