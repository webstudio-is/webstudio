import { useCallback, useEffect } from "react";
import {
  useSelectedBreakpoint,
  useCanvasWidth,
} from "~/designer/shared/nano-values";
import { minWidth } from "./width-setting";

export const useUpdateCanvasWidth = () => {
  const [selectedBreakpoint] = useSelectedBreakpoint();
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();

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
