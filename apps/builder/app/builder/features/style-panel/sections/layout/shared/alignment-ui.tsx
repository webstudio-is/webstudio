import { Box, Flex, Grid, IconButton } from "@webstudio-is/design-system";
import { DotIcon } from "@webstudio-is/icons";
import { theme } from "@webstudio-is/design-system";

// Sometimes we need to hide a dot that ends up at an end
// of a line and visually extends it
const shouldHideDot = ({
  x,
  y,
  justifyContent,
  alignItems,
}: {
  x: number;
  y: number;
  justifyContent: string;
  alignItems: string;
}) => {
  if (justifyContent === "space-between") {
    if (alignItems === "start" || alignItems === "baseline") {
      return x === 2 && y === 0;
    }
    if (alignItems === "end") {
      return x === 2 && y === 2;
    }
  }
  return false;
};

type AlignmentVisualProps = {
  // Visual state
  justifyContent: string;
  alignItems: string;
  isColumnDirection: boolean;
  isDense: boolean;
  color: string;
  // Item sizing for stretch behavior
  itemStretchWidth: boolean;
  itemStretchHeight: boolean;
  // Optional: for grid-specific alignment within cells
  justifyItems?: string;
  // Click handler for grid buttons
  onSelect: (position: { x: number; y: number }) => void;
};

