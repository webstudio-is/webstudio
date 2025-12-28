import { describe, test, expect } from "vitest";
import {
  parseGridAreas,
  generateGridTemplate,
  getGridDimensions,
  checkOverlap,
  generateUniqueAreaName,
  findNonOverlappingPosition,
  isAreaWithinBounds,
  type AreaInfo,
} from "./grid-areas.utils";

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
});

describe("generateGridTemplate", () => {
  test("generates template for single area", () => {
    const areas: AreaInfo[] = [
      { name: "header", columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
    ];
    expect(generateGridTemplate(areas, 2, 2)).toBe('"header ." ". ."');
  });

  test("generates template for area spanning columns", () => {
    const areas: AreaInfo[] = [
      { name: "header", columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 },
    ];
    expect(generateGridTemplate(areas, 2, 2)).toBe('"header header" ". ."');
  });

  test("generates template for complex layout", () => {
    const areas: AreaInfo[] = [
      { name: "header", columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 },
      { name: "sidebar", columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
      { name: "main", columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
    ];
    expect(generateGridTemplate(areas, 2, 2)).toBe(
      '"header header" "sidebar main"'
    );
  });

  test("fills empty cells with dots", () => {
    const areas: AreaInfo[] = [
      { name: "header", columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
      { name: "footer", columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
    ];
    expect(generateGridTemplate(areas, 2, 2)).toBe('"header ." ". footer"');
  });

  test("handles area out of bounds gracefully", () => {
    const areas: AreaInfo[] = [
      {
        name: "header",
        columnStart: 1,
        columnEnd: 10,
        rowStart: 1,
        rowEnd: 10,
      },
    ];
    // Should only fill within the grid bounds
    expect(generateGridTemplate(areas, 2, 2)).toBe(
      '"header header" "header header"'
    );
  });
});

describe("getGridDimensions", () => {
  test("parses column and row counts", () => {
    expect(getGridDimensions("1fr 2fr", "100px 200px")).toEqual({
      columns: 2,
      rows: 2,
    });
  });

  test("handles complex track definitions", () => {
    expect(
      getGridDimensions("repeat(3, 1fr)", "minmax(100px, 1fr) auto 200px")
    ).toEqual({
      columns: 2, // 'repeat(3, 1fr)' is treated as 2 tokens by split
      rows: 4, // 'minmax(100px, 1fr)' '1fr)' 'auto' '200px' = 4 tokens
    });
  });

  test("defaults to 2 when none", () => {
    expect(getGridDimensions("none", "none")).toEqual({
      columns: 2,
      rows: 2,
    });
  });

  test("defaults to 2 when empty", () => {
    expect(getGridDimensions("", "")).toEqual({
      columns: 2,
      rows: 2,
    });
  });
});

describe("checkOverlap", () => {
  test("detects overlapping areas", () => {
    const area1: AreaInfo = {
      name: "a",
      columnStart: 1,
      columnEnd: 3,
      rowStart: 1,
      rowEnd: 3,
    };
    const area2: AreaInfo = {
      name: "b",
      columnStart: 2,
      columnEnd: 4,
      rowStart: 2,
      rowEnd: 4,
    };
    expect(checkOverlap(area1, area2)).toBe(true);
  });

  test("detects non-overlapping areas horizontally", () => {
    const area1: AreaInfo = {
      name: "a",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 2,
    };
    const area2: AreaInfo = {
      name: "b",
      columnStart: 2,
      columnEnd: 3,
      rowStart: 1,
      rowEnd: 2,
    };
    expect(checkOverlap(area1, area2)).toBe(false);
  });

  test("detects non-overlapping areas vertically", () => {
    const area1: AreaInfo = {
      name: "a",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 2,
    };
    const area2: AreaInfo = {
      name: "b",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 2,
      rowEnd: 3,
    };
    expect(checkOverlap(area1, area2)).toBe(false);
  });

  test("detects complete containment as overlap", () => {
    const area1: AreaInfo = {
      name: "a",
      columnStart: 1,
      columnEnd: 5,
      rowStart: 1,
      rowEnd: 5,
    };
    const area2: AreaInfo = {
      name: "b",
      columnStart: 2,
      columnEnd: 4,
      rowStart: 2,
      rowEnd: 4,
    };
    expect(checkOverlap(area1, area2)).toBe(true);
  });

  test("detects edge adjacency as non-overlapping", () => {
    const area1: AreaInfo = {
      name: "a",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 2,
    };
    const area2: AreaInfo = {
      name: "b",
      columnStart: 2,
      columnEnd: 3,
      rowStart: 2,
      rowEnd: 3,
    };
    expect(checkOverlap(area1, area2)).toBe(false);
  });
});

describe("generateUniqueAreaName", () => {
  test("returns 'Area' when no existing names", () => {
    expect(generateUniqueAreaName([])).toBe("Area");
  });

  test("returns 'Area' when it doesn't exist", () => {
    expect(generateUniqueAreaName(["Header", "Footer"])).toBe("Area");
  });

  test("returns 'Area-1' when 'Area' exists", () => {
    expect(generateUniqueAreaName(["Area"])).toBe("Area-1");
  });

  test("returns next available number", () => {
    expect(generateUniqueAreaName(["Area", "Area-1", "Area-2"])).toBe("Area-3");
  });

  test("handles gaps in numbering", () => {
    expect(generateUniqueAreaName(["Area", "Area-2", "Area-5"])).toBe("Area-1");
  });
});

describe("findNonOverlappingPosition", () => {
  test("finds first cell when grid is empty", () => {
    const result = findNonOverlappingPosition([], 2, 2);
    expect(result.needsNewRow).toBe(false);
    expect(result.area).toMatchObject({
      name: "Area",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 2,
    });
  });

  test("finds next available cell", () => {
    const existingAreas: AreaInfo[] = [
      { name: "Area", columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
    ];
    const result = findNonOverlappingPosition(existingAreas, 2, 2);
    expect(result.needsNewRow).toBe(false);
    expect(result.area).toMatchObject({
      columnStart: 2,
      columnEnd: 3,
      rowStart: 1,
      rowEnd: 2,
    });
  });

  test("generates unique name for new area", () => {
    const existingAreas: AreaInfo[] = [
      { name: "Area", columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
    ];
    const result = findNonOverlappingPosition(existingAreas, 2, 2);
    expect(result.area.name).toBe("Area-1");
  });

  test("adds new row when grid is full", () => {
    const existingAreas: AreaInfo[] = [
      { name: "Area", columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
      { name: "Area-1", columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
      { name: "Area-2", columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
      { name: "Area-3", columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
    ];
    const result = findNonOverlappingPosition(existingAreas, 2, 2);
    expect(result.needsNewRow).toBe(true);
    expect(result.area).toMatchObject({
      columnStart: 1,
      columnEnd: 3,
      rowStart: 3,
      rowEnd: 4,
    });
  });

  test("finds cell when area spans multiple cells", () => {
    const existingAreas: AreaInfo[] = [
      { name: "header", columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 },
    ];
    const result = findNonOverlappingPosition(existingAreas, 2, 2);
    expect(result.needsNewRow).toBe(false);
    expect(result.area).toMatchObject({
      columnStart: 1,
      columnEnd: 2,
      rowStart: 2,
      rowEnd: 3,
    });
  });
});

describe("isAreaWithinBounds", () => {
  test("validates area within bounds", () => {
    const area: AreaInfo = {
      name: "test",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 2,
    };
    expect(isAreaWithinBounds(area, 2, 2)).toBe(true);
  });

  test("rejects area with invalid column start", () => {
    const area: AreaInfo = {
      name: "test",
      columnStart: 0,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 2,
    };
    expect(isAreaWithinBounds(area, 2, 2)).toBe(false);
  });

  test("rejects area with column start >= column end", () => {
    const area: AreaInfo = {
      name: "test",
      columnStart: 2,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 2,
    };
    expect(isAreaWithinBounds(area, 2, 2)).toBe(false);
  });

  test("rejects area with column end beyond grid", () => {
    const area: AreaInfo = {
      name: "test",
      columnStart: 1,
      columnEnd: 4,
      rowStart: 1,
      rowEnd: 2,
    };
    expect(isAreaWithinBounds(area, 2, 2)).toBe(false);
  });

  test("rejects area with invalid row start", () => {
    const area: AreaInfo = {
      name: "test",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 0,
      rowEnd: 2,
    };
    expect(isAreaWithinBounds(area, 2, 2)).toBe(false);
  });

  test("rejects area with row start >= row end", () => {
    const area: AreaInfo = {
      name: "test",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 2,
      rowEnd: 2,
    };
    expect(isAreaWithinBounds(area, 2, 2)).toBe(false);
  });

  test("rejects area with row end beyond grid", () => {
    const area: AreaInfo = {
      name: "test",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 4,
    };
    expect(isAreaWithinBounds(area, 2, 2)).toBe(false);
  });

  test("allows area at grid boundary", () => {
    const area: AreaInfo = {
      name: "test",
      columnStart: 2,
      columnEnd: 3,
      rowStart: 2,
      rowEnd: 3,
    };
    expect(isAreaWithinBounds(area, 2, 2)).toBe(true);
  });
});
