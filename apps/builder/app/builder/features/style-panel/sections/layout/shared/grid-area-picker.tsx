import { useRef, useMemo } from "react";
import { theme, Grid, Tooltip, css } from "@webstudio-is/design-system";
import type { AreaInfo } from "@webstudio-is/css-data";

/**
 * Build a map from "col,row" keys to area names for cells occupied by other areas.
 */
const buildOccupiedCellMap = (
  otherAreas: AreaInfo[],
  gridColumns: number,
  gridRows: number
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const area of otherAreas) {
    for (let r = area.rowStart; r < area.rowEnd; r++) {
      for (let c = area.columnStart; c < area.columnEnd; c++) {
        if (c >= 1 && c <= gridColumns && r >= 1 && r <= gridRows) {
          map.set(`${c},${r}`, area.name);
        }
      }
    }
  }
  return map;
};

/**
 * Clamp a rectangle so it does not include any occupied cells.
 * Shrinks the rectangle edge-by-edge from the extension side.
 */
const clampRectangle = (
  anchor: { col: number; row: number },
  target: { col: number; row: number },
  occupied: Map<string, string>
): { colStart: number; colEnd: number; rowStart: number; rowEnd: number } => {
  let colStart = Math.min(anchor.col, target.col);
  let colEnd = Math.max(anchor.col, target.col);
  let rowStart = Math.min(anchor.row, target.row);
  let rowEnd = Math.max(anchor.row, target.row);

  const hasOccupied = (
    cs: number,
    ce: number,
    rs: number,
    re: number
  ): boolean => {
    for (let r = rs; r <= re; r++) {
      for (let c = cs; c <= ce; c++) {
        if (occupied.has(`${c},${r}`)) {
          return true;
        }
      }
    }
    return false;
  };

  // Shrink from the side opposite to anchor until no occupied cells remain
  while (hasOccupied(colStart, colEnd, rowStart, rowEnd)) {
    const shrunk =
      // Try shrinking column range from the side away from anchor
      (colEnd > anchor.col && colEnd > colStart && ((colEnd -= 1), true)) ||
      (colStart < anchor.col && colStart < colEnd && ((colStart += 1), true)) ||
      // Try shrinking row range from the side away from anchor
      (rowEnd > anchor.row && rowEnd > rowStart && ((rowEnd -= 1), true)) ||
      (rowStart < anchor.row && rowStart < rowEnd && ((rowStart += 1), true));

    if (!shrunk) {
      break;
    }
  }

  return { colStart, colEnd, rowStart, rowEnd };
};

/**
 * Compute the result of clicking a cell in the area picker.
 *
 * Returns `undefined` when the click should be ignored (occupied cell).
 * Otherwise returns `{ area, anchor }` with the new area bounds and anchor point.
 *
 * - Clicking an occupied cell → ignored
 * - Clicking a selected cell → resets to 1×1 at that cell (new anchor)
 * - Clicking an unselected cell → extends from anchor, clamped around obstacles
 */
const computeCellClick = (
  col: number,
  row: number,
  value: AreaInfo,
  anchor: { col: number; row: number },
  occupied: Map<string, string>
): { area: AreaInfo; anchor: { col: number; row: number } } | undefined => {
  if (occupied.has(`${col},${row}`)) {
    return undefined;
  }

  const isSelected =
    col >= value.columnStart &&
    col < value.columnEnd &&
    row >= value.rowStart &&
    row < value.rowEnd;

  // Click a selected cell → deselect all, set this cell as the new anchor
  if (isSelected) {
    return {
      area: {
        ...value,
        columnStart: col,
        columnEnd: col + 1,
        rowStart: row,
        rowEnd: row + 1,
      },
      anchor: { col, row },
    };
  }

  // Click an unselected cell → extend from anchor to form a rectangle
  const rect = clampRectangle(anchor, { col, row }, occupied);
  return {
    area: {
      ...value,
      columnStart: rect.colStart,
      columnEnd: rect.colEnd + 1,
      rowStart: rect.rowStart,
      rowEnd: rect.rowEnd + 1,
    },
    anchor,
  };
};

// Export for testing only
export const __testing__ = {
  buildOccupiedCellMap,
  clampRectangle,
  computeCellClick,
};

const freeCellStyle = css({
  minHeight: 20,
  border: "none",
  padding: 0,
  backgroundColor: theme.colors.backgroundControls,
  transition: "background-color 0.1s ease",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.colors.backgroundPrimary,
  },
});

const selectedCellStyle = css({
  minHeight: 20,
  border: "none",
  padding: 0,
  backgroundColor: "transparent",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
});

const occupiedAreaStyle = css({
  minHeight: 20,
  border: "none",
  padding: 0,
  borderRadius: theme.borderRadius[3],
  backgroundColor: theme.colors.backgroundDestructiveMain,
  cursor: "not-allowed",
  opacity: 0.6,
});

