import { useStore } from "@nanostores/react";
import { useCallback, useEffect } from "react";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import { useIsPreviewMode } from "~/shared/nano-states";
import { selectedBreakpointStore } from "~/shared/nano-states/breakpoints";
import { minWidth } from "./width-setting";

export const useUpdateCanvasWidth = () => {
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();
  const [isPreviewMode] = useIsPreviewMode();

  // Ensure the size is within currently selected breakpoint when returning to design mode out of preview mode,
  // because preview mode enables resizing without constraining to the selected breakpoint.
  useEffect(() => {
    if (isPreviewMode || selectedBreakpoint === undefined) {
      return;
    }
    setCanvasWidth(Math.max(selectedBreakpoint.minWidth, minWidth));
  }, [isPreviewMode, selectedBreakpoint, setCanvasWidth]);

  // This fallback is needed for cases when something unexpected loads in the iframe.
  // In that case the width remains 0, and user is unable to see what has loaded,
  // in particular any error messages.
  // The delay is used to make sure we don't set the fallback width too early,
  // because when canvas loads normally this will cause a jump in the width.
  useEffect(() => {
    if (canvasWidth !== 0) {
      return;
    }
    const timeoutId = setTimeout(() => {
      setCanvasWidth(600);
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [canvasWidth, setCanvasWidth]);

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
