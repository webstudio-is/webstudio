import { Box, Placement, Rect, styled } from "@webstudio-is/design-system";

const CIRCLE_SIZE = 8;
const LINE_THICKNESS = 2;
const OUTLINE_WIDTH = 1;

// overlap the line with the circle by this much
// to make sure they are connected
const OVERLAP = 1;

const CircleOutline = styled(Box, {
  width: CIRCLE_SIZE + OUTLINE_WIDTH * 2,
  height: CIRCLE_SIZE + OUTLINE_WIDTH * 2,
  position: "absolute",
  borderRadius: "50%",
  pointerEvents: "none",
  bc: "$loContrast",
});

const Circle = styled(Box, {
  width: CIRCLE_SIZE,
  height: CIRCLE_SIZE,
  position: "absolute",
  border: "solid $dropPlacement",
  borderWidth: "$2",
  borderRadius: "50%",
  pointerEvents: "none",
});

const Line = styled(Box, {
  boxSizing: "content-box",
  position: "absolute",
  background: "$dropPlacement",
  pointerEvents: "none",
  outline: "solid $loContrast",
  outlineWidth: OUTLINE_WIDTH,
});

export const PlacementIndicatorLine = ({
  placement,
}: {
  placement: Placement;
}) => (
  <>
    <CircleOutline
      style={{
        top: placement.y - CIRCLE_SIZE / 2 - OUTLINE_WIDTH,
        left: placement.x - CIRCLE_SIZE / 2 - OUTLINE_WIDTH,
      }}
    />
    <Line
      style={{
        top: placement.y - LINE_THICKNESS / 2,
        left: placement.x + (CIRCLE_SIZE / 2 - OVERLAP),
        width: placement.length - (CIRCLE_SIZE / 2 - OVERLAP),
        height: LINE_THICKNESS,
      }}
    />
    <Circle
      style={{
        top: placement.y - CIRCLE_SIZE / 2,
        left: placement.x - CIRCLE_SIZE / 2,
      }}
    />
  </>
);

const Outline = styled(Box, {
  position: "absolute",
  pointerEvents: "none",
  boxSizing: "border-box",
  border: "solid $dropPlacement",
  borderWidth: "$2",
  borderRadius: "$2",
});

export const PlacementIndicatorOutline = ({ rect }: { rect: Rect }) => (
  <Outline
    style={{
      top: rect.top,
      left: rect.left + 2,
      width: rect.width - 4,
      height: rect.height,
    }}
  />
);
