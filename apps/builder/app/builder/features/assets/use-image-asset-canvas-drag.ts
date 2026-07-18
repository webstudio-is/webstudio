import { useCallback, useEffect, useRef } from "react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useDisableCanvasPointerEvents } from "@webstudio-is/design-system";
import { getAssetManagerDragItems } from "~/builder/shared/asset-manager/asset-manager-drag";
import { toCanvasCoordinates } from "~/builder/shared/canvas-drag";
import { $canvasRect, $scale } from "~/builder/shared/nano-states";
import { type Publish, useSubscribe } from "~/shared/pubsub";
import { $assets } from "~/shared/sync/data-stores";

const getDraggedImageAssetId = (data: Record<string, unknown>) => {
  const items = getAssetManagerDragItems(data);
  if (items.length !== 1 || items[0]?.type !== "asset") {
    return;
  }
  const asset = $assets.get().get(items[0].id);
  if (asset?.type === "image") {
    return asset.id;
  }
};

export const useImageAssetCanvasDrag = (publish: Publish) => {
  const isActiveRef = useRef(false);
  const { disableCanvasPointerEvents, enableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  const finish = useCallback(
    (isCanceled: boolean) => {
      if (isActiveRef.current === false) {
        return;
      }
      isActiveRef.current = false;
      enableCanvasPointerEvents();
      publish({ type: "dragEnd", payload: { isCanceled } });
    },
    [enableCanvasPointerEvents, publish]
  );

  useSubscribe("cancelCurrentDrag", () => finish(true));

  useEffect(() => {
    const cleanupMonitor = monitorForElements({
      canMonitor: ({ source }) =>
        getDraggedImageAssetId(source.data) !== undefined,
      onDragStart: ({ source }) => {
        const assetId = getDraggedImageAssetId(source.data);
        if (assetId === undefined) {
          return;
        }
        isActiveRef.current = true;
        disableCanvasPointerEvents();
        publish({
          type: "dragStart",
          payload: { origin: "panel", type: "insertImageAsset", assetId },
        });
      },
      onDrag: ({ location }) => {
        if (isActiveRef.current === false) {
          return;
        }
        const { clientX: x, clientY: y } = location.current.input;
        publish({
          type: "dragMove",
          payload: {
            canvasCoordinates: toCanvasCoordinates(
              { x, y },
              $scale.get(),
              $canvasRect.get()
            ),
          },
        });
      },
      onDrop: ({ location }) => {
        const rect = $canvasRect.get();
        const { clientX, clientY } = location.current.input;
        const droppedOnCanvas =
          rect !== undefined &&
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom;
        finish(droppedOnCanvas === false);
      },
    });

    return () => {
      cleanupMonitor();
      finish(true);
    };
  }, [disableCanvasPointerEvents, finish, publish]);
};
