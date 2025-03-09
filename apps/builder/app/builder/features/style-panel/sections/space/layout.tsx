import { forwardRef, useId } from "react";
import type { ComponentProps, Ref } from "react";
import { styled, theme } from "@webstudio-is/design-system";
import type { CssProperty } from "@webstudio-is/css-engine";
import {
  spaceProperties,
  type HoverTarget,
  type SpaceStyleProperty,
} from "./properties";

const VALUE_WIDTH = 36;
const VALUE_HEIGHT = 24;

const BORDER = 1;
const INNER_MARGIN = 3;

const MOST_INNER_WIDTH = 62;
const MOST_INNER_HEIGHT = 6;

const INNER_WIDTH = MOST_INNER_WIDTH + (VALUE_WIDTH + BORDER) * 2;
const INNER_HEIGHT = MOST_INNER_HEIGHT + (VALUE_HEIGHT + BORDER) * 2;

const TOTAL_WIDTH = INNER_WIDTH + (INNER_MARGIN + VALUE_WIDTH + BORDER) * 2;
const TOTAL_HEIGHT = INNER_HEIGHT + (INNER_MARGIN + VALUE_HEIGHT + BORDER) * 2;

// in SVG stroke is always in the middle of the line
const emulateInnerStroke = ({
  width,
  height,
  x,
  y,
  strokeWidth = 1,
}: {
  width: number; // total desired size including border
  height: number;
  x: number;
  y: number;
  strokeWidth?: number;
}) => ({
  x: x + strokeWidth / 2,
  y: y + strokeWidth / 2,
  width: width - strokeWidth,
  height: height - strokeWidth,
});

const ValueArea = styled("path", {
  fill: theme.colors.backgroundSpacingTopBottom,
  variants: {
    side: {
      top: { cursor: "n-resize" },
      bottom: { cursor: "s-resize" },
      right: {
        cursor: "e-resize",
        fill: theme.colors.backgroundSpacingLeftRight,
      },
      left: {
        cursor: "w-resize",
        fill: theme.colors.backgroundSpacingLeftRight,
      },
    },
    isActive: {
      true: {
        fill: theme.colors.backgroundSpacingHover,
      },
    },
  },
});

const OuterRect = styled(
  (props: ComponentProps<"rect">) => (
    <rect
      rx="2.5"
      {...emulateInnerStroke({
        width: TOTAL_WIDTH,
        height: TOTAL_HEIGHT,
        x: 0,
        y: 0,
      })}
      {...props}
    />
  ),
  { stroke: theme.colors.borderMain }
);

const InnerOuterRect = styled(
  (props: ComponentProps<"rect">) => {
    const width = INNER_WIDTH + INNER_MARGIN * 2;
    const height = INNER_HEIGHT + INNER_MARGIN * 2;
    return (
      <rect
        rx="2.5"
        {...emulateInnerStroke({
          width,
          height,
          x: (TOTAL_WIDTH - width) / 2,
          y: (TOTAL_HEIGHT - height) / 2,
        })}
        {...props}
      />
    );
  },
  { stroke: theme.colors.borderMain, fill: theme.colors.backgroundControls }
);

const InnerRect = styled(
  (props: ComponentProps<"rect">) => (
    <rect
      rx=".5"
      {...emulateInnerStroke({
        width: INNER_WIDTH,
        height: INNER_HEIGHT,
        x: (TOTAL_WIDTH - INNER_WIDTH) / 2,
        y: (TOTAL_HEIGHT - INNER_HEIGHT) / 2,
      })}
      {...props}
    />
  ),
  { stroke: theme.colors.borderMain }
);

const MostInnerRect = styled(
  (props: ComponentProps<"rect">) => {
    return (
      <rect
        rx=".5"
        {...emulateInnerStroke({
          width: MOST_INNER_WIDTH,
          height: MOST_INNER_HEIGHT,
          x: (TOTAL_WIDTH - MOST_INNER_WIDTH) / 2,
          y: (TOTAL_HEIGHT - MOST_INNER_HEIGHT) / 2,
        })}
        {...props}
      />
    );
  },
  { stroke: theme.colors.borderMain, fill: theme.colors.backgroundControls }
);

const gap = `${INNER_MARGIN + BORDER}px`;
const Grid = styled("div", {
  position: "absolute",
  top: 1,
  left: 1,
  right: 1,
  bottom: 1,
  display: "grid",
  columnGap: gap,
  // minmax here is a hack: https://css-tricks.com/preventing-a-grid-blowout/
  gridTemplateColumns: `${VALUE_WIDTH}px ${VALUE_WIDTH}px minmax(0, 1fr) ${VALUE_WIDTH}px ${VALUE_WIDTH}px`,
  // gap is inserted manually because we don't want it around the "auto" row
  gridTemplateRows: `${VALUE_HEIGHT}px ${gap} ${VALUE_HEIGHT}px auto ${VALUE_HEIGHT}px ${gap} ${VALUE_HEIGHT}px`,
  pointerEvents: "none",
});

const Container = styled("div", {
  userSelect: "none",
  position: "relative",
  width: TOTAL_WIDTH,
  height: TOTAL_HEIGHT,
  "&:focus-visible": { outline: "none" },

  // Grid happens to be positioned perfectly for the focus outline
  // (both in z-order and in top/left)
  [`&:focus-visible > ${Grid}`]: {
    borderRadius: theme.borderRadius[3],
    outline: `1px solid ${theme.colors.borderFocus}`,
  },
});

