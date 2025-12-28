export type AreaInfo = {
  name: string;
  columnStart: number;
  columnEnd: number;
  rowStart: number;
  rowEnd: number;
};

/**
 * Parse grid-template-areas CSS string into structured area information
 * @example
 * parseGridAreas('"header header" "sidebar main"')
 * // Returns: [
 * //   { name: 'header', columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 },
 * //   { name: 'sidebar', columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
 * //   { name: 'main', columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 }
 * // ]
 */
export const parseGridAreas = (value: string): AreaInfo[] => {
  if (!value || value === "none") {
    return [];
  }

  const areaMap = new Map<string, AreaInfo>();
  const rows = value.match(/"[^"]+"/g) || [];

  rows.forEach((row, rowIndex) => {
    const names = row.replace(/"/g, "").split(/\s+/).filter(Boolean);
    names.forEach((name, colIndex) => {
      if (name !== ".") {
        if (!areaMap.has(name)) {
          areaMap.set(name, {
            name,
            columnStart: colIndex + 1,
            columnEnd: colIndex + 2,
            rowStart: rowIndex + 1,
            rowEnd: rowIndex + 2,
          });
        } else {
          // Extend the area bounds
          const area = areaMap.get(name)!;
          area.columnEnd = Math.max(area.columnEnd, colIndex + 2);
          area.rowEnd = Math.max(area.rowEnd, rowIndex + 2);
        }
      }
    });
  });

  return Array.from(areaMap.values());
};

/**
 * Generate grid-template-areas CSS string from area information
 * @example
 * generateGridTemplate([
 *   { name: 'header', columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 }
 * ], 2, 2)
 * // Returns: '"header header" ". ."'
 */
export const generateGridTemplate = (
  areas: AreaInfo[],
  columns: number,
  rows: number
): string => {
  // Create a 2D grid filled with dots
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array(columns).fill(".")
  );

  // Fill in each area
  areas.forEach((area) => {
    for (let r = area.rowStart - 1; r < area.rowEnd - 1; r++) {
      for (let c = area.columnStart - 1; c < area.columnEnd - 1; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < columns) {
          grid[r][c] = area.name;
        }
      }
    }
  });

  // Convert to CSS string format
  return grid.map((row) => `"${row.join(" ")}"`).join(" ");
};

/**
 * Get grid dimensions from template columns/rows CSS values
 * @example
 * getGridDimensions('1fr 2fr', '100px 200px 300px')
 * // Returns: { columns: 2, rows: 3 }
 */
export const getGridDimensions = (
  columnsValue: string,
  rowsValue: string
): { columns: number; rows: number } => {
  const columns =
    columnsValue && columnsValue !== "none"
      ? columnsValue.split(/\s+/).filter(Boolean).length
      : 2;
  const rows =
    rowsValue && rowsValue !== "none"
      ? rowsValue.split(/\s+/).filter(Boolean).length
      : 2;
  return { columns, rows };
};

/**
 * Check if two grid areas overlap
 * @example
 * checkOverlap(
 *   { name: 'a', columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 },
 *   { name: 'b', columnStart: 2, columnEnd: 4, rowStart: 1, rowEnd: 2 }
 * )
 * // Returns: true (they overlap in columns 2)
 */
export const checkOverlap = (area1: AreaInfo, area2: AreaInfo): boolean => {
  return (
    area1.columnStart < area2.columnEnd &&
    area1.columnEnd > area2.columnStart &&
    area1.rowStart < area2.rowEnd &&
    area1.rowEnd > area2.rowStart
  );
};

/**
 * Generate a unique area name based on existing names
 * @example
 * generateUniqueAreaName(['Area', 'Area-1'])
 * // Returns: 'Area-2'
 */
export const generateUniqueAreaName = (existingNames: string[]): string => {
  const baseName = "Area";
  const existingNamesSet = new Set(existingNames);

  if (!existingNamesSet.has(baseName)) {
    return baseName;
  }

  let counter = 1;
  while (existingNamesSet.has(`${baseName}-${counter}`)) {
    counter++;
  }
  return `${baseName}-${counter}`;
};

/**
 * Find a non-overlapping position for a new area in the grid
 * Returns the area with a unique name and whether a new row is needed
 * @example
 * findNonOverlappingPosition([], 2, 2)
 * // Returns: { area: { name: 'Area', columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 }, needsNewRow: false }
 */
export const findNonOverlappingPosition = (
  existingAreas: AreaInfo[],
  gridColumns: number,
  gridRows: number
): { area: AreaInfo; needsNewRow: boolean } => {
  const uniqueName = generateUniqueAreaName(existingAreas.map((a) => a.name));

  // Try to find an empty cell in the existing grid
  for (let row = 1; row <= gridRows; row++) {
    for (let col = 1; col <= gridColumns; col++) {
      const testArea: AreaInfo = {
        name: uniqueName,
        columnStart: col,
        columnEnd: col + 1,
        rowStart: row,
        rowEnd: row + 1,
      };

      const hasOverlap = existingAreas.some((existing) =>
        checkOverlap(testArea, existing)
      );

      if (!hasOverlap) {
        return { area: testArea, needsNewRow: false };
      }
    }
  }

  // No empty cell found, need to add a new row
  return {
    area: {
      name: uniqueName,
      columnStart: 1,
      columnEnd: gridColumns + 1,
      rowStart: gridRows + 1,
      rowEnd: gridRows + 2,
    },
    needsNewRow: true,
  };
};

/**
 * Validate area bounds are within grid dimensions
 */
export const isAreaWithinBounds = (
  area: AreaInfo,
  gridColumns: number,
  gridRows: number
): boolean => {
  return (
    area.columnStart >= 1 &&
    area.columnStart < area.columnEnd &&
    area.columnEnd <= gridColumns + 1 &&
    area.rowStart >= 1 &&
    area.rowStart < area.rowEnd &&
    area.rowEnd <= gridRows + 1
  );
};
