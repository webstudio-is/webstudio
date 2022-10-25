import { Box } from "../../box";
import { type Placement } from "./geometry-utils";

const placementStyle = {
  boxSizing: "content-box",
  position: "absolute",
  background: "$blue10",
  pointerEvents: "none",
};

const getStyle = (placement: Placement) => {
  if (placement.direction === "horizontal") {
    return {
      top: placement.y - 1,
      left: placement.x,
      width: placement.length,
      height: 2,
    };
  }
  return {
    top: placement.y,
    left: placement.x - 1,
    width: 2,
    height: placement.length,
  };
};

export const PlacementIndicator = ({ placement }: { placement: Placement }) => {
  return <Box style={getStyle(placement)} css={placementStyle} />;
};
