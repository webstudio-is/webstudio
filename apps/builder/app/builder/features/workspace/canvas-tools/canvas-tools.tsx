import { useStore } from "@nanostores/react";
import { css } from "@webstudio-is/design-system";
import { PlacementIndicator } from "@webstudio-is/design-system";
import {
  $instances,
  $isPreviewMode,
  $dragAndDropState,
  $canvasToolsVisible,
} from "~/shared/nano-states";
import {
  CollaborativeInstanceOutline,
  HoveredInstanceOutline,
  SelectedInstanceOutline,
} from "./outline";

import { Label } from "./outline/label";
import { Outline } from "./outline/outline";
import { useSubscribeDragAndDropState } from "./use-subscribe-drag-drop-state";
import { applyScale } from "./outline";
import { $scale } from "~/builder/shared/nano-states";
import { BlockChildHoveredInstanceOutline } from "./outline/block-instance-outline";

const containerStyle = css({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  variants: {
    overflow: {
      hidden: {
        overflow: "hidden",
      },
    },
  },
});

export const CanvasTools = () => {
  // @todo try to setup cross-frame atoms to avoid this
  useSubscribeDragAndDropState();
  const canvasToolsVisible = useStore($canvasToolsVisible);
  const isPreviewMode = useStore($isPreviewMode);
  const dragAndDropState = useStore($dragAndDropState);
  const instances = useStore($instances);
  const scale = useStore($scale);

  if (!canvasToolsVisible) {
    return;
  }

  if (dragAndDropState.isDragging) {
    if (dragAndDropState.placementIndicator === undefined) {
      return;
    }
    const { dropTarget, placementIndicator } = dragAndDropState;
    const dropTargetInstance =
      dropTarget === undefined
        ? undefined
        : instances.get(dropTarget.itemSelector[0]);
    const rect = applyScale(placementIndicator.parentRect, scale);

    return dropTargetInstance ? (
      <div className={containerStyle({ overflow: "hidden" })}>
        <Outline rect={rect}>
          <Label instance={dropTargetInstance} instanceRect={rect} />
        </Outline>
        {placementIndicator !== undefined && (
          <PlacementIndicator placement={placementIndicator} scale={scale} />
        )}
      </div>
    ) : null;
  }

  return (
    <>
      {isPreviewMode === false && (
        <>
          <SelectedInstanceOutline />
          <HoveredInstanceOutline />
          <CollaborativeInstanceOutline />
          <BlockChildHoveredInstanceOutline />
        </>
      )}
    </>
  );
};
