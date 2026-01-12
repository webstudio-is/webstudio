import type { CSSProperties } from "react";
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
  onSelect,
}: AlignmentVisualProps) => {
  const alignment = ["start", "center", "end"];
  const gridSize = alignment.length;

  const addjustLinesPadding = (padding: number | undefined) => {
    if (padding === undefined) {
      return {};
    }
    return isColumnDirection
      ? { paddingTop: padding, paddingBottom: padding }
      : { paddingLeft: padding, paddingRight: padding };
  };

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

      <Flex
        css={{
          width: "100%",
          height: "100%",
          gridArea: "-1 / -1 / 1 / 1",
          p: 2,
          pointerEvents: "none",
        }}
        style={{
          gap: isDense ? 0.8 : 2.5,
          flexDirection: (isColumnDirection
            ? "column"
            : "row") as CSSProperties["flexDirection"],
          justifyContent,
          alignItems,
          ...addjustLinesPadding(
            justifyContent === "space-between"
              ? 8
              : justifyContent === "space-around"
                ? 14.5
                : undefined
          ),
        }}
      >
        {[7, 12, 5].map((size) => (
          <Box
            key={size}
            css={{
              borderRadius: theme.borderRadius[1],
              backgroundColor: "currentColor",
              ...(isColumnDirection
                ? {
                    minWidth: itemStretchWidth ? "100%" : size,
                    minHeight: isDense ? 5 : 3,
                    ...(itemStretchWidth ? { width: "100%" } : {}),
                  }
                : {
                    minWidth: itemStretchWidth ? "100%" : isDense ? 5 : 3,
                    minHeight: size,
                    ...(itemStretchWidth ? { width: "100%" } : {}),
                  }),
            }}
          />
        ))}
      </Flex>
    </Grid>
  );
};
