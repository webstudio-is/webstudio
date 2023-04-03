import { useStore } from "@nanostores/react";
import type { Publish } from "~/shared/pubsub";
import { Box } from "@webstudio-is/design-system";
import { PlacementIndicator } from "@webstudio-is/design-system";
import {
  useIsPreviewMode,
  useDragAndDropState,
  useSubscribeDragAndDropState,
  instancesStore,
} from "~/shared/nano-states";
import { HoveredInstanceOutline, SelectedInstanceOutline } from "./outline";
import { TextToolbar } from "./text-toolbar";
import { useSubscribeSwitchPage } from "~/shared/pages";
import { Label } from "./outline/label";
import { Outline } from "./outline/outline";

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
  // @todo try to setup cross-frame atoms to vaoid this
  useSubscribeDragAndDropState();
  useSubscribeSwitchPage();

  const [isPreviewMode] = useIsPreviewMode();
  const [dragAndDropState] = useDragAndDropState();
  const instances = useStore(instancesStore);

  if (
    dragAndDropState.isDragging &&
    dragAndDropState.dropTarget !== undefined &&
    dragAndDropState.placementIndicator !== undefined
  ) {
    const { dropTarget, placementIndicator } = dragAndDropState;
    const dropTargetInstance = instances.get(dropTarget.itemSelector[0]);
    return dropTargetInstance ? (
      <Box css={toolsStyle}>
        <Outline rect={placementIndicator.parentRect}>
          <Label
            instance={dropTargetInstance}
            instanceRect={placementIndicator.parentRect}
          />
        </Outline>
        {placementIndicator !== undefined && (
          <PlacementIndicator placement={placementIndicator} />
        )}
      </Box>
    ) : null;
  }

  if (isPreviewMode) {
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