export const AlignmentUi = ({
  justifyContent,
  alignItems,
  isColumnDirection,
  isDense,
  color,
  itemStretchWidth,
  itemStretchHeight,
  justifyItems,
  onSelect,
}: AlignmentVisualProps) => {
  const alignment = ["start", "center", "end"];
  const gridSize = alignment.length;

  // Normalize values for consistent positioning
  const normalizeValue = (value: string) => {
    // Normalize flex-specific values to standard values
    if (value === "flex-start") {
      return "start";
    }
    if (value === "flex-end") {
      return "end";
    }
    // Map "normal" and "stretch" to "start" for cross-axis positioning
    // (items align at the start but may stretch in size)
    if (value === "normal" || value === "stretch") {
      return "start";
    }
    return value;
  };

  const mainAlign = normalizeValue(justifyContent);
  const crossAlign = normalizeValue(alignItems);

  // Calculate positions for items along main axis
  const getMainAxisPositions = (
    containerSize: number,
    itemSizes: number[],
    gap: number
  ) => {
    const totalItemSize = itemSizes.reduce((sum, size) => sum + size, 0);
    const totalGap = gap * (itemSizes.length - 1);
    const totalContent = totalItemSize + totalGap;

    if (mainAlign === "start") {
      let pos = 0;
      return itemSizes.map((size) => {
        const current = pos;
        pos += size + gap;
        return current;
      });
    }

    if (mainAlign === "center") {
      let pos = (containerSize - totalContent) / 2;
      return itemSizes.map((size) => {
        const current = pos;
        pos += size + gap;
        return current;
      });
    }

    if (mainAlign === "end") {
      let pos = containerSize - totalContent;
      return itemSizes.map((size) => {
        const current = pos;
        pos += size + gap;
        return current;
      });
    }

    if (mainAlign === "space-between") {
      if (itemSizes.length === 1) {
        return [0];
      }
      const spacing = (containerSize - totalItemSize) / (itemSizes.length - 1);
      let pos = 0;
      return itemSizes.map((size) => {
        const current = pos;
        pos += size + spacing;
        return current;
      });
    }

    if (mainAlign === "space-around") {
      const spacing = (containerSize - totalItemSize) / itemSizes.length;
      let pos = spacing / 2;
      return itemSizes.map((size) => {
        const current = pos;
        pos += size + spacing;
        return current;
      });
    }

    // Default: start
    let pos = 0;
    return itemSizes.map((size) => {
      const current = pos;
      pos += size + gap;
      return current;
    });
  };

  // Calculate position along cross axis (in percentage to align with dot grid)
  const getCrossAxisPosition = () => {
    // Dots are at 1/6, 3/6 (1/2), 5/6 of container (center of each 1/3 grid cell)
    // Using fractions that work cleanly: 16.666...% ≈ 1/6, 50% = 1/2, 83.333...% ≈ 5/6
    if (crossAlign === "start" || crossAlign === "stretch") {
      return 100 / 6; // 16.666...%
    }
    if (crossAlign === "center") {
      return 50; // 50%
    }
    if (crossAlign === "end") {
      return (100 * 5) / 6; // 83.333...%
    }
    return 50; // default to center
  };

  const items = [
    { width: 4, height: 4 },
    { width: 4, height: 4 },
    { width: 4, height: 4 },
  ];

  const gap = isDense ? 1 : 3;
  const padding = 2;

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
              {shouldHideDot({
                x,
                y,
                justifyContent,
                alignItems,
              }) === false && (
                <Box css={{ size: 16 }}>
                  <DotIcon size={8} />
                </Box>
              )}
            </IconButton>
          </Flex>
        );
      })}

      <Box
        css={{
          width: "100%",
          height: "100%",
          gridArea: "-1 / -1 / 1 / 1",
          p: padding,
          pointerEvents: "none",
          position: "relative",
        }}
      >
        {items.map((item, idx) => {
          // Item base size in pixels
          const itemBaseWidth = 4;
          const itemBaseHeight = 4;

          // Dot grid positions (center of each 1/3 grid cell)
          const dotPositions = [100 / 6, 50, (100 * 5) / 6]; // 16.67%, 50%, 83.33%

          // Calculate main axis position
          let mainAxisPos;

          if (mainAlign === "space-between" || mainAlign === "space-around") {
            // Each item goes to a different dot
            mainAxisPos = dotPositions[idx];
          } else {
            // All items grouped together, positioned by mainAlign
            let groupPosition;
            if (mainAlign === "start") {
              groupPosition = dotPositions[0];
            } else if (mainAlign === "end") {
              groupPosition = dotPositions[2];
            } else {
              groupPosition = dotPositions[1]; // center or default
            }

            // Space items with gaps, centered around the group position
            const itemSize = isColumnDirection ? itemBaseHeight : itemBaseWidth;
            const totalItemsSize = items.length * itemSize;
            const totalGapsSize = (items.length - 1) * gap;
            const totalSize = totalItemsSize + totalGapsSize;

            // Start position for first item (offset from group center)
            const startOffset = -totalSize / 2 + itemSize / 2;
            // Current item offset
            const currentOffset = startOffset + idx * (itemSize + gap);

            // Position in percentage, with pixel offset
            mainAxisPos = `calc(${groupPosition}% + ${currentOffset}px)`;
          }

          // Calculate cross axis position
          const crossAxisPos =
            dotPositions[
              crossAlign === "end" ? 2 : crossAlign === "center" ? 1 : 0
            ];

          // Apply positions based on direction
          const left = isColumnDirection
            ? `${crossAxisPos}%`
            : typeof mainAxisPos === "number"
              ? `${mainAxisPos}%`
              : mainAxisPos;
          const top = isColumnDirection
            ? typeof mainAxisPos === "number"
              ? `${mainAxisPos}%`
              : mainAxisPos
            : `${crossAxisPos}%`;

          const width = isColumnDirection
            ? itemStretchWidth
              ? "100%"
              : "100%"
            : `${itemBaseWidth}px`;
          const height = isColumnDirection
            ? `${itemBaseHeight}px`
            : itemStretchHeight
              ? "100%"
              : "100%";

          return (
            <Box
              key={idx}
              css={{
                position: "absolute",
                borderRadius: theme.borderRadius[1],
                backgroundColor: "currentColor",
              }}
              style={{
                left,
                top,
                width,
                height,
                transform: "translate(-50%, -50%)",
              }}
            />
          );
        })}
      </Box>
    </Grid>
  );
};
