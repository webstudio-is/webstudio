import { describe, test, expect } from "vitest";
import { parseGridAreas } from "./grid-template-areas";

describe("parseGridAreas", () => {
  test("parses empty or none value", () => {
    expect(parseGridAreas("")).toEqual([]);
    expect(parseGridAreas("none")).toEqual([]);
  });

  test("parses single area", () => {
    const result = parseGridAreas('"header"');
    expect(result).toEqual([
      {
        name: "header",
        columnStart: 1,
        columnEnd: 2,
        rowStart: 1,
        rowEnd: 2,
      },
    ]);
  });

  test("parses area spanning multiple columns", () => {
    const result = parseGridAreas('"header header header"');
    expect(result).toEqual([
      {
        name: "header",
        columnStart: 1,
        columnEnd: 4,
        rowStart: 1,
        rowEnd: 2,
      },
    ]);
  });

  test("parses multiple areas in one row", () => {
    const result = parseGridAreas('"sidebar main"');
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      name: "sidebar",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 2,
    });
    expect(result).toContainEqual({
      name: "main",
      columnStart: 2,
      columnEnd: 3,
      rowStart: 1,
      rowEnd: 2,
    });
  });

  test("parses area spanning multiple rows", () => {
    const result = parseGridAreas('"sidebar main" "sidebar footer"');
    expect(result).toHaveLength(3);
    expect(result).toContainEqual({
      name: "sidebar",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 3,
    });
  });

  test("parses complex layout with multiple rows and columns", () => {
    const result = parseGridAreas(
      '"header header" "sidebar main" "footer footer"'
    );
    expect(result).toHaveLength(4);
    expect(result).toContainEqual({
      name: "header",
      columnStart: 1,
      columnEnd: 3,
      rowStart: 1,
      rowEnd: 2,
    });
    expect(result).toContainEqual({
      name: "sidebar",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 2,
      rowEnd: 3,
    });
    expect(result).toContainEqual({
      name: "main",
      columnStart: 2,
      columnEnd: 3,
      rowStart: 2,
      rowEnd: 3,
    });
    expect(result).toContainEqual({
      name: "footer",
      columnStart: 1,
      columnEnd: 3,
      rowStart: 3,
      rowEnd: 4,
    });
  });

  test("ignores dots (empty cells)", () => {
    const result = parseGridAreas('"header ." ". main"');
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      name: "header",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 2,
    });
    expect(result).toContainEqual({
      name: "main",
      columnStart: 2,
      columnEnd: 3,
      rowStart: 2,
      rowEnd: 3,
    });
  });

  test("returns empty array for invalid value", () => {
    expect(parseGridAreas("not-valid-areas")).toEqual([]);
  });

  test("parses area spanning both rows and columns", () => {
    const result = parseGridAreas(
      '"logo logo nav" "logo logo content" "footer footer footer"'
    );
    expect(result).toContainEqual({
      name: "logo",
      columnStart: 1,
      columnEnd: 3,
      rowStart: 1,
      rowEnd: 3,
    });
    expect(result).toContainEqual({
      name: "nav",
      columnStart: 3,
      columnEnd: 4,
      rowStart: 1,
      rowEnd: 2,
    });
    expect(result).toContainEqual({
      name: "content",
      columnStart: 3,
      columnEnd: 4,
      rowStart: 2,
      rowEnd: 3,
    });
    expect(result).toContainEqual({
      name: "footer",
      columnStart: 1,
      columnEnd: 4,
      rowStart: 3,
      rowEnd: 4,
    });
  });
});
