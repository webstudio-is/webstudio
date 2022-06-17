import { type Publish } from "@webstudio-is/sdk";
import { Box } from "~/shared/design-system";
import { useIsPreviewMode } from "~/shared/nano-states";
import { HoveredInstanceOutline, SelectedInstanceOutline } from "./outline";
import { TextToolbar } from "./text-toolbar";
import { useSubscribeInstanceRect } from "./hooks/use-subscribe-instance-rect";
import { useSubscribeSelectionRect } from "./hooks/use-subscribe-selection-rect";

const toolsStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  pointerEvents: "none",
  overflow: "hidden",
};

type CanvasToolsProps = {
  publish: Publish;
};

export const CanvasTools = ({ publish }: CanvasToolsProps) => {
  useSubscribeInstanceRect();
  useSubscribeSelectionRect();
  const [isPreviewMode] = useIsPreviewMode();
  if (isPreviewMode) return null;
  return (
    <Box css={toolsStyle}>
      <SelectedInstanceOutline />
      <HoveredInstanceOutline />
      <TextToolbar publish={publish} />
    </Box>
  );
};
