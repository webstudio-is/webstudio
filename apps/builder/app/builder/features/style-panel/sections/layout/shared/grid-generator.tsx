import { useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
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
import {
  parseGridTemplateTrackList,
  checkGridTemplateSupport,
  getGridAxisMode,
  getGridAxisLabel,
  isImplicitGridMode,
  type GridAxisMode,
} from "@webstudio-is/css-data";
import { useComputedStyleDecl } from "../../../shared/model";
import { createBatchUpdate } from "../../../shared/use-style-data";
import { $gridCellData } from "~/shared/nano-states";

/**
 * Parse track count from a computed CSS value.
 * Returns 2 as default for empty/none values.
 */
const parseTrackCount = (value: string): number => {
  if (!value || value === "none") {
    return 2;
  }
  const tracks = parseGridTemplateTrackList(value);
  return tracks.length || 2;
};

/**
 * Modes that block the grid generator UI entirely.
 * These require dedicated UIs or have no visual representation.
 */
const BLOCKED_MODES = new Set<GridAxisMode>([
  "subgrid",
  "masonry",
  "line-names",
]);

/**
 * Analyze grid axis support and return mode with optional unsupported reason.
 */
const analyzeGridAxis = (
  cascadedValue: string
): { mode: GridAxisMode; unsupportedReason?: string } => {
  const mode = getGridAxisMode(cascadedValue);
  if (BLOCKED_MODES.has(mode)) {
    const support = checkGridTemplateSupport(cascadedValue);
    return {
      mode,
      unsupportedReason: support.supported ? undefined : support.reason,
    };
  }
  return { mode };
};

/**
 * Calculate the actual track count for an axis.
 * Uses DOM-probed count for implicit modes, parsed count for explicit.
 */
const getAxisTrackCount = (
  mode: GridAxisMode,
  computedValue: string,
  domCount: number | undefined
): number => {
  const parsedCount = parseTrackCount(computedValue);
  if (isImplicitGridMode(mode)) {
    return domCount ?? parsedCount;
  }
  return parsedCount;
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

type GridGeneratorSelectorProps = {
  onSelect: (columns: number, rows: number) => void;
  initialColumns: number;
  initialRows: number;
};

const GridGeneratorSelector = ({
  onSelect,
  initialColumns,
  initialRows,
}: GridGeneratorSelectorProps) => {
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

const gridGeneratorButtonStyle = css({
  all: "unset",
  position: "relative",
  display: "grid",
  width: "100%",
  height: 60,
  outline: `1px solid ${theme.colors.borderMain}`,
  borderRadius: theme.borderRadius[3],
  overflow: "hidden",
  cursor: "pointer",
  "&:focus-within, &[data-state=open]": {
    outline: `1px solid ${theme.colors.borderLocalFlexUi}`,
  },
  "&:hover": {
    backgroundColor: theme.colors.backgroundHover,
  },
});

type GridGeneratorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const GridGenerator = ({ open, onOpenChange }: GridGeneratorProps) => {
  const gridTemplateColumns = useComputedStyleDecl("grid-template-columns");
  const gridTemplateRows = useComputedStyleDecl("grid-template-rows");
  const gridCellData = useStore($gridCellData);

  // Analyze both axes using pure functions
  const columnsValueCascaded = toValue(gridTemplateColumns.cascadedValue);
  const rowsValueCascaded = toValue(gridTemplateRows.cascadedValue);
  const columnsAxis = analyzeGridAxis(columnsValueCascaded);
  const rowsAxis = analyzeGridAxis(rowsValueCascaded);

  // Check if either axis is blocked
  const isBlocked =
    BLOCKED_MODES.has(columnsAxis.mode) || BLOCKED_MODES.has(rowsAxis.mode);
  const unsupportedReason =
    columnsAxis.unsupportedReason ?? rowsAxis.unsupportedReason;

  // Calculate track counts
  const columnsValueComputed = toValue(gridTemplateColumns.computedValue);
  const rowsValueComputed = toValue(gridTemplateRows.computedValue);
  const columnCount = getAxisTrackCount(
    columnsAxis.mode,
    columnsValueComputed,
    gridCellData?.columnCount
  );
  const rowCount = getAxisTrackCount(
    rowsAxis.mode,
    rowsValueComputed,
    gridCellData?.rowCount
  );

  const displayColumnCount = Math.min(columnCount, 8);
  const displayRowCount = Math.min(rowCount, 8);

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

  // Show disabled state with hint when grid values are unsupported
  if (isBlocked) {
    return (
      <Tooltip content={unsupportedReason}>
        <Flex
          align="center"
          justify="center"
          css={{
            width: "100%",
            height: 60,
            borderRadius: theme.borderRadius[3],
            border: `1px dashed ${theme.colors.borderMain}`,
            backgroundColor: theme.colors.backgroundPanel,
            color: theme.colors.foregroundSubtle,
            cursor: "not-allowed",
          }}
        >
          <Text variant="labels" color="subtle">
            Advanced grid configuration
          </Text>
        </Flex>
      </Tooltip>
    );
  }

  return (
    <FloatingPanel
      title="Grid generator"
      placement="bottom-within"
      content={
        <Flex direction="column" gap="3" css={{ padding: theme.panel.padding }}>
          <GridGeneratorSelector
            onSelect={handleSelectorSelect}
            initialColumns={columnCount}
            initialRows={rowCount}
          />
        </Flex>
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      {/* Visual grid preview - similar to Figma's style */}
      <button
        aria-label={`Grid layout: ${columnCount} columns by ${rowCount} rows`}
        className={gridGeneratorButtonStyle()}
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
            whiteSpace: "nowrap",
          }}
        >
          {getGridAxisLabel(columnsAxis.mode, columnCount)}×
          {getGridAxisLabel(rowsAxis.mode, rowCount)}
        </Text>
      </button>
    </FloatingPanel>
  );
};
