import { Box, Flex, Grid, IconButton } from "@webstudio-is/design-system";
import { DotIcon } from "@webstudio-is/icons";
import { theme } from "@webstudio-is/design-system";

// Hide dots where indicator bars overlap to avoid sub-pixel artifacts.
// Bars have a cross-axis position (from alignItems) and main-axis position
// (from justifyContent). A dot is hidden when both axes match.
//
// x always maps to justify-content (main-axis position: 0=start, 1=center, 2=end)
// y always maps to align-items (cross-axis position: 0=start, 1=center, 2=end)
// The visual transposition for column direction is handled by the CSS grid swap.
//
// Cross-axis (y): CSS align-items controls bar position in the cross direction.
//   stretch/normal → bars span full cross-axis (CSS stretches flex items)
//   itemStretchWidth (column) / itemStretchHeight (row) → same visual effect
//   start/baseline/center/end → bars sit at one specific position
//
// Main-axis (x): CSS justify-content controls bar distribution.
//   normal/start → bars clustered at position 0
//   center → bars at position 1
//   end → bars at position 2
//   space-between → bars at positions 0, 1, 2
//   space-around → bars between positions, no dot overlap
export const shouldHideDot = ({
  x,
  y,
  justifyContent,
  alignItems,
  isColumnDirection,
  itemStretchWidth,
  itemStretchHeight,
}: {
  x: number;
  y: number;
  justifyContent: string;
  alignItems: string;
  isColumnDirection: boolean;
  itemStretchWidth: boolean;
  itemStretchHeight: boolean;
}) => {
  // Check if the dot's cross-axis (y) position overlaps with bars.
  // CSS align-items: stretch/normal makes bars span full cross-axis.
  // Explicit itemStretch* does the same via min-width/height: 100%.
  const isStretched =
    alignItems === "stretch" ||
    alignItems === "normal" ||
    (isColumnDirection ? itemStretchWidth : itemStretchHeight);

  let crossMatch = false;
  if (isStretched) {
    crossMatch = true;
  } else {
    switch (alignItems) {
      case "start":
      case "baseline":
        crossMatch = y === 0;
        break;
      case "center":
        crossMatch = y === 1;
        break;
      case "end":
        crossMatch = y === 2;
        break;
    }
  }

  if (!crossMatch) {
    return false;
  }

  // Check if the dot's main-axis (x) position overlaps with bars.
  switch (justifyContent) {
    case "normal":
    case "start":
      return x === 0;
    case "center":
      return x === 1;
    case "end":
      return x === 2;
    case "space-between":
      return true;
    // space-around: bars sit between dot positions, no overlap
  }

  return false;
};

type AlignmentVisualProps = {
  // Visual state
  justifyContent: string;
  alignItems: string;
  isColumnDirection: boolean;
  color: string;
  // Item sizing for stretch behavior
  itemStretchWidth: boolean;
  itemStretchHeight: boolean;
  // Click handler for grid buttons
  onSelect: (position: { x: number; y: number }) => void;
};

export const AlignmentUi = ({
  justifyContent,
  alignItems,
  isColumnDirection,
  color,
  itemStretchWidth,
  itemStretchHeight,
  onSelect,
}: AlignmentVisualProps) => {
  const alignment = ["start", "center", "end"];
  const gridSize = alignment.length;

  return (
    <Grid
      tabIndex={0}
      css={{
        padding: theme.spacing[3],
        borderRadius: theme.borderRadius[4],
        background: theme.colors.backgroundControls,
        alignItems: "center",
        gap: 0,
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        color,
        "&:focus-within": {
          outline: `1px solid ${theme.colors.borderLocalFlexUi}`,
        },
      }}
    >
      {Array.from(Array(gridSize * gridSize), (_, index) => {
        const x = index % gridSize;
        const y = Math.floor(index / gridSize);
        let gridColumn = `${x + 1} / ${x + 2}`;
        let gridRow = `${y + 1} / ${y + 2}`;
        if (isColumnDirection) {
          [gridColumn, gridRow] = [gridRow, gridColumn];
        }
        return (
          <Flex
            key={index}
            justify="center"
            align="center"
            css={{
              width: "100%",
              height: "100%",
              gridColumn,
              gridRow,
            }}
          >
            <IconButton
              tabIndex={-1}
              css={{
                width: "90%",
                height: "90%",
                minWidth: "auto",
                color: theme.colors.foregroundFlexUiMain,
                "&:hover": {
                  background: theme.colors.foregroundFlexUiHover,
                },
                "&:focus": {
                  background: "none",
                  boxShadow: "none",
                  outline: "none",
                },
              }}
              onClick={() => onSelect({ x, y })}
            >
              <Box
                css={{
                  size: 16,
                  visibility: shouldHideDot({
                    x,
                    y,
                    justifyContent,
                    alignItems,
                    isColumnDirection,
                    itemStretchWidth,
                    itemStretchHeight,
                  })
                    ? "hidden"
                    : "visible",
                }}
              >
                <DotIcon size={8} />
              </Box>
            </IconButton>
          </Flex>
        );
      })}

      <Flex
        css={{
          width: "100%",
          height: "100%",
          gridArea: "-1 / -1 / 1 / 1", // fill whole grid
          p: 2,
          gap: 2.5,
          pointerEvents: "none",
        }}
        style={{
          flexDirection: isColumnDirection ? "column" : "row",
          justifyContent,
          alignItems,
          ...(justifyContent === "space-between"
            ? isColumnDirection
              ? { paddingTop: 8, paddingBottom: 8 }
              : { paddingLeft: 8, paddingRight: 8 }
            : justifyContent === "space-around"
              ? isColumnDirection
                ? { paddingTop: 14.5, paddingBottom: 14.5 }
                : { paddingLeft: 14.5, paddingRight: 14.5 }
              : {}),
        }}
      >
        {[9, 14, 7].map((size) => (
          <Box
            key={size}
            css={{
              borderRadius: theme.borderRadius[1],
              backgroundColor: "currentColor",
              flexShrink: 0,
            }}
            style={
              isColumnDirection
                ? {
                    minWidth: itemStretchWidth ? "100%" : size,
                    minHeight: 3,
                  }
                : {
                    minWidth: 3,
                    minHeight: itemStretchHeight ? "100%" : size,
                  }
            }
          />
        ))}
      </Flex>
    </Grid>
  );
};