const selectedAreaBgStyle = css({
  border: "none",
  borderRadius: theme.borderRadius[3],
  backgroundColor: theme.colors.backgroundPrimary,
  pointerEvents: "none",
});

type GridAreaPickerProps = {
  value: AreaInfo;
  onChange: (value: AreaInfo) => void;
  onHoverChange?: (area: AreaInfo | undefined) => void;
  gridColumns: number;
  gridRows: number;
  otherAreas: AreaInfo[];
};

export const GridAreaPicker = ({
  value,
  onChange,
  onHoverChange,
  gridColumns,
  gridRows,
  otherAreas,
}: GridAreaPickerProps) => {
  const anchorRef = useRef<{ col: number; row: number }>({
    col: value.columnStart,
    row: value.rowStart,
  });

  const occupied = useMemo(
    () => buildOccupiedCellMap(otherAreas, gridColumns, gridRows),
    [otherAreas, gridColumns, gridRows]
  );

  const handleCellClick = (col: number, row: number) => {
    const result = computeCellClick(
      col,
      row,
      value,
      anchorRef.current,
      occupied
    );
    if (result === undefined) {
      return;
    }
    anchorRef.current = result.anchor;
    onChange(result.area);
  };

  // Deduplicate areas for rendering as single spanning elements
  const visibleAreas = useMemo(() => {
    const seen = new Set<string>();
    return otherAreas.filter((area) => {
      if (seen.has(area.name)) {
        return false;
      }
      if (area.columnStart > gridColumns || area.rowStart > gridRows) {
        return false;
      }
      if (area.columnEnd <= 1 || area.rowEnd <= 1) {
        return false;
      }
      seen.add(area.name);
      return true;
    });
  }, [otherAreas, gridColumns, gridRows]);

  const hasSelection =
    value.columnEnd > value.columnStart && value.rowEnd > value.rowStart;

  // Individual buttons for free and selected cells
  const cells = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let row = 1; row <= gridRows; row++) {
      for (let col = 1; col <= gridColumns; col++) {
        if (occupied.has(`${col},${row}`)) {
          continue;
        }
        const isSelected =
          col >= value.columnStart &&
          col < value.columnEnd &&
          row >= value.rowStart &&
          row < value.rowEnd;
        result.push(
          <button
            key={`${col},${row}`}
            className={isSelected ? selectedCellStyle() : freeCellStyle()}
            style={{
              gridColumn: `${col} / ${col + 1}`,
              gridRow: `${row} / ${row + 1}`,
            }}
            onClick={() => handleCellClick(col, row)}
            onMouseEnter={() => {
              onHoverChange?.({
                name: "",
                columnStart: col,
                columnEnd: col + 1,
                rowStart: row,
                rowEnd: row + 1,
              });
            }}
            onMouseLeave={() => onHoverChange?.(undefined)}
            aria-label={`Cell ${col}, ${row}`}
          />
        );
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gridColumns,
    gridRows,
    occupied,
    value.columnStart,
    value.columnEnd,
    value.rowStart,
    value.rowEnd,
  ]);

  return (
    <Grid
      onMouseLeave={() => onHoverChange?.(undefined)}
      css={{
        width: "100%",
        gridTemplateColumns: `repeat(${gridColumns}, minmax(20px, 1fr))`,
        gridTemplateRows: `repeat(${gridRows}, 20px)`,
        gap: 1,
        backgroundColor: theme.colors.borderMain,
        borderRadius: theme.borderRadius[4],
        overflow: "hidden",
      }}
    >
      {/* Selected area background: single element spanning the whole selection */}
      {hasSelection && (
        <div
          className={selectedAreaBgStyle()}
          style={{
            gridColumn: `${value.columnStart} / ${value.columnEnd}`,
            gridRow: `${value.rowStart} / ${value.rowEnd}`,
          }}
        />
      )}

      {/* Occupied areas: one spanning element per area */}
      {visibleAreas.map((area) => {
        const colStart = Math.max(1, area.columnStart);
        const colEnd = Math.min(gridColumns + 1, area.columnEnd);
        const rowStart = Math.max(1, area.rowStart);
        const rowEnd = Math.min(gridRows + 1, area.rowEnd);
        return (
          <Tooltip key={area.name} content={area.name}>
            <button
              disabled
              className={occupiedAreaStyle()}
              style={{
                gridColumn: `${colStart} / ${colEnd}`,
                gridRow: `${rowStart} / ${rowEnd}`,
              }}
              onMouseEnter={() => onHoverChange?.(area)}
              onMouseLeave={() => onHoverChange?.(undefined)}
              aria-label={`Area ${area.name}`}
            />
          </Tooltip>
        );
      })}

      {cells}
    </Grid>
  );
};
