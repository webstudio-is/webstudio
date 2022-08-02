import { Box } from "../../box";
import { type Placement } from "./geometry-utils";

const placementStyle = {
  boxSizing: "content-box",
  position: "absolute",
  background: "$blue9",
  pointerEvents: "none",
};

export const PlacementIndicator = ({ placement }: { placement: Placement }) => {
  const style = {
    top: placement.y - (placement.direction === "horizontal" ? 1 : 0),
    left: placement.x - (placement.direction === "vertical" ? 1 : 0),
    width: placement.direction === "horizontal" ? placement.length : 2,
    height: placement.direction === "vertical" ? placement.length : 2,
  };

  return <Box style={style} css={placementStyle} />;
};
