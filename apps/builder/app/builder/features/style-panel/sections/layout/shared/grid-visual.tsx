import { useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Flex,
  theme,
  Text,
  IconButton,
  FloatingPanel,
  Grid,
  InputField,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { GearIcon } from "@webstudio-is/icons";
import { useComputedStyleDecl } from "../../../shared/model";
import {
  getPriorityStyleValueSource,
  PropertyLabel,
} from "../../../property-label";
import { GridSettingsPanel } from "./grid-settings";
import { createBatchUpdate } from "../../../shared/use-style-data";

const parseTrackCount = (value: string): number => {
  if (!value || value === "none") {
    return 2; // Default to 2×2 grid
  }

  // Simple parsing - count space-separated track values
  // TODO: Handle more complex values like minmax(), repeat(), etc.
  const tracks = value.split(/\s+/).filter(Boolean);
  return tracks.length;
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
  const [columnInput, setColumnInput] = useState("");
  const [rowInput, setRowInput] = useState("");

  const handleOpen = () => {
    setColumnInput(String(columnCount));
    setRowInput(String(rowCount));
    setIsOpen(true);
  };

  const handleApply = () => {
    const columns = parseInt(columnInput, 10);
    const rows = parseInt(rowInput, 10);

    if (
      isNaN(columns) ||
      isNaN(rows) ||
      columns < 1 ||
      rows < 1 ||
      columns > 20 ||
      rows > 20
    ) {
      return;
    }

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
              <InputField
                type="number"
                min={1}
                max={20}
                value={columnInput}
                onChange={(event) => setColumnInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleApply();
                  }
                }}
              />
            </Grid>
            <Grid gap={1} css={{ flexGrow: 1 }}>
              <PropertyLabel label="Rows" properties={["grid-template-rows"]} />
              <InputField
                type="number"
                min={1}
                max={20}
                value={rowInput}
                onChange={(event) => setRowInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleApply();
                  }
                }}
              />
            </Grid>
          </Flex>
        </Flex>
      }
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Box
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpen();
          }
        }}
      >
        {children}
      </Box>
    </FloatingPanel>
  );
};

export const GridVisual = () => {
  const gridTemplateColumns = useComputedStyleDecl("grid-template-columns");
  const gridTemplateRows = useComputedStyleDecl("grid-template-rows");

  const columnsValue = toValue(gridTemplateColumns.cascadedValue);
  const rowsValue = toValue(gridTemplateRows.cascadedValue);

  const columnCount = parseTrackCount(columnsValue);
  const rowCount = parseTrackCount(rowsValue);

  const styleValueSourceColor = getPriorityStyleValueSource([
    gridTemplateColumns,
    gridTemplateRows,
  ]);

  const displayColumnCount = Math.min(columnCount, 8);
  const displayRowCount = Math.min(rowCount, 8);

  // Calculate cell size to fit within max dimensions (60px width/height)
  const maxWidth = 62;
  const maxHeight = 62;
  const maxCellWidth = Math.floor(maxWidth / displayColumnCount);
  const maxCellHeight = Math.floor(maxHeight / displayRowCount);
  const cellSize = Math.min(maxCellWidth, maxCellHeight, 16); // Cap at 16px max

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
        padding: theme.spacing[5],
        borderRadius: theme.borderRadius[4],
      }}
    >
      <Flex direction="row" align="center" gap="2">
        <GridSizePanel columnCount={columnCount} rowCount={rowCount}>
          {/* Visual grid preview - similar to Figma's style */}
          <Box
            aria-label={`Grid layout: ${columnCount} columns by ${rowCount} rows`}
            css={{
              position: "relative",
              borderRadius: theme.borderRadius[3],
              cursor: "pointer",
              "&:focus-visible, &:hover": {
                outline: `1px solid ${theme.colors.borderLocalFlexUi}`,
              },
            }}
          >
            <Box
              css={{
                display: "grid",
                gridTemplateColumns: `repeat(${displayColumnCount}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${displayRowCount}, ${cellSize}px)`,
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
          </Box>
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
