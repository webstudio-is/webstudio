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

// Export for testing only
export const __testing__ = {
  buildOccupiedCellMap,
  clampRectangle,
};

const pickerCellStyle = css({
  width: 16,
  height: 16,
  borderRadius: theme.borderRadius[3],
  backgroundColor: theme.colors.backgroundControls,
  border: `1px solid ${theme.colors.borderMain}`,
  transition: "all 0.1s ease",
  cursor: "pointer",
  "&:hover": {
    borderColor: theme.colors.borderFocus,
  },
  '&[data-state="selected"]': {
    backgroundColor: theme.colors.backgroundPrimary,
    borderColor: theme.colors.borderFocus,
  },
  '&[data-state="disabled"]': {
    backgroundColor: theme.colors.backgroundDestructiveMain,
    borderColor: theme.colors.borderDestructiveMain,
    cursor: "not-allowed",
    opacity: 0.6,
  },
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

  const isCellSelected = (col: number, row: number): boolean => {
    return (
      col >= value.columnStart &&
      col < value.columnEnd &&
      row >= value.rowStart &&
      row < value.rowEnd
    );
  };

  const handleCellClick = (col: number, row: number) => {
    if (occupied.has(`${col},${row}`)) {
      return;
    }

    const isSelected = isCellSelected(col, row);

    // Click a selected cell → narrow to just this 1×1 cell
    if (isSelected) {
      anchorRef.current = { col, row };
      onChange({
        ...value,
        columnStart: col,
        columnEnd: col + 1,
        rowStart: row,
        rowEnd: row + 1,
      });
      return;
    }

    // Click an unselected cell → extend from anchor
    const rect = clampRectangle(anchorRef.current, { col, row }, occupied);
    onChange({
      ...value,
      columnStart: rect.colStart,
      columnEnd: rect.colEnd + 1,
      rowStart: rect.rowStart,
      rowEnd: rect.rowEnd + 1,
    });
  };

  const cells = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let row = 1; row <= gridRows; row++) {
      for (let col = 1; col <= gridColumns; col++) {
        const key = `${col},${row}`;
        const occupiedBy = occupied.get(key);
        const isDisabled = occupiedBy !== undefined;
        const isSelected = isCellSelected(col, row);

        const state = isDisabled
          ? "disabled"
          : isSelected
            ? "selected"
            : undefined;

        const cell = (
          <button
            key={key}
            className={pickerCellStyle()}
            data-state={state}
            onMouseEnter={() => {
              if (isDisabled) {
                const area = otherAreas.find((a) => a.name === occupiedBy);
                onHoverChange?.(area);
              } else {
                onHoverChange?.({
                  name: "",
                  columnStart: col,
                  columnEnd: col + 1,
                  rowStart: row,
                  rowEnd: row + 1,
                });
              }
            }}
            onMouseLeave={() => onHoverChange?.(undefined)}
            onClick={() => handleCellClick(col, row)}
            disabled={isDisabled}
            aria-label={`Cell ${col}, ${row}${occupiedBy ? ` (${occupiedBy})` : ""}`}
          />
        );

        if (isDisabled && occupiedBy) {
          result.push(
            <Tooltip key={key} content={occupiedBy}>
              {cell}
            </Tooltip>
          );
        } else {
          result.push(cell);
        }
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
      onMouseLeave={() => {
        onHoverChange?.(undefined);
      }}
      css={{
        gridTemplateColumns: `repeat(${gridColumns}, 16px)`,
        gridTemplateRows: `repeat(${gridRows}, 16px)`,
        gap: 1,
      }}
    >
      {cells}
    </Grid>
  );
};
