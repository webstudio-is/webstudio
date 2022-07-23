import { type Publish } from "@webstudio-is/react-sdk";
import { Box } from "~/shared/design-system";
import { PlacementIndicator } from "~/shared/design-system/components/primitives/dnd";
import {
  useIsPreviewMode,
  useIsScrolling,
  useSubscribeScrollState,
  useDragAndDropState,
  useSubscribeDragAndDropState,
} from "~/shared/nano-states";
import {
  HoveredInstanceOutline,
  SelectedInstanceOutline,
  DropTargetOutline,
} from "./outline";
import { TextToolbar } from "./text-toolbar";
import { useSubscribeInstanceRect } from "./hooks/use-subscribe-instance-rect";
import { useSubscribeSelectionRect } from "./hooks/use-subscribe-selection-rect";
import { useSubscribeTextEditingInstanceId } from "./hooks/use-subscribe-editing-instance-id";

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
  useSubscribeScrollState();
  useSubscribeDragAndDropState();
  useSubscribeTextEditingInstanceId();

  const [isPreviewMode] = useIsPreviewMode();
  const [isScrolling] = useIsScrolling();
  const [dragAndDropState] = useDragAndDropState();

  if (
    dragAndDropState.isDragging &&
    dragAndDropState.dropTarget !== undefined
  ) {
    return (
      <Box css={toolsStyle}>
        <DropTargetOutline dropTarget={dragAndDropState.dropTarget} />
        <PlacementIndicator rect={dragAndDropState.dropTarget.placementRect} />
      </Box>
    );
  }

  if (isPreviewMode || isScrolling) {
    return null;
  }
  return (
    <Box css={toolsStyle}>
      <SelectedInstanceOutline />
      <HoveredInstanceOutline />
      <TextToolbar publish={publish} />
    </Box>
  );
};
