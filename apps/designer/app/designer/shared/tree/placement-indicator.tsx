import { Box, Placement, Rect, styled } from "@webstudio-is/design-system";
import { Instance } from "@webstudio-is/react-sdk";
import { useMemo } from "react";
import { type ShiftedDropTarget } from "./tree";

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

const PlacementIndicatorLine = ({ placement }: { placement: Placement }) => (
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

const PlacementIndicatorOutline = ({ rect }: { rect: Rect }) => (
  <Outline
    style={{
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    }}
  />
);

export const PlacementIndicator = ({
  dropTarget,
  getDropTargetElement,
}: {
  dropTarget: ShiftedDropTarget;
  getDropTargetElement: (id: Instance["id"]) => HTMLElement | null | undefined;
}) => {
  const rect = useMemo(
    // @todo: update rect on scroll
    // @todo: don't render outline out of bounds
    // @todo: don't use [data-item-button-id]
    // @todo: probably should move this rect retriving logic into a hook
    () =>
      (
        (
          getDropTargetElement(dropTarget.instance.id) || undefined
        )?.querySelector("[data-item-button-id]") || undefined
      )?.getBoundingClientRect(),
    [dropTarget.instance.id, getDropTargetElement]
  );

  return (
    <>
      {rect && <PlacementIndicatorOutline rect={rect} />}
      {dropTarget.placement && (
        <PlacementIndicatorLine placement={dropTarget.placement} />
      )}
    </>
  );
};
