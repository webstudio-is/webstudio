import { atom, computed } from "nanostores";
import { useEffect, useState } from "react";
import { monitorForExternal } from "@atlaskit/pragmatic-drag-and-drop/external/adapter";
import { preventUnhandled } from "@atlaskit/pragmatic-drag-and-drop/prevent-unhandled";
import { containsFiles } from "@atlaskit/pragmatic-drag-and-drop/external/file";
import type { ContainsSource } from "@atlaskit/pragmatic-drag-and-drop/dist/types/public-utils/external/native-types";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { canvasApi } from "~/shared/canvas-api";
import { useDebouncedCallback } from "use-debounce";

import { $canvasIframeState } from "~/shared/nano-states";
import invariant from "tiny-invariant";
import { getAllElementsBoundingBox } from "~/shared/dom-utils";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";

export const IDLE = 0;
export const POTENTIAL = 1;

export type ExternalMonitorDragState = typeof IDLE | typeof POTENTIAL;

const $monitorDragState = atom<ExternalMonitorDragState>(IDLE);
const $monitorCanvasDragState = atom<ExternalMonitorDragState>(IDLE);

const $externalDragState = computed(
  [$monitorDragState, $monitorCanvasDragState],
  (monitorDragState, monitorCanvasDragState) => {
    return Math.max(
      monitorDragState,
      monitorCanvasDragState
    ) as ExternalMonitorDragState;
  }
);

const containsFilesOrUri = (parameter: ContainsSource) => {
  return (
    containsFiles(parameter) || parameter.source.types.includes("text/uri-list")
  );
};

let usageCounter = 0;

export const ExternalDragDropMonitor = () => {
  const [refresh, setRefresh] = useState(0);

  const handleBuilderOnDrop = useDebouncedCallback(() => {
    $monitorDragState.set(IDLE);
  }, 300);

  const handleCanvasOnDrop = useDebouncedCallback(() => {
    $monitorCanvasDragState.set(IDLE);
  }, 300);

  const preventUnhandledStop = useDebouncedCallback(() => {
    preventUnhandled.stop();
    canvasApi.preventUnhandled.stop();
  }, 300);

  useEffect(() => {
    usageCounter += 1;

    invariant(usageCounter === 1, "Monitor can be used only once per app");

    return () => {
      usageCounter -= 1;
    };
  }, []);

  useEffect(() => {
    if (false === canvasApi.isInitialized()) {
      return $canvasIframeState.listen((state) => {
        if (state === "ready") {
          setRefresh((prev) => prev + 1);
        }
      });
    }

    const preventUnhandledStart = () => {
      preventUnhandled.start();
      canvasApi.preventUnhandled.start();
    };

    return combine(
      monitorForExternal({
        canMonitor: containsFilesOrUri,
        onDragStart: () => {
          preventUnhandledStart();
          $monitorDragState.set(POTENTIAL);
          handleBuilderOnDrop.cancel();
          preventUnhandledStop.cancel();
        },
        onDrop: () => {
          handleBuilderOnDrop();
          preventUnhandledStop();
        },
      }),
      canvasApi.monitorForExternal({
        canMonitor: containsFilesOrUri,
        onDragStart: () => {
          preventUnhandledStart();
          $monitorCanvasDragState.set(POTENTIAL);
          handleCanvasOnDrop.cancel();
          preventUnhandledStop.cancel();
        },
        onDrop: () => {
          handleCanvasOnDrop();
          preventUnhandledStop();
        },
      }),
      () => {
        return () => {
          handleBuilderOnDrop.cancel();
          preventUnhandledStop.cancel();

          preventUnhandled.stop();
          canvasApi.preventUnhandled.stop();
          $monitorDragState.set(IDLE);
          $monitorCanvasDragState.set(IDLE);
        };
      }
    );
  }, [handleBuilderOnDrop, handleCanvasOnDrop, preventUnhandledStop, refresh]);

  return null;
};

export const useExternalDragStateEffect = (
  callback: (state: ExternalMonitorDragState) => void
) => {
  const handleCallback = useEffectEvent(callback);

  useEffect(() => {
    return $externalDragState.subscribe(handleCallback);
  }, [handleCallback]);
};

const dropCount = atom(0);

export const registerDrop = () => {
  dropCount.set(dropCount.get() + 1);
};

export const useOnDropEffect = (callback: () => void) => {
  const handleCallback = useEffectEvent(callback);

  useEffect(() => {
    return dropCount.listen(handleCallback);
  }, [handleCallback]);
};

export const isBlockedByBackdrop = (element: Element) => {
  const elementRect = getAllElementsBoundingBox([element]);
  const centerX = elementRect.left + elementRect.width / 2;
  const centerY = elementRect.top + elementRect.height / 2;

  // Get the element directly under the center of the target element
  const topElement = document.elementFromPoint(centerX, centerY);
  const isNotBlocked = element.contains(topElement) || topElement === element;

  return false === isNotBlocked;
};
