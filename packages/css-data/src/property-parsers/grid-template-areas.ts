import { cssTryParseValue } from "../parse-css-value";

export type AreaInfo = {
  name: string;
  columnStart: number;
  columnEnd: number;
  rowStart: number;
  rowEnd: number;
};

/**
 * Parse grid-template-areas CSS string into structured area information.
 * Uses css-tree to parse the value into String AST nodes,
 * then extracts cell names from each row string.
 *
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

  const ast = cssTryParseValue(value);
  if (ast === undefined || ast.type !== "Value") {
    return [];
  }

  const areaMap = new Map<string, AreaInfo>();
  let rowIndex = 0;

  for (const node of ast.children) {
    // Each row in grid-template-areas is a quoted string → String node
    if (node.type !== "String") {
      continue;
    }

    const names = node.value.split(/\s+/).filter(Boolean);
    for (let colIndex = 0; colIndex < names.length; colIndex++) {
      const name = names[colIndex];
      if (name === ".") {
        continue;
      }
      const existing = areaMap.get(name);
      if (existing === undefined) {
        areaMap.set(name, {
          name,
          columnStart: colIndex + 1,
          columnEnd: colIndex + 2,
          rowStart: rowIndex + 1,
          rowEnd: rowIndex + 2,
        });
      } else {
        existing.columnEnd = Math.max(existing.columnEnd, colIndex + 2);
        existing.rowEnd = Math.max(existing.rowEnd, rowIndex + 2);
      }
    }

    rowIndex++;
  }

  return Array.from(areaMap.values());
};
