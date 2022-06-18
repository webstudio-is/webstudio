import { Box } from "~/shared/design-system";
import {
  useIsPreviewMode,
  useIsScrolling,
  useSubscribeScrollState,
} from "~/shared/nano-states";
import { HoveredInstanceOutline, SelectedInstanceOutline } from "./outline";
import { useSubscribeInstanceRect } from "./hooks/use-subscribe-instance-rect";

const toolsStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  pointerEvents: "none",
  overflow: "hidden",
};

export const CanvasTools = () => {
  useSubscribeInstanceRect();
  useSubscribeScrollState();
  const [isPreviewMode] = useIsPreviewMode();
  const [isScrolling] = useIsScrolling();
  if (isPreviewMode || isScrolling) return null;
  return (
    <Box css={toolsStyle}>
      <SelectedInstanceOutline />
      <HoveredInstanceOutline />
    </Box>
  );
};
