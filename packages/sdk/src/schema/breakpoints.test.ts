import { describe, expect, test } from "vitest";
import { breakpoint } from "./breakpoints";

describe("Breakpoint schema", () => {
  test("accepts valid width-based breakpoints", () => {
    expect(() =>
      breakpoint.parse({
        id: "1",
        label: "Desktop",
        minWidth: 1024,
      })
    ).not.toThrow();

    expect(() =>
      breakpoint.parse({
        id: "2",
        label: "Mobile",
        maxWidth: 767,
      })
    ).not.toThrow();

    expect(() =>
      breakpoint.parse({
        id: "3",
        label: "Base",
      })
    ).not.toThrow();
  });

  test("accepts valid custom condition breakpoints", () => {
    expect(() =>
      breakpoint.parse({
        id: "1",
        label: "Portrait",
        condition: "orientation:portrait",
      })
    ).not.toThrow();

    expect(() =>
      breakpoint.parse({
        id: "2",
        label: "Hover",
        condition: "hover:hover",
      })
    ).not.toThrow();

    expect(() =>
      breakpoint.parse({
        id: "3",
        label: "Dark Mode",
        condition: "prefers-color-scheme:dark",
      })
    ).not.toThrow();
  });

  test("normalizes empty condition to undefined", () => {
    const result = breakpoint.parse({
      id: "1",
      label: "Test",
      condition: "",
    });
    expect(result.condition).toBeUndefined();

    const result2 = breakpoint.parse({
      id: "2",
      label: "Test",
      condition: "   ",
    });
    expect(result2.condition).toBeUndefined();
  });

  test("rejects breakpoint with both condition and width", () => {
    expect(() =>
      breakpoint.parse({
        id: "1",
        label: "Invalid",
        condition: "orientation:portrait",
        minWidth: 1024,
      })
    ).toThrow();

    expect(() =>
      breakpoint.parse({
        id: "2",
        label: "Invalid",
        condition: "hover:hover",
        maxWidth: 767,
      })
    ).toThrow();

    expect(() =>
      breakpoint.parse({
        id: "3",
        label: "Invalid",
        condition: "hover:hover",
        minWidth: 1024,
        maxWidth: 767,
      })
    ).toThrow();
  });

  test("allows breakpoint with both minWidth and maxWidth when min < max", () => {
    const result = breakpoint.parse({
      id: "1",
      label: "Tablet range",
      minWidth: 768,
      maxWidth: 1024,
    });
    expect(result.minWidth).toBe(768);
    expect(result.maxWidth).toBe(1024);
    expect(result.condition).toBeUndefined();
  });

  test("rejects breakpoint with minWidth >= maxWidth", () => {
    expect(() =>
      breakpoint.parse({
        id: "1",
        label: "Invalid",
        minWidth: 1024,
        maxWidth: 767,
      })
    ).toThrow();

    expect(() =>
      breakpoint.parse({
        id: "2",
        label: "Invalid",
        minWidth: 768,
        maxWidth: 768,
      })
    ).toThrow();
  });

  test("preserves valid condition values", () => {
    const result = breakpoint.parse({
      id: "1",
      label: "Portrait",
      condition: "orientation:portrait",
    });
    expect(result.condition).toBe("orientation:portrait");
    expect(result.minWidth).toBeUndefined();
    expect(result.maxWidth).toBeUndefined();
  });

  test("handles complex conditions", () => {
    const result = breakpoint.parse({
      id: "1",
      label: "Complex",
      condition: "orientation:portrait and hover:hover",
    });
    expect(result.condition).toBe("orientation:portrait and hover:hover");
  });
});
