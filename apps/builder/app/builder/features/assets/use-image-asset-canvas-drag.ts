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
  const isDraggingRef = useRef(false);
  const isCanvasDragRef = useRef(false);
  const { disableCanvasPointerEvents, enableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  const finish = useCallback(
    (isCanceled: boolean) => {
      if (isCanvasDragRef.current) {
        isCanvasDragRef.current = false;
        publish({ type: "dragEnd", payload: { isCanceled } });
      }
      isDraggingRef.current = false;
      enableCanvasPointerEvents();
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
        isDraggingRef.current = true;
        disableCanvasPointerEvents();
      },
      onDrag: ({ source, location }) => {
        if (isDraggingRef.current === false) {
          return;
        }
        const { clientX: x, clientY: y } = location.current.input;
        const rect = $canvasRect.get();
        const isOverCanvas =
          rect !== undefined &&
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom;
        if (isOverCanvas === false) {
          if (isCanvasDragRef.current) {
            isCanvasDragRef.current = false;
            publish({ type: "dragEnd", payload: { isCanceled: true } });
          }
          return;
        }
        if (isCanvasDragRef.current === false) {
          const assetId = getDraggedImageAssetId(source.data);
          if (assetId === undefined) {
            return;
          }
          isCanvasDragRef.current = true;
          publish({
            type: "dragStart",
            payload: { origin: "panel", type: "insertImageAsset", assetId },
          });
        }
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
      onDrop: () => finish(false),
    });

    return () => {
      cleanupMonitor();
      finish(true);
    };
  }, [disableCanvasPointerEvents, finish, publish]);
};
