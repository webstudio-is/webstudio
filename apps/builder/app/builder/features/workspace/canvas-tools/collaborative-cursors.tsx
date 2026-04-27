import { useStore } from "@nanostores/react";
import { useEffect, useMemo, useState } from "react";
import { css, type Rect } from "@webstudio-is/design-system";
import {
  $collaborators,
  assignCollaboratorColors,
  type CollaboratorInfo,
} from "@webstudio-is/sync-client";
import {
  $collaborativeInstanceSelector,
  $selectedPageId,
} from "~/shared/nano-states";
import { $canvasRect } from "~/builder/shared/nano-states";

const layerStyle = css({
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
});

const cursorStyle = css({
  position: "absolute",
  top: 0,
  left: 0,
  transformOrigin: "top left",
  transition: "transform 300ms ease-out",
  willChange: "transform",
});

const shouldSkipCollaborator = ({
  currentPageId,
  collaboratorPageId,
}: {
  currentPageId: string | undefined;
  collaboratorPageId: string | undefined;
}) => {
  return (
    currentPageId !== undefined &&
    collaboratorPageId !== undefined &&
    collaboratorPageId !== currentPageId
  );
};

const hasCursorPosition = (
  pointerPosition: CollaboratorInfo["pointerPosition"]
) => {
  return pointerPosition !== undefined;
};

const computeCursorCoordinates = ({
  pointerPosition,
  layerRect,
  canvasRect,
}: {
  pointerPosition: CollaboratorInfo["pointerPosition"];
  layerRect: Rect | undefined;
  canvasRect: Rect | undefined;
}) => {
  if (pointerPosition === undefined || layerRect === undefined) {
    return { x: 0, y: 0 };
  }
  if (canvasRect !== undefined) {
    return {
      x:
        canvasRect.left -
        layerRect.left +
        pointerPosition.xRatio * canvasRect.width,
      y:
        canvasRect.top -
        layerRect.top +
        pointerPosition.yRatio * canvasRect.height,
    };
  }
  return {
    x: pointerPosition.xRatio * layerRect.width,
    y: pointerPosition.yRatio * layerRect.height,
  };
};

const isWithinLayer = ({
  x,
  y,
  layerRect,
}: {
  x: number;
  y: number;
  layerRect: Rect | undefined;
}) => {
  if (layerRect === undefined) {
    return true;
  }
  return x >= 0 && x < layerRect.width && y >= 0 && y < layerRect.height;
};

const toRenderableCollaboratorCursor = ({
  currentPageId,
  collaboratorPageId,
  pointerPosition,
  layerRect,
  canvasRect,
}: {
  currentPageId: string | undefined;
  collaboratorPageId: string | undefined;
  pointerPosition: CollaboratorInfo["pointerPosition"];
  layerRect: Rect | undefined;
  canvasRect: Rect | undefined;
}) => {
  if (shouldSkipCollaborator({ currentPageId, collaboratorPageId })) {
    return;
  }

  if (!hasCursorPosition(pointerPosition)) {
    return;
  }

  const coordinates = computeCursorCoordinates({
    pointerPosition,
    layerRect,
    canvasRect,
  });

  if (!isWithinLayer({ ...coordinates, layerRect })) {
    return;
  }

  return coordinates;
};

const areInstanceSelectorsEqual = (
  left: readonly string[] | undefined,
  right: readonly string[] | undefined
) => {
  if (left === right) {
    return true;
  }
  if (
    left === undefined ||
    right === undefined ||
    left.length !== right.length
  ) {
    return false;
  }
  return left.every((id, index) => id === right[index]);
};

export const CollaborativeCursors = () => {
  const collaborators = useStore($collaborators);
  const canvasRect = useStore($canvasRect);
  const currentPageId = useStore($selectedPageId);
  const [layerElement, setLayerElement] = useState<
    HTMLDivElement | null | undefined
  >(undefined);
  const layerRect = layerElement?.getBoundingClientRect();
  const collaboratorColors = useMemo(
    () => assignCollaboratorColors(collaborators.keys()),
    [collaborators]
  );

  useEffect(() => {
    const collaborativeSelection = [...collaborators.values()].find(
      (collaborator) => {
        if (
          shouldSkipCollaborator({
            currentPageId,
            collaboratorPageId: collaborator.pageId,
          })
        ) {
          return false;
        }
        return (
          collaborator.selectedInstanceIds !== undefined &&
          collaborator.selectedInstanceIds.length > 0
        );
      }
    )?.selectedInstanceIds;

    const currentCollaborativeSelection = $collaborativeInstanceSelector.get();
    if (
      areInstanceSelectorsEqual(
        currentCollaborativeSelection,
        collaborativeSelection
      )
    ) {
      return;
    }

    $collaborativeInstanceSelector.set(collaborativeSelection);
  }, [collaborators, currentPageId]);

  return (
    <div className={layerStyle()} ref={setLayerElement}>
      {[...collaborators.entries()].map(([clientId, collaborator]) => {
        const coordinates = toRenderableCollaboratorCursor({
          currentPageId,
          collaboratorPageId: collaborator.pageId,
          pointerPosition: collaborator.pointerPosition,
          layerRect,
          canvasRect,
        });

        if (coordinates === undefined) {
          return;
        }

        const { x, y } = coordinates;

        const color = collaboratorColors.get(clientId);

        return (
          <div
            key={clientId}
            className={cursorStyle()}
            style={{
              color,
              transform: `translate3d(${x}px, ${y}px, 0)`,
            }}
          >
            <svg
              width="14"
              height="20"
              viewBox="0 0 14 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1.5L1 17.7L4.8 13.4L8 19L11 17.4L7.8 11.8L13 11.8L1 1.5Z"
                fill="currentColor"
                stroke="white"
                strokeWidth="1"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
};

export const __testing__ = {
  shouldSkipCollaborator,
  hasCursorPosition,
  computeCursorCoordinates,
  isWithinLayer,
  toRenderableCollaboratorCursor,
};
