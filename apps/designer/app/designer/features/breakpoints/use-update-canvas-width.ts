import { useSubscribe } from "@webstudio-is/react-sdk";
import { useCallback, useEffect } from "react";
import {
  useSelectedBreakpoint,
  useCanvasWidth,
} from "~/designer/shared/nano-states";
import { useIsPreviewMode } from "~/shared/nano-states";
import { minWidth } from "./width-setting";

export const useUpdateCanvasWidth = () => {
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();
  const [isPreviewMode] = useIsPreviewMode();

  // Ensure the size is within currently selected breakpoint when returning to design mode out of preview mode,
  // because preview mode enables resizing without constraining to the selected breakpoint.
  useEffect(() => {
    if (isPreviewMode === true || selectedBreakpoint === undefined) return;
    setCanvasWidth(Math.max(selectedBreakpoint.minWidth, minWidth));
  }, [isPreviewMode, selectedBreakpoint, setCanvasWidth]);

  useEffect(() => {
    if (selectedBreakpoint === undefined) {
      return;
    }

    if (selectedBreakpoint.minWidth === 0) {
      setCanvasWidth(minWidth);
      return;
    }

    setCanvasWidth(Math.max(selectedBreakpoint.minWidth, minWidth));
  }, [selectedBreakpoint, setCanvasWidth]);

  useSubscribe("canvasWidth", setCanvasWidth);

  // Set the initial canvas width based on the selected breakpoint upper bound, which starts where the next breakpoint begins.
  return useCallback(
    (iframe: HTMLIFrameElement | null) => {
      // Once canvasWidth is set, it means we have already set the initial width.
      if (
        iframe === null ||
        selectedBreakpoint === undefined ||
        canvasWidth !== 0
      ) {
        return;
      }

      setCanvasWidth(minWidth);
    },
    [canvasWidth, selectedBreakpoint, setCanvasWidth]
  );
};
