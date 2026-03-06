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
  Separator,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import {
  parseGridTemplateTrackList,
  parseGridAreas,
  getGridAxisMode,
  getGridAxisLabel,
  isImplicitGridMode,
  type GridAxisMode,
} from "@webstudio-is/css-data";
import { useComputedStyleDecl } from "../../../shared/model";
import { createBatchUpdate } from "../../../shared/use-style-data";
import { $gridCellData } from "~/shared/nano-states";
import { DEFAULT_GRID_TRACK_COUNT } from "./constants";

/**
 * Parse track count from a computed CSS value.
 * Returns DEFAULT_GRID_TRACK_COUNT for empty/none values.
 */
const parseTrackCount = (value: string): number => {
  if (!value || value === "none") {
    return DEFAULT_GRID_TRACK_COUNT;
  }
  const tracks = parseGridTemplateTrackList(value);
  return tracks.length || DEFAULT_GRID_TRACK_COUNT;
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

type GridPreset = {
  label: string;
  columns: string;
  rows: string;
  areas?: string;
  // Mini-preview dimensions for the button thumbnail
  previewColumns: string;
  previewRows: string;
};

const gridPresets: GridPreset[] = [
  {
    label: "Fluid sidebar",
    columns: "fit-content(300px) 1fr",
    rows: "1fr",
    previewColumns: "1fr 3fr",
    previewRows: "1fr",
  },
  {
    label: "Page stack",
    columns: "1fr",
    rows: "auto 1fr auto",
    previewColumns: "1fr",
    previewRows: "1fr 4fr 1fr",
  },
  {
    label: "Holy grail",
    columns: "1fr 3fr 1fr",
    rows: "auto 1fr auto",
    areas: `"header header header" "sidebar main aside" "footer footer footer"`,
    previewColumns: "1fr 3fr 1fr",
    previewRows: "1fr 3fr 1fr",
  },
  {
    label: "Responsive cards",
    columns: "repeat(auto-fit, minmax(250px, 1fr))",
    rows: "auto",
    previewColumns: "1fr 1fr 1fr",
    previewRows: "1fr 1fr",
  },
  {
    label: "Feature section",
    columns: "repeat(auto-fit, minmax(350px, 1fr))",
    rows: "auto",
    previewColumns: "1fr 1fr",
    previewRows: "1fr",
  },
  {
    label: "Footer columns",
    columns: "repeat(auto-fit, minmax(150px, 1fr))",
    rows: "auto",
    previewColumns: "1fr 1fr 1fr 1fr",
    previewRows: "1fr",
  },
];

const presetButtonStyle = css({
  all: "unset",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing[2],
  cursor: "pointer",
  borderRadius: theme.borderRadius[3],
  padding: theme.spacing[3],
  boxSizing: "border-box",
  "&:hover": {
    backgroundColor: theme.colors.backgroundHover,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
  },
});

const presetPreviewStyle = css({
  width: "100%",
  aspectRatio: "3 / 2",
  borderRadius: theme.borderRadius[2],
  border: `1px solid ${theme.colors.borderMain}`,
  overflow: "hidden",
});

type GridPresetsPickerProps = {
  onSelect: (preset: GridPreset) => void;
};

const GridPresetsPicker = ({ onSelect }: GridPresetsPickerProps) => {
  return (
    <Grid
      css={{
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: theme.spacing[3],
      }}
    >
      {gridPresets.map((preset) => (
        <Tooltip key={preset.label} content={preset.label}>
          <button
            className={presetButtonStyle()}
            onClick={() => onSelect(preset)}
          >
            <Grid
              className={presetPreviewStyle()}
              css={{
                gridTemplateColumns: preset.previewColumns,
                gridTemplateRows: preset.previewRows,
                gap: 1,
                padding: 2,
              }}
            >
              {Array.from({
                length:
                  preset.previewColumns.split(" ").length *
                  preset.previewRows.split(" ").length,
              }).map((_, i) => (
                <Box
                  key={i}
                  css={{
                    backgroundColor: theme.colors.backgroundControls,
                    borderRadius: theme.borderRadius[1],
                    border: `1px solid ${theme.colors.borderMain}`,
                  }}
                />
              ))}
            </Grid>
            <Text
              variant="tiny"
              align="center"
              css={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {preset.label}
            </Text>
          </button>
        </Tooltip>
      ))}
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
  const gridTemplateAreas = useComputedStyleDecl("grid-template-areas");
  const gridCellData = useStore($gridCellData);

  // Analyze both axes using pure functions
  const columnsValueCascaded = toValue(gridTemplateColumns.cascadedValue);
  const rowsValueCascaded = toValue(gridTemplateRows.cascadedValue);
  const columnsMode = getGridAxisMode(columnsValueCascaded);
  const rowsMode = getGridAxisMode(rowsValueCascaded);

  // Calculate track counts
  // For unknown modes (subgrid, masonry, line-names), we use defaults
  const columnsValueComputed = toValue(gridTemplateColumns.computedValue);
  const rowsValueComputed = toValue(gridTemplateRows.computedValue);
  const columnCount = getAxisTrackCount(
    columnsMode,
    columnsValueComputed,
    gridCellData?.columnCount
  );
  const rowCount = getAxisTrackCount(
    rowsMode,
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
  };

  const handlePresetSelect = (preset: GridPreset) => {
    const batch = createBatchUpdate();
    batch.setProperty("grid-template-columns")({
      type: "unparsed",
      value: preset.columns,
    });
    batch.setProperty("grid-template-rows")({
      type: "unparsed",
      value: preset.rows,
    });
    if (preset.areas) {
      batch.setProperty("grid-template-areas")({
        type: "unparsed",
        value: preset.areas,
      });
    } else {
      batch.deleteProperty("grid-template-areas");
    }
    batch.publish();
  };

  // Build a map from "col,row" (0-based) to area name for the preview
  const areasValue = toValue(gridTemplateAreas.cascadedValue);
  const areas = useMemo(() => parseGridAreas(areasValue), [areasValue]);

  const areaMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const area of areas) {
      for (let r = area.rowStart; r < area.rowEnd; r++) {
        for (let c = area.columnStart; c < area.columnEnd; c++) {
          const displayCol = c - 1;
          const displayRow = r - 1;
          if (displayCol < displayColumnCount && displayRow < displayRowCount) {
            map.set(`${displayCol},${displayRow}`, area.name);
          }
        }
      }
    }
    return map;
  }, [areas, displayColumnCount, displayRowCount]);

  // Memoize grid cells to avoid recreating on each render
  const gridCells = useMemo(() => {
    return Array.from({ length: displayColumnCount * displayRowCount }).map(
      (_, i) => {
        const col = i % displayColumnCount;
        const row = Math.floor(i / displayColumnCount);
        const areaName = areaMap.get(`${col},${row}`);
        const rightNeighbor = areaMap.get(`${col + 1},${row}`);
        const bottomNeighbor = areaMap.get(`${col},${row + 1}`);
        // Hide border when both sides belong to the same named area
        const mergedRight =
          areaName !== undefined && areaName === rightNeighbor;
        const mergedBottom =
          areaName !== undefined && areaName === bottomNeighbor;

        return (
          <Box
            key={i}
            css={{
              width: "100%",
              height: "100%",
              borderRight:
                col < displayColumnCount - 1 && !mergedRight
                  ? `1px solid ${theme.colors.borderMain}`
                  : undefined,
              borderBottom:
                row < displayRowCount - 1 && !mergedBottom
                  ? `1px solid ${theme.colors.borderMain}`
                  : undefined,
            }}
          />
        );
      }
    );
  }, [displayColumnCount, displayRowCount, areaMap]);

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
          <Separator />
          <Text variant="labels">Presets</Text>
          <GridPresetsPicker onSelect={handlePresetSelect} />
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
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {getGridAxisLabel(columnsMode, columnCount) +
            "×" +
            getGridAxisLabel(rowsMode, rowCount)}
        </Text>
      </button>
    </FloatingPanel>
  );
};

export const __testing__ = {
  gridPresets,
};
