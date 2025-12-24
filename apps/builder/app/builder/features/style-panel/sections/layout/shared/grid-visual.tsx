import { useMemo } from "react";
import { Box, Flex, theme, Text } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { useComputedStyleDecl } from "../../../shared/model";
import { getPriorityStyleValueSource } from "../../../property-label";

const parseTrackCount = (value: string): number => {
  if (!value || value === "none") {
    return 2; // Default to 2×2 grid
  }

  // Simple parsing - count space-separated track values
  // TODO: Handle more complex values like minmax(), repeat(), etc.
  const tracks = value.split(/\s+/).filter(Boolean);
  return tracks.length;
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

  let color = theme.colors.foregroundMain;
  if (styleValueSourceColor === "local") {
    color = theme.colors.foregroundLocalFlexUi;
  }
  if (styleValueSourceColor === "overwritten") {
    color = theme.colors.foregroundOverwrittenFlexUi;
  }
  if (styleValueSourceColor === "remote") {
    color = theme.colors.foregroundRemoteFlexUi;
  }

  const displayColumnCount = Math.min(columnCount, 8);
  const displayRowCount = Math.min(rowCount, 8);

  const cellSize = theme.spacing[9]; // Use theme token instead of hardcoded 16px

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
                col < displayColumnCount - 1 ? `1px solid ${color}` : undefined,
              borderBottom:
                row < displayRowCount - 1 ? `1px solid ${color}` : undefined,
            }}
          />
        );
      }
    );
  }, [displayColumnCount, displayRowCount, color]);

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={`Grid layout: ${columnCount} columns by ${rowCount} rows. Click to edit grid settings.`}
      css={{
        padding: theme.spacing[5],
        borderRadius: theme.borderRadius[4],
        background: theme.colors.backgroundControls,
        cursor: "pointer",
        "&:hover": {
          background: theme.colors.backgroundHover,
        },
        "&:focus-visible": {
          outline: `2px solid ${theme.colors.borderFocus}`,
          outlineOffset: -2,
        },
      }}
      onClick={() => {
        // TODO: Open Grid Settings panel
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          // TODO: Open Grid Settings panel
        }
      }}
    >
      <Flex direction="column" align="center" gap="3">
        {/* Visual grid preview - similar to Figma's style */}
        <Box
          css={{
            display: "grid",
            gridTemplateColumns: `repeat(${displayColumnCount}, ${cellSize})`,
            gridTemplateRows: `repeat(${displayRowCount}, ${cellSize})`,
            gap: 0,
            border: `1px solid ${color}`,
            borderRadius: theme.borderRadius[3],
            overflow: "hidden",
          }}
        >
          {gridCells}
        </Box>
        <Text
          css={{
            color,
            fontSize: theme.deprecatedFontSize[3],
            fontWeight: 500,
          }}
        >
          {columnCount} × {rowCount}
        </Text>
      </Flex>
    </Box>
  );
};
