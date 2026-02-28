import { describe, test, expect } from "vitest";
import { __testing__ } from "./grid-area-picker";
import type { AreaInfo } from "@webstudio-is/css-data";

const { buildOccupiedCellMap, clampRectangle, computeCellClick } = __testing__;

describe("buildOccupiedCellMap", () => {
  test("returns empty map when no areas", () => {
    const map = buildOccupiedCellMap([], 3, 3);
    expect(map.size).toBe(0);
  });

  test("maps single 1×1 area", () => {
    const areas: AreaInfo[] = [
      { name: "a", columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
    ];
    const map = buildOccupiedCellMap(areas, 3, 3);
    expect(map.get("1,1")).toBe("a");
    expect(map.has("2,1")).toBe(false);
  });

  test("maps multi-cell area", () => {
    const areas: AreaInfo[] = [
      { name: "header", columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 },
    ];
    const map = buildOccupiedCellMap(areas, 3, 3);
    expect(map.get("1,1")).toBe("header");
    expect(map.get("2,1")).toBe("header");
    expect(map.has("3,1")).toBe(false);
  });

  test("maps multiple areas", () => {
    const areas: AreaInfo[] = [
      { name: "a", columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
      { name: "b", columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
    ];
    const map = buildOccupiedCellMap(areas, 3, 3);
    expect(map.get("1,1")).toBe("a");
    expect(map.get("2,1")).toBe("b");
  });

  test("clamps to grid bounds", () => {
    const areas: AreaInfo[] = [
      { name: "big", columnStart: 1, columnEnd: 10, rowStart: 1, rowEnd: 10 },
    ];
    const map = buildOccupiedCellMap(areas, 2, 2);
    expect(map.get("1,1")).toBe("big");
    expect(map.get("2,2")).toBe("big");
    expect(map.has("3,1")).toBe(false);
  });
});

describe("clampRectangle", () => {
  test("returns single cell when no obstacles", () => {
    const result = clampRectangle(
      { col: 1, row: 1 },
      { col: 1, row: 1 },
      new Map()
    );
    expect(result).toEqual({
      colStart: 1,
      colEnd: 1,
      rowStart: 1,
      rowEnd: 1,
    });
  });

  test("returns full rectangle when no obstacles", () => {
    const result = clampRectangle(
      { col: 1, row: 1 },
      { col: 3, row: 2 },
      new Map()
    );
    expect(result).toEqual({
      colStart: 1,
      colEnd: 3,
      rowStart: 1,
      rowEnd: 2,
    });
  });

  test("shrinks from target side to avoid occupied cell", () => {
    const occupied = new Map([["3,1", "other"]]);
    const result = clampRectangle(
      { col: 1, row: 1 },
      { col: 3, row: 1 },
      occupied
    );
    expect(result).toEqual({
      colStart: 1,
      colEnd: 2,
      rowStart: 1,
      rowEnd: 1,
    });
  });

  test("works when target is before anchor", () => {
    const result = clampRectangle(
      { col: 3, row: 3 },
      { col: 1, row: 1 },
      new Map()
    );
    expect(result).toEqual({
      colStart: 1,
      colEnd: 3,
      rowStart: 1,
      rowEnd: 3,
    });
  });

  test("shrinks columns first, then rows to avoid occupied cell", () => {
    // Occupied cell at col 1, row 3 — columns shrink first (colEnd 2→1),
    // then rows shrink (rowEnd 3→2) to clear "1,3"
    const occupied = new Map([["1,3", "other"]]);
    const result = clampRectangle(
      { col: 1, row: 1 },
      { col: 2, row: 3 },
      occupied
    );
    expect(result).toEqual({
      colStart: 1,
      colEnd: 1,
      rowStart: 1,
      rowEnd: 2,
    });
  });
});

describe("computeCellClick", () => {
  const baseArea: AreaInfo = {
    name: "test",
    columnStart: 1,
    columnEnd: 2,
    rowStart: 1,
    rowEnd: 2,
  };

  test("ignores click on occupied cell", () => {
    const occupied = new Map([["2,1", "other"]]);
    const result = computeCellClick(
      2,
      1,
      baseArea,
      { col: 1, row: 1 },
      occupied
    );
    expect(result).toBeUndefined();
  });

  test("clicking selected cell resets to 1×1 at that cell", () => {
    const area: AreaInfo = {
      name: "test",
      columnStart: 1,
      columnEnd: 4,
      rowStart: 1,
      rowEnd: 3,
    };
    const result = computeCellClick(2, 2, area, { col: 1, row: 1 }, new Map());
    expect(result).toEqual({
      area: {
        name: "test",
        columnStart: 2,
        columnEnd: 3,
        rowStart: 2,
        rowEnd: 3,
      },
      anchor: { col: 2, row: 2 },
    });
  });

  test("clicking unselected cell extends from anchor", () => {
    const result = computeCellClick(
      3,
      3,
      baseArea,
      { col: 1, row: 1 },
      new Map()
    );
    expect(result).toEqual({
      area: {
        name: "test",
        columnStart: 1,
        columnEnd: 4,
        rowStart: 1,
        rowEnd: 4,
      },
      anchor: { col: 1, row: 1 },
    });
  });

  test("extending to diagonal cell forms full rectangle", () => {
    // click (1,1) then (6,6) — should select 1-6 × 1-6
    const area: AreaInfo = {
      name: "test",
      columnStart: 1,
      columnEnd: 2,
      rowStart: 1,
      rowEnd: 2,
    };
    const result = computeCellClick(6, 6, area, { col: 1, row: 1 }, new Map());
    expect(result).toEqual({
      area: {
        name: "test",
        columnStart: 1,
        columnEnd: 7,
        rowStart: 1,
        rowEnd: 7,
      },
      anchor: { col: 1, row: 1 },
    });
  });

  test("extending after reset forms new rectangle from new anchor", () => {
    // After resetting to (2,2), clicking (7,7) should select 2-7 × 2-7
    const area: AreaInfo = {
      name: "test",
      columnStart: 2,
      columnEnd: 3,
      rowStart: 2,
      rowEnd: 3,
    };
    const result = computeCellClick(7, 7, area, { col: 2, row: 2 }, new Map());
    expect(result).toEqual({
      area: {
        name: "test",
        columnStart: 2,
        columnEnd: 8,
        rowStart: 2,
        rowEnd: 8,
      },
      anchor: { col: 2, row: 2 },
    });
  });

  test("extending clamps around occupied cells", () => {
    const occupied = new Map([["3,1", "other"]]);
    const result = computeCellClick(
      4,
      1,
      baseArea,
      { col: 1, row: 1 },
      occupied
    );
    // Can't include col 3, so clamps to col 1-2
    expect(result).toEqual({
      area: {
        name: "test",
        columnStart: 1,
        columnEnd: 3,
        rowStart: 1,
        rowEnd: 2,
      },
      anchor: { col: 1, row: 1 },
    });
  });

  test("clicking the only selected cell (1×1) still resets anchor", () => {
    const result = computeCellClick(
      1,
      1,
      baseArea,
      { col: 1, row: 1 },
      new Map()
    );
    expect(result).toEqual({
      area: {
        name: "test",
        columnStart: 1,
        columnEnd: 2,
        rowStart: 1,
        rowEnd: 2,
      },
      anchor: { col: 1, row: 1 },
    });
  });

  test("clicking selected cell in square selection resets to 1×1", () => {
    const squareArea: AreaInfo = {
      name: "test",
      columnStart: 1,
      columnEnd: 4,
      rowStart: 1,
      rowEnd: 4,
    };
    const result = computeCellClick(
      2,
      2,
      squareArea,
      { col: 1, row: 1 },
      new Map()
    );
    expect(result).toEqual({
      area: {
        name: "test",
        columnStart: 2,
        columnEnd: 3,
        rowStart: 2,
        rowEnd: 3,
      },
      anchor: { col: 2, row: 2 },
    });
  });
});
