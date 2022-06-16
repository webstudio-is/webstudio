import { Box } from "~/shared/design-system";
import { useIsPreviewMode } from "~/shared/nano-states";
import { HoveredInstanceOutline, SelectedInstanceOutline } from "./outline";
import { useSubscribeInstanceRect } from "./use-subscribe-instance-rect";

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
  const [isPreviewMode] = useIsPreviewMode();
  if (isPreviewMode) return null;
  return (
    <Box css={toolsStyle}>
      <SelectedInstanceOutline />
      <HoveredInstanceOutline />
    </Box>
  );
};
