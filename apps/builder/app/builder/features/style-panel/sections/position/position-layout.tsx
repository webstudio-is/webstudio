import { Grid, Box, theme, styled } from "@webstudio-is/design-system";
import type { MouseEvent } from "react";

const RECT_HEIGHT = 6;
const RECT_WIDTH = 42;
const RECT_BORDER_RADIUS = 1;
const OUTER_BORDER_RADIUS = 3;

const Trapezoid = styled("div", {
  borderRadius: OUTER_BORDER_RADIUS,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  "&:hover": {
    backgroundColor: theme.colors.backgroundSpacingHover,
  },
  variants: {
    isActive: {
      true: {
        backgroundColor: theme.colors.backgroundSpacingHover,
      },
    },
  },
});

const TopBottom = styled(Trapezoid, {
  zIndex: 0,
  backgroundColor: theme.colors.backgroundPanel,
});

const LeftRight = styled(Trapezoid, {
  zIndex: 1,
  backgroundColor: theme.colors.backgroundSpacingLeftRight,
});

export type PositionProperty = "top" | "right" | "bottom" | "left";

type PositionLayoutProps = {
  renderCell: (property: PositionProperty) => React.ReactNode;
  onHover: (
    args: { element: HTMLElement; property: PositionProperty } | undefined
  ) => void;
  activeProperties: readonly PositionProperty[];
};
/**
 *  Grid schema for graphical layout
 *  ```
 *    1  23         45  6
 *  1 -------------------
 *    |  ||         ||  |
 *  2 -------------------
 *  3 -------------------
 *    |  ||         ||  |
 *  4 -------------------
 *  ```
 *
 **/
export const PositionLayout = ({
  renderCell,
  onHover,
  activeProperties,
}: PositionLayoutProps) => {
  const createHandleHover = (property: PositionProperty) => ({
    onMouseEnter: (e: MouseEvent<HTMLDivElement>) => {
      onHover({
        element: e.currentTarget,
        property,
      });
    },
    onMouseLeave: (e: MouseEvent<HTMLDivElement>) => {
      onHover(undefined);
    },
  });

  return (
    <Grid
      css={{
        borderRadius: OUTER_BORDER_RADIUS,

        borderColor: theme.colors.borderMain,
        borderWidth: 1,
        borderStyle: "solid",

        userSelect: "none",

        gridTemplateColumns: `1fr ${RECT_BORDER_RADIUS / 2}px ${
          RECT_WIDTH - RECT_BORDER_RADIUS
        }px ${RECT_BORDER_RADIUS / 2}px 1fr`,

        gridTemplateRows: `1fr ${RECT_HEIGHT}px 1fr`,
      }}
    >
      <Box
        css={{
          borderRadius: RECT_BORDER_RADIUS,
          gridArea: "2/2/3/5",
          backgroundColor: theme.colors.backgroundControls,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.colors.borderMain,
          zIndex: 2,
        }}
      />
      <LeftRight
        css={{
          gridArea: "1/1/4/3",
          clipPath: `polygon(0 0, 100% calc(50% - ${
            RECT_HEIGHT / 2 - RECT_BORDER_RADIUS / 2
          }px), 100% calc(50% + ${
            RECT_HEIGHT / 2 - RECT_BORDER_RADIUS / 2
          }px), 0% 100%)`,
          cursor: "w-resize",
        }}
        isActive={activeProperties?.includes("left")}
        {...createHandleHover("left")}
      />

      <LeftRight
        css={{
          gridArea: "1/1/4/3",
          zIndex: 2,
          visibility: "hidden",
        }}
      >
        <Box
          css={{
            visibility: "visible",
            margin: theme.spacing[2],
            display: "flex",
            justifyContent: "center",
          }}
        >
          {renderCell("left")}
        </Box>
      </LeftRight>

      <LeftRight
        css={{
          gridArea: "1/4/4/6",
          clipPath: `polygon(0 calc(50% - ${
            RECT_HEIGHT / 2 - RECT_BORDER_RADIUS / 2
          }px), 100% 0, 100% 100%, 0 calc(50% + ${
            RECT_HEIGHT / 2 - RECT_BORDER_RADIUS / 2
          }px))`,
          cursor: "e-resize",
        }}
        isActive={activeProperties?.includes("right")}
        {...createHandleHover("right")}
      />

      <LeftRight
        css={{
          gridArea: "1/4/4/6",
          zIndex: 2,
          visibility: "hidden",
        }}
      >
        <Box
          css={{
            visibility: "visible",
            margin: theme.spacing[2],
            display: "flex",
            justifyContent: "center",
          }}
        >
          {renderCell("right")}
        </Box>
      </LeftRight>

      <TopBottom
        css={{
          gridArea: "1/1/2/6",
          cursor: "n-resize",
        }}
        isActive={activeProperties?.includes("top")}
        {...createHandleHover("top")}
      >
        {renderCell("top")}
      </TopBottom>

      <TopBottom
        css={{
          gridArea: "3/1/4/6",
          cursor: "s-resize",
        }}
        isActive={activeProperties?.includes("bottom")}
        {...createHandleHover("bottom")}
      >
        {renderCell("bottom")}
      </TopBottom>
    </Grid>
  );
};
