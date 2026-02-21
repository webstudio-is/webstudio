import { useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Flex,
  Grid,
  theme,
  Text,
  FloatingPanel,
  Tooltip,
  css,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { parseGridTemplateTrackList } from "@webstudio-is/css-data";
import { useComputedStyleDecl } from "../../../shared/model";
import { createBatchUpdate } from "../../../shared/use-style-data";

const parseTrackCount = (value: string): number => {
  if (!value || value === "none") {
    return 2; // Default to 2×2 grid
  }
  const tracks = parseGridTemplateTrackList(value);
  return tracks.length || 2;
};

const selectorCellStyle = css({
  width: 16,
  height: 16,
  borderRadius: theme.borderRadius[3],
  backgroundColor: theme.colors.backgroundControls,
  border: `1px solid ${theme.colors.borderMain}`,
  transition: "all 0.1s ease",
  "&:hover": {
    borderColor: theme.colors.borderFocus,
  },
  variants: {
    highlighted: {
      true: {
        backgroundColor: theme.colors.backgroundHover,
        borderColor: theme.colors.borderFocus,
      },
    },
  },
});

type GridSizeSelectorProps = {
  onSelect: (columns: number, rows: number) => void;
  initialColumns: number;
  initialRows: number;
};

const GridSizeSelector = ({
  onSelect,
  initialColumns,
  initialRows,
}: GridSizeSelectorProps) => {
  const [hoveredCell, setHoveredCell] = useState<{
    col: number;
    row: number;
  } | null>(null);

  const maxCols = 12;
  const maxRows = 8;

  const cells = useMemo(() => {
    return Array.from({ length: maxRows * maxCols }).map((_, i) => {
      const col = i % maxCols;
      const row = Math.floor(i / maxCols);
      const isSelected =
        col < initialColumns && row < initialRows && !hoveredCell;
      const isHighlighted =
        hoveredCell && col <= hoveredCell.col && row <= hoveredCell.row;

      return (
        <Tooltip
          key={i}
          content={
            hoveredCell && col === hoveredCell.col && row === hoveredCell.row
              ? `${hoveredCell.col + 1}×${hoveredCell.row + 1}`
              : ""
          }
          open={
            hoveredCell
              ? col === hoveredCell.col && row === hoveredCell.row
              : false
          }
        >
          <button
            onMouseEnter={() => setHoveredCell({ col, row })}
            onClick={() => onSelect(col + 1, row + 1)}
            className={selectorCellStyle({
              highlighted: isHighlighted || isSelected || undefined,
            })}
          />
        </Tooltip>
      );
    });
  }, [hoveredCell, onSelect, maxCols, maxRows, initialColumns, initialRows]);

  return (
    <Grid
      onMouseLeave={() => setHoveredCell(null)}
      css={{
        gridTemplateColumns: `repeat(${maxCols}, 1fr)`,
        gridTemplateRows: `repeat(${maxRows}, 1fr)`,
        gap: 2,
      }}
    >
      {cells}
    </Grid>
  );
};

type GridSizePanelProps = {
  children: ReactNode;
  columnCount: number;
  rowCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const GridSizePanel = ({
  children,
  columnCount,
  rowCount,
  open,
  onOpenChange,
}: GridSizePanelProps) => {
  const handleChange = (columns: number, rows: number) => {
    const batch = createBatchUpdate();

    batch.setProperty("grid-template-columns")({
      type: "unparsed",
      value: Array(columns).fill("1fr").join(" "),
    });

    batch.setProperty("grid-template-rows")({
      type: "unparsed",
      value: Array(rows).fill("1fr").join(" "),
    });

    batch.publish();
  };

  const handleSelectorSelect = (columns: number, rows: number) => {
    handleChange(columns, rows);
    onOpenChange(false);
  };

  return (
    <FloatingPanel
      title="Grid size"
      placement="bottom-within"
      content={
        <Flex direction="column" gap="3" css={{ padding: theme.panel.padding }}>
          <GridSizeSelector
            onSelect={handleSelectorSelect}
            initialColumns={columnCount}
            initialRows={rowCount}
          />
        </Flex>
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </FloatingPanel>
  );
};

const gridSizePickerButtonStyle = css({
  all: "unset",
  position: "relative",
  display: "grid",
  width: "100%",
  height: 60,
  outline: `1px solid ${theme.colors.borderMain}`,
  borderRadius: theme.borderRadius[3],
  overflow: "hidden",
  cursor: "pointer",
  "&:focus-within, &:hover, &[data-state=open]": {
    outline: `1px solid ${theme.colors.borderLocalFlexUi}`,
  },
});

type GridSizePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const GridSizePicker = ({ open, onOpenChange }: GridSizePickerProps) => {
  const gridTemplateColumns = useComputedStyleDecl("grid-template-columns");
  const gridTemplateRows = useComputedStyleDecl("grid-template-rows");

  const columnsValue = toValue(gridTemplateColumns.cascadedValue);
  const rowsValue = toValue(gridTemplateRows.cascadedValue);

  const columnCount = parseTrackCount(columnsValue);
  const rowCount = parseTrackCount(rowsValue);

  const displayColumnCount = Math.min(columnCount, 8);
  const displayRowCount = Math.min(rowCount, 8);

  // Memoize grid cells to avoid recreating on each render
  const gridCells = useMemo(() => {
    return Array.from({ length: displayColumnCount * displayRowCount }).map(
      (_, i) => {
        const col = i % displayColumnCount;
        const row = Math.floor(i / displayColumnCount);
        return (
          <Box
            key={i}
            css={{
              width: "100%",
              height: "100%",
              borderRight:
                col < displayColumnCount - 1
                  ? `1px solid ${theme.colors.borderMain}`
                  : undefined,
              borderBottom:
                row < displayRowCount - 1
                  ? `1px solid ${theme.colors.borderMain}`
                  : undefined,
            }}
          />
        );
      }
    );
  }, [displayColumnCount, displayRowCount]);

  return (
    <GridSizePanel
      columnCount={columnCount}
      rowCount={rowCount}
      open={open}
      onOpenChange={onOpenChange}
    >
      {/* Visual grid preview - similar to Figma's style */}
      <button
        aria-label={`Grid layout: ${columnCount} columns by ${rowCount} rows`}
        className={gridSizePickerButtonStyle()}
        style={{
          gridTemplateColumns: `repeat(${displayColumnCount}, 1fr)`,
          gridTemplateRows: `repeat(${displayRowCount}, 1fr)`,
        }}
      >
        {gridCells}
        <Text
          variant="mono"
          css={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: theme.deprecatedFontSize[3],
            fontWeight: 500,
            pointerEvents: "none",
          }}
        >
          {columnCount}×{rowCount}
        </Text>
      </button>
    </GridSizePanel>
  );
};
