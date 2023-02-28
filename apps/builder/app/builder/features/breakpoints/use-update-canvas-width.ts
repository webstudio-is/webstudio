import { useStore } from "@nanostores/react";
import { useCallback, useEffect, useRef } from "react";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import { useIsPreviewMode } from "~/shared/nano-states";
import {
  selectedBreakpointStore,
  workspaceRectStore,
} from "~/shared/nano-states/breakpoints";
import { useNextBreakpoint } from "./use-next-breakpoint";
import { minWidth } from "./width-setting";

export const useUpdateCanvasWidth = () => {
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();
  const [isPreviewMode] = useIsPreviewMode();
  const nextBreakpoint = useNextBreakpoint();
  const workspaceRect = useStore(workspaceRectStore);

  // We don't won't workspace rect resize observer to trigger canvas width update.
  // We only need the initial workspace width here.
  const initialWorkspaceRect = useRef(workspaceRect);
  initialWorkspaceRect.current = workspaceRect;

  // Ensure the size is within currently selected breakpoint when returning to design mode out of preview mode,
  // because preview mode enables resizing without constraining to the selected breakpoint.
  useEffect(() => {
    if (isPreviewMode || selectedBreakpoint === undefined) {
      return;
    }
    const maxWidthBelowNextBreakpoint = (nextBreakpoint?.minWidth ?? 0) - 1;
    const initialMaxAvailableWidth = initialWorkspaceRect.current
      ? Math.min(
          maxWidthBelowNextBreakpoint,
          initialWorkspaceRect.current.width
        )
      : maxWidthBelowNextBreakpoint;

    const width = Math.max(
      selectedBreakpoint.minWidth,
      initialMaxAvailableWidth,
      minWidth
    );
    setCanvasWidth(width);
  }, [
    isPreviewMode,
    selectedBreakpoint,
    nextBreakpoint,
    setCanvasWidth,
    initialWorkspaceRect,
  ]);

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
