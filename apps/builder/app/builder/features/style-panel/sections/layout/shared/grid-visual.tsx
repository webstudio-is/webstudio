import { useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Flex,
  theme,
  Text,
  IconButton,
  FloatingPanel,
  Grid,
  Tooltip,
  css,
} from "@webstudio-is/design-system";
import { toValue, type StyleValue } from "@webstudio-is/css-engine";
import { GearIcon } from "@webstudio-is/icons";
import { useComputedStyleDecl } from "../../../shared/model";
import { PropertyLabel } from "../../../property-label";
import { GridSettingsPanel } from "./grid-settings";
import { createBatchUpdate } from "../../../shared/use-style-data";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../../shared/css-value-input";

const parseTrackCount = (value: string): number => {
  if (!value || value === "none") {
    return 2; // Default to 2×2 grid
  }

  // Simple parsing - count space-separated track values
  // TODO: Handle more complex values like minmax(), repeat(), etc.
  const tracks = value.split(/\s+/).filter(Boolean);
  return tracks.length;
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
};

const GridSizePanel = ({
  children,
  columnCount,
  rowCount,
}: GridSizePanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const columnsStyleDecl = useComputedStyleDecl("grid-template-columns");
  const rowsStyleDecl = useComputedStyleDecl("grid-template-rows");

  const [columnValue, setColumnValue] = useState<StyleValue>({
    type: "unit",
    value: columnCount,
    unit: "number",
  });
  const [rowValue, setRowValue] = useState<StyleValue>({
    type: "unit",
    value: rowCount,
    unit: "number",
  });
  const [columnIntermediate, setColumnIntermediate] = useState<
    StyleValue | IntermediateStyleValue | undefined
  >();
  const [rowIntermediate, setRowIntermediate] = useState<
    StyleValue | IntermediateStyleValue | undefined
  >();

  const handleSelectorSelect = (columns: number, rows: number) => {
    setColumnValue({
      type: "unit",
      value: columns,
      unit: "number",
    });
    setRowValue({
      type: "unit",
      value: rows,
      unit: "number",
    });

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
    setIsOpen(false);
  };

  return (
    <FloatingPanel
      title="Grid Size"
      placement="bottom-within"
      content={
        <Flex direction="column" gap="3" css={{ padding: theme.panel.padding }}>
          <Flex gap="2">
            <Grid gap={1} css={{ flexGrow: 1 }}>
              <PropertyLabel
                label="Columns"
                properties={["grid-template-columns"]}
              />
              <CssValueInput
                styleSource={columnsStyleDecl.source.name}
                property="grid-template-columns"
                value={columnValue}
                intermediateValue={columnIntermediate}
                unitOptions={[]}
                onChange={(value) => {
                  if (value === undefined) {
                    return;
                  }
                  if (value.type === "intermediate") {
                    setColumnIntermediate(value);
                  } else {
                    setColumnValue(value);
                    setColumnIntermediate(undefined);
                  }
                }}
                onHighlight={() => {}}
                onChangeComplete={(event) => {
                  setColumnValue(event.value);
                  setColumnIntermediate(undefined);
                }}
                onAbort={() => {
                  setColumnIntermediate(undefined);
                }}
                onReset={() => {}}
              />
            </Grid>
            <Grid gap={1} css={{ flexGrow: 1 }}>
              <PropertyLabel label="Rows" properties={["grid-template-rows"]} />
              <CssValueInput
                styleSource={rowsStyleDecl.source.name}
                property="grid-template-rows"
                value={rowValue}
                intermediateValue={rowIntermediate}
                unitOptions={[]}
                onChange={(value) => {
                  if (value === undefined) {
                    return;
                  }
                  if (value.type === "intermediate") {
                    setRowIntermediate(value);
                  } else {
                    setRowValue(value);
                    setRowIntermediate(undefined);
                  }
                }}
                onHighlight={() => {}}
                onChangeComplete={(event) => {
                  setRowValue(event.value);
                  setRowIntermediate(undefined);
                }}
                onAbort={() => {
                  setRowIntermediate(undefined);
                }}
                onReset={() => {}}
              />
            </Grid>
          </Flex>
          <GridSizeSelector
            onSelect={handleSelectorSelect}
            initialColumns={columnCount}
            initialRows={rowCount}
          />
        </Flex>
      }
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      {children}
    </FloatingPanel>
  );
};

const gridVisualButtonStyle = css({
  all: "unset",
  position: "relative",
  borderRadius: theme.borderRadius[3],
  cursor: "pointer",
  "&:focus-visible, &:hover, &[data-state=open]": {
    outline: `1px solid ${theme.colors.borderLocalFlexUi}`,
  },
});

export const GridVisual = () => {
  const gridTemplateColumns = useComputedStyleDecl("grid-template-columns");
  const gridTemplateRows = useComputedStyleDecl("grid-template-rows");

  const columnsValue = toValue(gridTemplateColumns.cascadedValue);
  const rowsValue = toValue(gridTemplateRows.cascadedValue);

  const columnCount = parseTrackCount(columnsValue);
  const rowCount = parseTrackCount(rowsValue);

  const displayColumnCount = Math.min(columnCount, 8);
  const displayRowCount = Math.min(rowCount, 8);

  // Fixed grid dimensions
  const gridWidth = 62;
  const gridHeight = 62;

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
    <Box
      css={{
        borderRadius: theme.borderRadius[4],
      }}
    >
      <Flex direction="row" align="center" gap="2">
        <GridSizePanel columnCount={columnCount} rowCount={rowCount}>
          {/* Visual grid preview - similar to Figma's style */}
          <button
            aria-label={`Grid layout: ${columnCount} columns by ${rowCount} rows`}
            className={gridVisualButtonStyle()}
          >
            <Box
              css={{
                display: "grid",
                gridTemplateColumns: `repeat(${displayColumnCount}, 1fr)`,
                gridTemplateRows: `repeat(${displayRowCount}, 1fr)`,
                width: gridWidth,
                height: gridHeight,
                gap: 0,
                border: `1px solid ${theme.colors.borderMain}`,
                borderRadius: theme.borderRadius[3],
                overflow: "hidden",
              }}
            >
              {gridCells}
            </Box>
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
        <GridSettingsPanel>
          <IconButton aria-label="Edit grid settings">
            <GearIcon />
          </IconButton>
        </GridSettingsPanel>
      </Flex>
    </Box>
  );
};