const Cell = styled("div", {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "100%",
  padding: theme.spacing[2],
  variants: {
    property: {
      "margin-top": { gridColumn: "2 / 5", gridRow: "1" },
      "margin-right": { gridColumn: "5", gridRow: "1 / 8" },
      "margin-bottom": { gridColumn: "2 / 5", gridRow: "7" },
      "margin-left": { gridColumn: "1", gridRow: "1 / 8" },
      "padding-top": { gridColumn: "3 / 4", gridRow: "3" },
      "padding-right": { gridColumn: "4", gridRow: "3 / 6" },
      "padding-bottom": { gridColumn: "3 / 4", gridRow: "5" },
      "padding-left": { gridColumn: "2", gridRow: "3 / 6" },
    },
  },
});

const Label = styled("div", {
  color: theme.colors.foregroundTextSubtle,
  textTransform: "uppercase",
  fontSize: theme.deprecatedFontSize[1],
  lineHeight: 1,
  marginTop: 3,
  marginLeft: 4,
  gridColumn: "1 / 6",
  gridRow: "1",
  variants: {
    inner: { true: { gridColumn: "2 / 5", gridRow: "3" } },
  },
});

const getSide = (property: SpaceStyleProperty) => {
  switch (property) {
    case "margin-top":
    case "padding-top":
      return "top";
    case "margin-right":
    case "padding-right":
      return "right";
    case "margin-bottom":
    case "padding-bottom":
      return "bottom";
    case "margin-left":
    case "padding-left":
      return "left";
  }
};

const getPath = (property: SpaceStyleProperty) => {
  const width = TOTAL_WIDTH;
  const height = TOTAL_HEIGHT;
  // distance between LeftValueArea's and RightValueArea's tips in the middle
  const tips =
    MOST_INNER_WIDTH - MOST_INNER_HEIGHT * (VALUE_WIDTH / VALUE_HEIGHT);

  switch (getSide(property)) {
    case "top":
      return `M${width} 0H0L${(width - tips) / 2} ${height / 2}H${
        (width + tips) / 2
      }L${width} 0Z`;
    case "right":
      return `M${width} ${height}L${(width + tips) / 2} ${
        height / 2
      }L${width} 0V${height}Z`;
    case "bottom":
      return `M${width} ${height}H0L${(width - tips) / 2} ${height / 2}H${
        (width + tips) / 2
      }L${width} ${height}Z`;
    case "left":
      return `M0 0L${(width - tips) / 2} ${height / 2}L0 ${height}V0Z`;
  }
};

type LayoutProps = {
  onFocus?: ComponentProps<"div">["onFocus"];
  onBlur?: ComponentProps<"div">["onBlur"];
  onKeyDown?: ComponentProps<"div">["onKeyDown"];
  onClick?: ComponentProps<"div">["onClick"];
  onMouseLeave?: ComponentProps<"div">["onMouseLeave"];
  onMouseMove?: ComponentProps<"div">["onMouseMove"];
  onHover: (hoverTarget: HoverTarget | undefined) => void;
  activeProperties?: CssProperty[];
  renderCell: (args: { property: SpaceStyleProperty }) => React.ReactNode;
};

export const SpaceLayout = forwardRef(
  (
    {
      onFocus,
      onBlur,
      onKeyDown,
      onClick,
      onHover,
      onMouseLeave,
      onMouseMove,
      activeProperties,
      renderCell,
    }: LayoutProps,
    ref: Ref<HTMLDivElement>
  ) => {
    const outerClipId = useId();
    const innerClipId = useId();

    const renderValueArea = (property: SpaceStyleProperty) => (
      <ValueArea
        side={getSide(property)}
        d={getPath(property)}
        onMouseEnter={(event) =>
          onHover({ element: event.currentTarget, property })
        }
        onMouseLeave={() => onHover(undefined)}
        isActive={activeProperties?.includes(property)}
      />
    );

    return (
      <Container
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
        tabIndex={0}
        ref={ref}
      >
        <svg
          width={TOTAL_WIDTH}
          height={TOTAL_HEIGHT}
          viewBox={`0 0 ${TOTAL_WIDTH} ${TOTAL_HEIGHT}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath={`url(#${outerClipId})`}>
            {renderValueArea("margin-top")}
            {renderValueArea("margin-right")}
            {renderValueArea("margin-bottom")}
            {renderValueArea("margin-left")}
          </g>

          <OuterRect />
          <InnerOuterRect />

          <g clipPath={`url(#${innerClipId})`}>
            {renderValueArea("padding-top")}
            {renderValueArea("padding-right")}
            {renderValueArea("padding-bottom")}
            {renderValueArea("padding-left")}
          </g>

          <InnerRect />
          <MostInnerRect />

          <defs>
            <clipPath id={outerClipId}>
              <OuterRect />
            </clipPath>
            <clipPath id={innerClipId}>
              <InnerRect />
            </clipPath>
          </defs>
        </svg>
        <Grid>
          <Label>Margin</Label>
          <Label inner>Padding</Label>

          {spaceProperties.map((property) => (
            <Cell property={property} key={property}>
              {renderCell({ property })}
            </Cell>
          ))}
        </Grid>
      </Container>
    );
  }
);
SpaceLayout.displayName = "SpaceLayout";
