import { Box, Placement, Rect, styled } from "@webstudio-is/design-system";

const CIRCLE_SIZE = 8;
const LINE_THICKNESS = 2;

// overlap the line with the circle by this much
// to make sure they are connected
const OVERLAP = 1;

const Circle = styled(Box, {
  width: CIRCLE_SIZE,
  height: CIRCLE_SIZE,
  top: (LINE_THICKNESS - CIRCLE_SIZE) / 2,
  left: OVERLAP - CIRCLE_SIZE,
  position: "absolute",
  border: "solid $dropPlacement",
  borderWidth: "$2",
  borderRadius: "50%",
});

const Line = styled(Box, {
  boxSizing: "content-box",
  position: "absolute",
  background: "$dropPlacement",
  pointerEvents: "none",
});

export const PlacementIndicatorLine = ({
  placement,
}: {
  placement: Placement;
}) => (
  <Line
    style={{
      top: placement.y - LINE_THICKNESS / 2,
      left: placement.x + (CIRCLE_SIZE / 2 - OVERLAP),
      width: placement.length - (CIRCLE_SIZE / 2 - OVERLAP),
      height: LINE_THICKNESS,
    }}
  >
    <Circle />
  </Line>
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
